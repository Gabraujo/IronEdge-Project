package com.ironedge.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ironedge.dto.AuthRequest;
import com.ironedge.model.User;
import com.ironedge.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    private boolean isBcryptHash(String value) {
        return value != null && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));
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

    User user = new User();
    user.setEmail(email);
    user.setPassword(passwordEncoder.encode(password));

    userRepository.save(user);

    return ResponseEntity.ok(Map.of(
        "message", "Usuário registrado com sucesso"
    ));
}

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody AuthRequest request) {
        if (request == null || request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e nova senha são obrigatórios"));
        }

        String email = request.getEmail().trim().toLowerCase();
        String newPassword = request.getPassword().trim();

        if (email.isBlank() || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e nova senha são obrigatórios"));
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
            "id", user.getId()
    ));
}

    @PostMapping("/logout")
    public void logout(HttpSession session) {
        session.invalidate();
    }
}
