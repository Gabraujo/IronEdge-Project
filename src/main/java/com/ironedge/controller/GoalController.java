package com.ironedge.controller;

import com.ironedge.model.Goal;
import com.ironedge.model.User;
import com.ironedge.repository.GoalRepository;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository repository;

    public GoalController(GoalRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Goal> getGoals(HttpSession session) {

        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        return repository.findByUser(user);
    }

    @PostMapping
    public Goal create(@RequestBody Goal goal,
                       HttpSession session) {

        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }
        if (goal == null || goal.getName() == null || goal.getName().isBlank() || goal.getTargetAmount() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados da meta inválidos");
        }

        goal.setName(goal.getName().trim());
        if (goal.getCurrentAmount() < 0) goal.setCurrentAmount(0);
        goal.setUser(user);

        return repository.save(goal);
    }

    @PutMapping("/{id}")
    public Goal update(@PathVariable Long id,
                       @RequestBody Goal payload,
                       HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }
        if (payload == null || payload.getName() == null || payload.getName().isBlank() || payload.getTargetAmount() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados da meta inválidos");
        }

        Goal goal = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meta não encontrada"));

        goal.setName(payload.getName().trim());
        goal.setTargetAmount(payload.getTargetAmount());

        // Mantém contribuição atual, mas garante que não fique negativa
        if (goal.getCurrentAmount() < 0) goal.setCurrentAmount(0);

        return repository.save(goal);
    }

    @PostMapping("/{id}/contribute")
    public Goal contribute(@PathVariable Long id,
                           @RequestBody Map<String, Double> payload,
                           HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        double amount = payload == null || payload.get("amount") == null ? 0 : payload.get("amount");
        if (amount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor de contribuição inválido");
        }

        Goal goal = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meta não encontrada"));

        goal.setCurrentAmount(goal.getCurrentAmount() + amount);
        return repository.save(goal);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        Goal goal = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meta não encontrada"));

        repository.deleteById(goal.getId());
    }
}
