package com.ironedge.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ironedge.model.Goal;
import com.ironedge.model.User;

public interface GoalRepository extends JpaRepository<Goal, Long> {

    List<Goal> findByUser(User user);
    Optional<Goal> findByIdAndUser(Long id, User user);

}
