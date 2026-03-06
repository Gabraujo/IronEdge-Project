package com.ironedge.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ironedge.model.Investment;
import com.ironedge.model.User;

public interface InvestmentRepository extends JpaRepository<Investment, Long> {

    List<Investment> findByUser(User user);

    Optional<Investment> findByIdAndUser(Long id, User user);
}
