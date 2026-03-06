package com.ironedge.controller;

import com.ironedge.model.Budget;
import com.ironedge.model.User;
import com.ironedge.repository.BudgetRepository;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetRepository repository;

    public BudgetController(BudgetRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Budget> getBudgets(HttpSession session) {

        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        return repository.findByUser(user);
    }

    @PostMapping
    public Budget create(@RequestBody Budget budget,
                         HttpSession session) {

        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }
        if (budget == null || budget.getCategory() == null || budget.getCategory().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Categoria inválida");
        }

        Budget existing = repository.findByUserAndCategoryIgnoreCase(user, budget.getCategory().trim()).orElse(null);
        if (existing != null) {
            existing.setLimitAmount(Math.max(0, budget.getLimitAmount()));
            return repository.save(existing);
        }

        budget.setCategory(budget.getCategory().trim());
        budget.setLimitAmount(Math.max(0, budget.getLimitAmount()));
        budget.setUser(user);        

        return repository.save(budget);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        Budget budget = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Orçamento não encontrado"));

        repository.deleteById(budget.getId());
    }
}
