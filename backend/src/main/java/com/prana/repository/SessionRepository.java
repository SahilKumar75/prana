package com.prana.repository;

import com.prana.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    // Most recent sessions first
    List<Session> findAllByOrderByCreatedAtDesc();

    // Count by status
    long countByStatus(String status);

    // Top language query
    @Query("SELECT s.language FROM Session s GROUP BY s.language ORDER BY COUNT(s.language) DESC LIMIT 1")
    String findTopLanguage();
}
