package com.prana.controller;

import com.prana.dto.CreateSessionRequest;
import com.prana.dto.StatsResponse;
import com.prana.model.Session;
import com.prana.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    // GET /api/sessions
    @GetMapping
    public ResponseEntity<List<Session>> getAllSessions() {
        return ResponseEntity.ok(sessionService.getAllSessions());
    }

    // GET /api/sessions/stats
    @GetMapping("/stats")
    public ResponseEntity<StatsResponse> getStats() {
        return ResponseEntity.ok(sessionService.getStats());
    }

    // GET /api/sessions/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Session> getSession(@PathVariable UUID id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    // POST /api/sessions
    @PostMapping
    public ResponseEntity<Session> createSession(@Valid @RequestBody CreateSessionRequest req) {
        Session created = sessionService.createSession(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
