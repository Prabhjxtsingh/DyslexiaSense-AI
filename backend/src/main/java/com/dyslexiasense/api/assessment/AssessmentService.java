package com.dyslexiasense.api.assessment;

import com.dyslexiasense.api.user.AppUser;
import com.dyslexiasense.api.user.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AssessmentService {
    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AssessmentService(
            AssessmentRepository assessmentRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.assessmentRepository = assessmentRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @CacheEvict(cacheNames = "assessment-history", key = "#email")
    public AssessmentResponse save(
            String email, String modality, String model, JsonNode result) {
        String prediction = result.path("prediction").asText(null);
        if (!"Yes".equals(prediction) && !"No".equals(prediction)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "ML service returned an invalid prediction.");
        }
        double score = result.path("score").asDouble(Double.NaN);
        if (!Double.isFinite(score) || score < 0 || score > 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "ML service returned an invalid score.");
        }

        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Authenticated user no longer exists."));
        try {
            AssessmentRecord record = assessmentRepository.save(
                    new AssessmentRecord(
                            user, modality, model, prediction, score,
                            objectMapper.writeValueAsString(result)));
            return toResponse(record);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize ML assessment result.", exception);
        }
    }

    @Cacheable(cacheNames = "assessment-history", key = "#email")
    public List<AssessmentResponse> history(String email) {
        return assessmentRepository.findTop50ByUser_EmailOrderByCreatedAtDesc(email)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private AssessmentResponse toResponse(AssessmentRecord record) {
        try {
            return new AssessmentResponse(
                    record.getId(),
                    record.getModality(),
                    record.getModel(),
                    record.getPrediction(),
                    record.getScore(),
                    record.getCreatedAt(),
                    objectMapper.readTree(record.getResultJson()));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored assessment result is invalid JSON.", exception);
        }
    }
}
