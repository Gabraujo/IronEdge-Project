package com.ironedge.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.ironedge.model.User;
import com.ironedge.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository repository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    /* =========================
       REGISTER
       ========================= */
    public String register(String email, String password) {
        email = email.trim().toLowerCase();
        if (repository.findByEmail(email).isPresent()) {
            return "Usuário já existe";
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(password));

        repository.save(user);

        return "Usuário cadastrado com sucesso";
    }

    /* =========================
       LOGIN
       ========================= */
    public boolean login(String email, String password) {

    email = email.trim().toLowerCase();
    String cleanPassword = password.trim(); // 🔥 nova variável

    System.out.println("Email recebido: " + email);

    return repository.findByEmail(email)
            .map(user -> {
                System.out.println("Usuário encontrado: " + user.getEmail());
                System.out.println("Senha banco: " + user.getPassword());
                System.out.println("Senha digitada: " + cleanPassword);
                return encoder.matches(cleanPassword, user.getPassword());
            })
            .orElseGet(() -> {
                System.out.println("Usuário NÃO encontrado");
                return false;
            });
    }

    /* =========================
       BUSCAR USUÁRIO
       ========================= */
    public User findByEmail(String email) {
        email = email.trim().toLowerCase();
        return repository.findByEmail(email).orElse(null);
    }
}