package com.prana.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSessionRequest {

    @NotBlank(message = "raw_transcript must not be blank")
    @JsonProperty("raw_transcript")
    private String rawTranscript;

    @JsonProperty("language")
    private String language = "hi-IN";
}
