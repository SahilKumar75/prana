package com.prana.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.prana.dto.CreateSessionRequest;
import com.prana.dto.StatsResponse;
import com.prana.model.Session;
import com.prana.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final GroqService groqService;

    public List<Session> getAllSessions() {
        return sessionRepository.findAllByOrderByCreatedAtDesc();
    }

    public Session getSessionById(UUID id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found: " + id));
    }

    @Transactional
    public Session createSession(CreateSessionRequest req) {
        // Save as pending first
        Session session = Session.builder()
                .rawTranscript(req.getRawTranscript())
                .language(req.getLanguage() != null ? req.getLanguage() : "hi-IN")
                .status("pending")
                .build();
        session = sessionRepository.save(session);

        // Call Groq for extraction
        try {
            JsonNode extracted = groqService.extractFromTranscript(req.getRawTranscript());
            session.setExtractedData(extracted);
            session.setStatus("processed");
        } catch (Exception e) {
            log.error("Groq extraction error for session {}: {}", session.getId(), e.getMessage());
            session.setStatus("error");
        }

        return sessionRepository.save(session);
    }

    public StatsResponse getStats() {
        long total = sessionRepository.count();
        long processed = sessionRepository.countByStatus("processed");
        String topLang = sessionRepository.findTopLanguage();

        String successRate = total == 0 ? "100%"
                : Math.round((processed * 100.0) / total) + "%";

        return StatsResponse.builder()
                .totalSessions(total)
                .processedSessions(processed)
                .successRate(successRate)
                .topLanguage(topLang != null ? topLang : "hi-IN")
                .build();
    }
}
