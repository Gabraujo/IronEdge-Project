package com.ironedge.controller;

import com.ironedge.model.Transaction;
import com.ironedge.model.TransactionType;
import com.ironedge.model.User;
import com.ironedge.repository.TransactionRepository;

import jakarta.servlet.http.HttpSession;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final TransactionRepository repository;

    public DashboardController(TransactionRepository repository) {
        this.repository = repository;
    }

    /* =========================
       RESUMO DO DASHBOARD
    ========================= */
    @GetMapping("/summary")
    public Map<String, Object> getSummary(HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            throw new RuntimeException("Usuário não autenticado");
        }

        List<Transaction> transactions = repository.findByUser(user);

        double income = transactions.stream()
                .filter(t -> t.getType() == TransactionType.RECEITA)
                .mapToDouble(Transaction::getAmount)
                .sum();

        double expense = transactions.stream()
                .filter(t -> t.getType() == TransactionType.DESPESA)
                .mapToDouble(Transaction::getAmount)
                .sum();

        double balance = income - expense;

        return Map.of(
                "income", income,
                "expense", expense,
                "balance", balance,
                "savings", balance
        );
    }
}