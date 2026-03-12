package com.ironedge.controller;

import java.time.LocalDateTime;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Random;

import javax.naming.NamingException;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ironedge.dto.AuthRequest;
import com.ironedge.dto.PasswordResetConfirmRequest;
import com.ironedge.dto.PasswordResetRequest;
import com.ironedge.dto.PasswordResetVerifyRequest;
import com.ironedge.model.PasswordResetToken;
import com.ironedge.model.User;
import com.ironedge.repository.PasswordResetTokenRepository;
import com.ironedge.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private static final int RESET_CODE_LENGTH = 6;
    private static final int RESET_CODE_MINUTES = 15;
    private static final int RESET_MAX_ATTEMPTS = 5;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BCryptPasswordEncoder passwordEncoder;
    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@ironedge.local}")
    private String mailFrom;
    @Value("${app.mail.expose-code-when-smtp-missing:false}")
    private boolean exposeCodeWhenSmtpMissing;

    private boolean isBcryptHash(String value) {
        return value != null && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));
    }

    private boolean emailDomainHasMx(String email) {
        int at = email.lastIndexOf('@');
        if (at < 0 || at == email.length() - 1) {
            return false;
        }
        String domain = email.substring(at + 1);
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            DirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes(domain, new String[] { "MX" });
            boolean hasMx = attrs.get("MX") != null && attrs.get("MX").size() > 0;
            if (!hasMx) {
                // fallback: accept domains with A record even without MX
                attrs = ctx.getAttributes(domain, new String[] { "A" });
                hasMx = attrs.get("A") != null && attrs.get("A").size() > 0;
            }
            return hasMx;
        } catch (NamingException e) {
            logger.warn("Falha ao verificar MX para {}: {}", email, e.getMessage());
            return false;
        }
    }

    private boolean mailIsConfigured() {
        if (mailSender instanceof JavaMailSenderImpl impl) {
            return impl.getHost() != null && !impl.getHost().isBlank();
        }
        return mailSender != null;
    }

    private String generateNumericCode(int length) {
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    private boolean sendResetEmail(String to, String code) {
        if (!mailIsConfigured()) {
            logger.warn("SMTP não configurado. Código de reset para {}: {}", to, code);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(to);
            message.setSubject("Código para redefinir sua senha");
            message.setText("Use este código para concluir a redefinição da sua senha: " + code
                    + "\nEste código expira em " + RESET_CODE_MINUTES + " minutos.");
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            logger.error("Falha ao enviar email de redefinição para {}: {}", to, ex.getMessage());
            return false;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {

        if (request == null || request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e senha são obrigatórios"));
        }

        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword().trim();

        if (email.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e senha são obrigatórios"));
        }

        if (!userRepository.findAllByEmailIgnoreCaseOrderByIdDesc(email).isEmpty()) {
            return ResponseEntity.status(409).body(Map.of("message", "Este email já está cadastrado"));
        }

        if (!emailDomainHasMx(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email inexistente"));
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Usuário registrado com sucesso"));
    }

        @PostMapping("/forgot-password/request")
    public ResponseEntity<?> requestPasswordReset(@RequestBody PasswordResetRequest request) {
        if (request == null || request.getEmail() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email é obrigatório"));
        }

        String email = request.getEmail().trim().toLowerCase();
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email é obrigatório"));
        }

        List<User> users = userRepository.findAllByEmailIgnoreCaseOrderByIdDesc(email);
        if (users.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Usuário não encontrado"));
        }

        if (!mailIsConfigured()) {
            return ResponseEntity.status(500).body(Map.of("message", "Servidor de email não configurado"));
        }

        String code = generateNumericCode(RESET_CODE_LENGTH);
        PasswordResetToken token = new PasswordResetToken();
        token.setEmail(email);
        token.setCodeHash(passwordEncoder.encode(code));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(RESET_CODE_MINUTES));
        passwordResetTokenRepository.save(token);

        boolean mailSent = sendResetEmail(email, code);

        if (!mailSent && exposeCodeWhenSmtpMissing) {
            return ResponseEntity.ok(Map.of(
                    "message", "Código de verificação gerado (SMTP não configurado)",
                    "debugCode", code));
        }

        if (!mailSent) {
            return ResponseEntity.status(500).body(Map.of("message", "Falha ao enviar código. Verifique SMTP."));
        }

        return ResponseEntity.ok(Map.of("message", "Código de verificação enviado"));
    }

    @PostMapping("/forgot-password/verify")
    public ResponseEntity<?> verifyPasswordReset(@RequestBody PasswordResetVerifyRequest request) {
        if (request == null || request.getEmail() == null || request.getCode() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e código são obrigatórios"));
        }

        String email = request.getEmail().trim().toLowerCase();
        String code = request.getCode().trim();

        if (email.isBlank() || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e código são obrigatórios"));
        }

        PasswordResetToken token = passwordResetTokenRepository
                .findTopByEmailIgnoreCaseAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(email, LocalDateTime.now())
                .orElse(null);

        if (token == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Código inválido ou expirado"));
        }

        if (token.getAttempts() >= RESET_MAX_ATTEMPTS) {
            token.setUsed(true);
            passwordResetTokenRepository.save(token);
            return ResponseEntity.badRequest().body(Map.of("message", "Número máximo de tentativas excedido"));
        }

        boolean codeMatches;
        try {
            codeMatches = passwordEncoder.matches(code, token.getCodeHash());
        } catch (IllegalArgumentException ex) {
            codeMatches = false;
        }

        if (!codeMatches) {
            token.setAttempts(token.getAttempts() + 1);
            passwordResetTokenRepository.save(token);
            return ResponseEntity.badRequest().body(Map.of("message", "Código inválido ou expirado"));
        }

        return ResponseEntity.ok(Map.of("message", "Código verificado"));
    }

    @PostMapping("/forgot-password/confirm")
    public ResponseEntity<?> confirmPasswordReset(@RequestBody PasswordResetConfirmRequest request) {
        if (request == null || request.getEmail() == null || request.getCode() == null || request.getNewPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email, código e nova senha são obrigatórios"));
        }

        String email = request.getEmail().trim().toLowerCase();
        String code = request.getCode().trim();
        String newPassword = request.getNewPassword().trim();

        if (email.isBlank() || code.isBlank() || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email, código e nova senha são obrigatórios"));
        }

        PasswordResetToken token = passwordResetTokenRepository
                .findTopByEmailIgnoreCaseAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(email, LocalDateTime.now())
                .orElse(null);

        if (token == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Código inválido ou expirado"));
        }

        if (token.getAttempts() >= RESET_MAX_ATTEMPTS) {
            token.setUsed(true);
            passwordResetTokenRepository.save(token);
            return ResponseEntity.badRequest().body(Map.of("message", "Número máximo de tentativas excedido"));
        }

        boolean codeMatches;
        try {
            codeMatches = passwordEncoder.matches(code, token.getCodeHash());
        } catch (IllegalArgumentException ex) {
            codeMatches = false;
        }

        if (!codeMatches) {
            token.setAttempts(token.getAttempts() + 1);
            passwordResetTokenRepository.save(token);
            return ResponseEntity.badRequest().body(Map.of("message", "Código inválido ou expirado"));
        }

        List<User> users = userRepository.findAllByEmailIgnoreCaseOrderByIdDesc(email);
        if (users.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Usuário não encontrado"));
        }

        String encoded = passwordEncoder.encode(newPassword);
        for (User user : users) {
            user.setPassword(encoded);
        }
        userRepository.saveAll(users);

        token.setUsed(true);
        passwordResetTokenRepository.save(token);

        return ResponseEntity.ok(Map.of("message", "Senha atualizada com sucesso"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request, HttpSession session) {
        try {

            if (request == null || request.getEmail() == null || request.getPassword() == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Email ou senha inválidos"));
            }

            String email = request.getEmail().trim().toLowerCase();
            String password = request.getPassword().trim();

            List<User> users = userRepository.findAllByEmailIgnoreCaseOrderByIdDesc(email);
            if (users.isEmpty()) {
                return ResponseEntity.status(401).body(Map.of("message", "Email ou senha inválidos"));
            }

            User matchedUser = null;
            for (User candidate : users) {
                String storedPassword = candidate.getPassword();
                if (storedPassword == null || storedPassword.isBlank()) {
                    continue;
                }

                boolean passwordMatches = false;
                if (isBcryptHash(storedPassword)) {
                    try {
                        passwordMatches = passwordEncoder.matches(password, storedPassword);
                    } catch (IllegalArgumentException ex) {
                        passwordMatches = false;
                    }
                } else {
                    // Backward compatibility: if old accounts were stored as plain text,
                    // allow one-time login and migrate immediately to BCrypt.
                    if (password.equals(storedPassword)) {
                        candidate.setPassword(passwordEncoder.encode(password));
                        userRepository.save(candidate);
                        passwordMatches = true;
                    }
                }

                if (passwordMatches) {
                    matchedUser = candidate;
                    break;
                }
            }

            if (matchedUser == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Email ou senha inválidos"));
            }

            session.setAttribute("user", matchedUser);

            return ResponseEntity.ok().build();
        } catch (Exception ex) {
            return ResponseEntity.status(401).body(Map.of("message", "Email ou senha inválidos"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(Map.of(
                "email", user.getEmail(),
                "id", user.getId()));
    }

    @PostMapping("/logout")
    public void logout(HttpSession session) {
        session.invalidate();
    }
}

