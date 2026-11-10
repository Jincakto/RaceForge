package com.raceforge.backend.training.dto;

import com.raceforge.backend.training.entity.TrainingAssessmentAlertLevel;
import com.raceforge.backend.training.entity.TrainingAssessmentNotificationStatus;
import com.raceforge.backend.training.entity.TrainingAssessmentReviewStatus;
import java.time.LocalDateTime;
import java.util.List;

public record TrainingAssessmentResponse(
        String sessionId,
        String horseId,
        String assessorUserId,
        String assessorName,
        LocalDateTime assessedAt,
        String checklistVersion,
        List<TrainingAssessmentItemResponse> items,
        int passedCount,
        int failedCount,
        TrainingAssessmentAlertLevel alertLevel,
        List<String> triggerCodes,
        List<String> failedCriteria,
        TrainingAssessmentReviewStatus reviewStatus,
        TrainingAssessmentNotificationStatus notificationStatus,
        String linkedMedicalRecordId,
        String reviewedMedicalRecordId,
        boolean pendingPostTrainingReview) {
}
