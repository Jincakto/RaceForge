package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.TrainingAssessmentItemResponse;
import com.raceforge.backend.training.dto.TrainingAssessmentResponse;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import com.raceforge.backend.training.entity.TrainingSessionAssessment;
import com.raceforge.backend.training.entity.TrainingSessionAssessmentItem;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class TrainingAssessmentMapper {
    public TrainingAssessmentResponse toResponse(TrainingSessionAssessment assessment,
            List<TrainingSessionAssessmentItem> items, boolean pendingForHorse) {
        var answers = items.stream()
                .sorted(Comparator.comparing(item -> item.getCriterionCode().ordinal()))
                .map(item -> new TrainingAssessmentItemResponse(item.getCriterionCode().name(),
                        item.getCriterionCode().label(), item.isPassed(), item.getFailNote()))
                .toList();
        var failed = answers.stream().filter(item -> !item.passed())
                .map(TrainingAssessmentItemResponse::code).toList();
        var assessor = assessment.getAssessor();
        return new TrainingAssessmentResponse(assessment.getSessionId(), assessment.getHorseId(),
                assessor.getUserId(), assessor.getFullName(), assessment.getAssessedAt(),
                assessment.getChecklistVersion(), answers, assessment.getPassedCount(),
                assessment.getFailedCount(), assessment.getAlertLevel(), assessment.getTriggerCodes(),
                failed, assessment.getReviewStatus(), assessment.getNotificationStatus(),
                assessment.getLinkedMedicalRecordId(), assessment.getReviewedMedicalRecordId(), pendingForHorse);
    }
}
