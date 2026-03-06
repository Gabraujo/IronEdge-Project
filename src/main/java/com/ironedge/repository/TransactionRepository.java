package com.ironedge.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ironedge.model.Transaction;
import com.ironedge.model.User;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUser(User user);

}