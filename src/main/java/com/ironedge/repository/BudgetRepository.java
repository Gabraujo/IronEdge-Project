package com.ironedge.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ironedge.model.Budget;
import com.ironedge.model.User;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUser(User user);
    Optional<Budget> findByIdAndUser(Long id, User user);
    Optional<Budget> findByUserAndCategoryIgnoreCase(User user, String category);

}
