package com.prana.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroqService {

    @Value("${groq.api.key}")
    private String apiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    private static final String SYSTEM_PROMPT =
        "You are a medical data extraction assistant for Indian hospitals. " +
        "Given a voice transcript (possibly in Hindi, Marathi, or English), extract all relevant " +
        "medical/patient information and return ONLY a valid JSON object. No explanation, no markdown.";

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    public JsonNode extractFromTranscript(String transcript) {
        WebClient client = webClientBuilder
                .baseUrl(GROQ_URL)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        Map<String, Object> body = Map.of(
                "model", "llama3-8b-8192",
                "temperature", 0.1,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", "Transcript:\n" + transcript)
                )
        );

        try {
            String response = client.post()
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            String content = root.at("/choices/0/message/content").asText("{}");

            // Strip markdown code fences if present
            content = content.replaceAll("(?s)```json\\s*(.*?)\\s*```", "$1").trim();
            content = content.replaceAll("(?s)```\\s*(.*?)\\s*```", "$1").trim();

            return objectMapper.readTree(content);
        } catch (Exception e) {
            log.error("Groq extraction failed: {}", e.getMessage());
            return objectMapper.createObjectNode().put("error", e.getMessage());
        }
    }
}
