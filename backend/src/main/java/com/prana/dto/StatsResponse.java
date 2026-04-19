package com.prana.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StatsResponse {

    @JsonProperty("total_sessions")
    private long totalSessions;

    @JsonProperty("processed_sessions")
    private long processedSessions;

    @JsonProperty("success_rate")
    private String successRate;

    @JsonProperty("top_language")
    private String topLanguage;
}
