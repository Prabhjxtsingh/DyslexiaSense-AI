package com.dyslexiasense.api.assessment;

import com.dyslexiasense.api.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment_records")
public class AssessmentRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, length = 32)
    private String modality;

    @Column(nullable = false, length = 64)
    private String model;

    @Column(nullable = false, length = 16)
    private String prediction;

    @Column(nullable = false)
    private double score;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String resultJson;

    protected AssessmentRecord() {}

    public AssessmentRecord(
            AppUser user,
            String modality,
            String model,
            String prediction,
            double score,
            String resultJson) {
        this.user = user;
        this.modality = modality;
        this.model = model;
        this.prediction = prediction;
        this.score = score;
        this.resultJson = resultJson;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getModality() {
        return modality;
    }

    public String getModel() {
        return model;
    }

    public String getPrediction() {
        return prediction;
    }

    public double getScore() {
        return score;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getResultJson() {
        return resultJson;
    }
}
