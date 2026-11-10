package com.raceforge.backend.training.service;

import com.raceforge.backend.training.dto.TrainingAssessmentRequest;
import com.raceforge.backend.training.entity.TrainingAssessmentAlertLevel;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** RaceForge screening rules for the demo; not a veterinary diagnosis or clearance. */
@Component
public class TrainingAssessmentRules {
    private static final Set<TrainingAssessmentCriterion> URGENT_CRITERIA = EnumSet.of(
            TrainingAssessmentCriterion.COORDINATION,
            TrainingAssessmentCriterion.BREATHING_EFFORT);
    private static final Set<TrainingAssessmentCriterion> REVIEW_CRITERIA = EnumSet.of(
            TrainingAssessmentCriterion.GAIT,
            TrainingAssessmentCriterion.LIMB_CONDITION,
            TrainingAssessmentCriterion.NASAL_BLEEDING);

    private final TrainingAssessmentValidator validator;

    public TrainingAssessmentRules(TrainingAssessmentValidator validator) {
        this.validator = validator;
    }

    /**
     * Trigger contract: SCORE_REVIEW / SCORE_URGENT describe the score band, followed
     * by failed priority criterion codes in template order. Normal has no triggers.
     */
    public Evaluation evaluate(TrainingAssessmentRequest request) {
        TrainingAssessmentRequest validated = validator.validate(request);
        int passedCount = (int) validated.checks().values().stream().filter(Boolean::booleanValue).count();
        TrainingAssessmentAlertLevel alertLevel;
        List<String> triggers = new ArrayList<>();
        if (passedCount <= 3) {
            alertLevel = TrainingAssessmentAlertLevel.URGENT_VET_REVIEW;
            triggers.add("SCORE_URGENT");
        } else if (passedCount <= 6) {
            alertLevel = TrainingAssessmentAlertLevel.VET_REVIEW_REQUIRED;
            triggers.add("SCORE_REVIEW");
        } else {
            alertLevel = TrainingAssessmentAlertLevel.NO_ALERT_DETECTED;
        }

        for (TrainingAssessmentCriterion criterion : TrainingAssessmentCriterion.values()) {
            if (Boolean.TRUE.equals(validated.checks().get(criterion.name()))) {
                continue;
            }
            TrainingAssessmentAlertLevel override = null;
            if (URGENT_CRITERIA.contains(criterion)) {
                override = TrainingAssessmentAlertLevel.URGENT_VET_REVIEW;
            } else if (REVIEW_CRITERIA.contains(criterion)) {
                override = TrainingAssessmentAlertLevel.VET_REVIEW_REQUIRED;
            }
            if (override != null) {
                triggers.add(criterion.name());
                if (override.priority() > alertLevel.priority()) {
                    alertLevel = override;
                }
            }
        }
        return new Evaluation(passedCount, TrainingAssessmentValidator.CRITERION_COUNT - passedCount,
                alertLevel, triggers);
    }

    public record Evaluation(int passedCount, int failedCount,
                             TrainingAssessmentAlertLevel alertLevel, List<String> triggerCodes) {
        public Evaluation {
            triggerCodes = List.copyOf(triggerCodes);
        }
    }
}