package com.dyslexiasense.api.assessment;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record TabularAssessmentRequest(
        @NotNull String model,
        @NotEmpty Map<String, Object> features) {}
