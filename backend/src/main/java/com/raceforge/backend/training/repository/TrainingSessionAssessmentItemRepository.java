package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingSessionAssessmentItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingSessionAssessmentItemRepository extends JpaRepository<TrainingSessionAssessmentItem, String> {
    @EntityGraph(attributePaths = {"assessment"})
    List<TrainingSessionAssessmentItem> findByAssessment_SessionIdOrderByCriterionCodeAsc(String sessionId);

    @EntityGraph(attributePaths = {"assessment"})
    List<TrainingSessionAssessmentItem> findByAssessment_SessionIdIn(Collection<String> sessionIds);
}
