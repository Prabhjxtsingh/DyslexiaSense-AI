package com.dyslexiasense.api.assessment;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/assessments")
public class AssessmentController {
    private final RestClient mlRestClient;
    private final AssessmentService assessmentService;

    public AssessmentController(
            RestClient mlRestClient, AssessmentService assessmentService) {
        this.mlRestClient = mlRestClient;
        this.assessmentService = assessmentService;
    }

    @PostMapping("/tabular")
    public AssessmentResponse tabular(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody TabularAssessmentRequest request) {
        if (!List.of("random_forest", "extra_trees", "xgboost", "svm")
                .contains(request.model())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown tabular model.");
        }
        JsonNode result = mlRestClient.post()
                .uri("/predict/tabular/{model}", request.model())
                .contentType(MediaType.APPLICATION_JSON)
                .body(java.util.Map.of("features", request.features()))
                .retrieve()
                .body(JsonNode.class);
        if (result == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "ML service returned an empty response.");
        }
        return assessmentService.save(jwt.getSubject(), "tabular", request.model(), result);
    }

    @PostMapping(value = "/handwriting", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AssessmentResponse handwriting(
            @AuthenticationPrincipal Jwt jwt,
            @RequestPart("image") MultipartFile image) {
        if (image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please upload an image.");
        }
        if (image.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE, "Image must be 10 MB or smaller.");
        }
        String contentType = image.getContentType();
        if (contentType == null
                || !List.of("image/jpeg", "image/png").contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Upload a JPEG or PNG image.");
        }

        try {
            MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
            bodyBuilder.part(
                            "image",
                            new ByteArrayResource(image.getBytes()) {
                                @Override
                                public String getFilename() {
                                    return image.getOriginalFilename() == null
                                            ? "handwriting-upload"
                                            : image.getOriginalFilename();
                                }
                            })
                    .contentType(MediaType.parseMediaType(contentType));
            JsonNode result = mlRestClient.post()
                    .uri("/predict/handwriting")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(bodyBuilder.build())
                    .retrieve()
                    .body(JsonNode.class);
            if (result == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY, "ML service returned an empty response.");
            }
            return assessmentService.save(
                    jwt.getSubject(), "handwriting", "mobilenetv2", result);
        } catch (java.io.IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Could not read uploaded image.", exception);
        }
    }

    @GetMapping
    public List<AssessmentResponse> history(@AuthenticationPrincipal Jwt jwt) {
        return assessmentService.history(jwt.getSubject());
    }
}
