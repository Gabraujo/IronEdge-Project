package com.ironedge.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ironedge.model.Investment;
import com.ironedge.model.User;
import com.ironedge.repository.InvestmentRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {

    private final InvestmentRepository repository;

    public InvestmentController(InvestmentRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Investment> getInvestments(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        return repository.findByUser(user);
    }

    @PostMapping
    public Investment create(@RequestBody Investment investment, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }
        if (investment == null || investment.getName() == null || investment.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados do investimento inválidos");
        }

        investment.setName(investment.getName().trim());
        investment.setCurrentAmount(Math.max(0, investment.getCurrentAmount()));
        investment.setUser(user);
        return repository.save(investment);
    }

    @PutMapping("/{id}")
    public Investment update(@PathVariable Long id, @RequestBody Investment payload, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }
        if (payload == null || payload.getName() == null || payload.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados do investimento inválidos");
        }

        Investment investment = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investimento não encontrado"));

        investment.setName(payload.getName().trim());
        if (payload.getCurrentAmount() >= 0) {
            investment.setCurrentAmount(payload.getCurrentAmount());
        }

        return repository.save(investment);
    }

    @PostMapping("/{id}/contribute")
    public Investment contribute(@PathVariable Long id, @RequestBody Map<String, Double> payload, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        double amount = payload == null || payload.get("amount") == null ? 0 : payload.get("amount");
        if (amount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor de contribuição inválido");
        }

        Investment investment = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investimento não encontrado"));

        investment.setCurrentAmount(investment.getCurrentAmount() + amount);
        return repository.save(investment);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        Investment investment = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investimento não encontrado"));

        repository.deleteById(investment.getId());
    }
}
