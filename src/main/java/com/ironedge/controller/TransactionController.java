package com.ironedge.controller;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

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

import com.ironedge.dto.TransactionDTO;
import com.ironedge.model.Transaction;
import com.ironedge.model.TransactionType;
import com.ironedge.model.User;
import com.ironedge.repository.TransactionRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository repository;

    public TransactionController(TransactionRepository repository) {
        this.repository = repository;
    }

    /* =========================
       LISTAR TRANSAÇÕES
    ========================= */
    @GetMapping
    public List<Transaction> getUserTransactions(HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        return repository.findByUser(user);
    }

    /* =========================
       CRIAR TRANSAÇÃO
    ========================= */
    @PostMapping
    public Transaction create(@RequestBody TransactionDTO dto,
                              HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        if (dto == null || dto.description == null || dto.description.isBlank() || dto.type == null || dto.date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados da transação inválidos");
        }

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        applyTransactionData(transaction, dto);

        return repository.save(transaction);
    }

    /* =========================
       EDITAR TRANSAÇÃO
    ========================= */
    @PutMapping("/{id}")
    public Transaction update(@PathVariable Long id,
                              @RequestBody TransactionDTO dto,
                              HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        if (dto == null || dto.description == null || dto.description.isBlank() || dto.type == null || dto.date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados da transação inválidos");
        }

        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transação não encontrada"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado");
        }

        applyTransactionData(transaction, dto);

        return repository.save(transaction);
    }

    /* =========================
       DELETAR TRANSAÇÃO
    ========================= */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id,
                       HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transação não encontrada"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado");
        }

        repository.deleteById(id);
    }

    private void applyTransactionData(Transaction transaction, TransactionDTO dto) {
        transaction.setDescription(dto.description.trim());
        transaction.setAmount(dto.amount);
        transaction.setCategory(dto.category);

        try {
            transaction.setType(TransactionType.valueOf(dto.type.trim().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de transação inválido");
        }

        try {
            transaction.setDate(LocalDate.parse(dto.date));
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data inválida. Use o formato yyyy-MM-dd");
        }
    }
}
