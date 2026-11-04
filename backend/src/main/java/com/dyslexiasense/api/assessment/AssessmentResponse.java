package com.dyslexiasense.api.assessment;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record AssessmentResponse(
        UUID id,
        String modality,
        String model,
        String prediction,
        double score,
        Instant createdAt,
        JsonNode result) {}
