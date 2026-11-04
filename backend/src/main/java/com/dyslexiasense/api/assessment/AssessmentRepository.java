package com.dyslexiasense.api.assessment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentRepository extends JpaRepository<AssessmentRecord, UUID> {
    List<AssessmentRecord> findTop50ByUser_EmailOrderByCreatedAtDesc(String email);
}
