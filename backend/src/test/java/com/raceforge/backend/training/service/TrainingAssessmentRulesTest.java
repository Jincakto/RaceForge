package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.training.dto.TrainingAssessmentRequest;
import com.raceforge.backend.training.entity.TrainingAssessmentAlertLevel;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TrainingAssessmentRulesTest {
    private final TrainingAssessmentRules rules = new TrainingAssessmentRules(new TrainingAssessmentValidator());

    // Non-priority concerns first isolate score boundaries from urgent overrides.
    private static final List<String> FAILURE_ORDER = List.of(
            "ALERTNESS", "MUSCLE_COMFORT", "EXTERNAL_INJURY", "SWEATING", "MUCOUS_MEMBRANES",
            "GAIT", "LIMB_CONDITION", "NASAL_BLEEDING", "COORDINATION", "BREATHING_EFFORT");

    @ParameterizedTest
    @CsvSource({
            "10,NO_ALERT_DETECTED", "9,NO_ALERT_DETECTED", "8,NO_ALERT_DETECTED", "7,NO_ALERT_DETECTED",
            "6,VET_REVIEW_REQUIRED", "5,VET_REVIEW_REQUIRED", "4,VET_REVIEW_REQUIRED",
            "3,URGENT_VET_REVIEW", "2,URGENT_VET_REVIEW", "1,URGENT_VET_REVIEW", "0,URGENT_VET_REVIEW"
    })
    void t06ToT11EveryScoreAndBoundary(int passedCount, TrainingAssessmentAlertLevel expected) {
        String[] failures = FAILURE_ORDER.subList(0, 10 - passedCount).toArray(String[]::new);
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request(failures));
        assertEquals(passedCount, result.passedCount());
        assertEquals(10 - passedCount, result.failedCount());
        assertEquals(expected, result.alertLevel());
        if (passedCount <= 3) {
            assertEquals("SCORE_URGENT", result.triggerCodes().get(0));
        } else if (passedCount <= 6) {
            assertEquals("SCORE_REVIEW", result.triggerCodes().get(0));
        } else {
            assertTrue(result.triggerCodes().isEmpty());
        }
    }

    @ParameterizedTest
    @CsvSource({
            "COORDINATION,URGENT_VET_REVIEW",
            "BREATHING_EFFORT,URGENT_VET_REVIEW",
            "GAIT,VET_REVIEW_REQUIRED",
            "LIMB_CONDITION,VET_REVIEW_REQUIRED",
            "NASAL_BLEEDING,VET_REVIEW_REQUIRED"
    })
    void t12ToT16SinglePriorityConcernOverridesNinePasses(String failedCode,
                                                         TrainingAssessmentAlertLevel expected) {
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request(failedCode));
        assertEquals(9, result.passedCount());
        assertEquals(1, result.failedCount());
        assertEquals(expected, result.alertLevel());
        assertEquals(List.of(failedCode), result.triggerCodes());
    }

    @Test
    void t17UrgentWinsOverReviewAndTriggersKeepTemplateOrder() {
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request("NASAL_BLEEDING", "GAIT", "COORDINATION"));
        assertEquals(7, result.passedCount());
        assertEquals(TrainingAssessmentAlertLevel.URGENT_VET_REVIEW, result.alertLevel());
        assertEquals(List.of("COORDINATION", "GAIT", "NASAL_BLEEDING"), result.triggerCodes());
    }

    @Test
    void scoreUrgentIsNeverDowngradedByReviewCriterion() {
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request("ALERTNESS", "MUSCLE_COMFORT",
                "EXTERNAL_INJURY", "SWEATING", "MUCOUS_MEMBRANES", "GAIT", "LIMB_CONDITION"));
        assertEquals(3, result.passedCount());
        assertEquals(TrainingAssessmentAlertLevel.URGENT_VET_REVIEW, result.alertLevel());
        assertEquals(List.of("SCORE_URGENT", "GAIT", "LIMB_CONDITION"), result.triggerCodes());
    }

    @Test
    void scoreReviewCanBeUpgradedByUrgentCriterion() {
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request("ALERTNESS", "MUSCLE_COMFORT",
                "EXTERNAL_INJURY", "COORDINATION"));
        assertEquals(6, result.passedCount());
        assertEquals(TrainingAssessmentAlertLevel.URGENT_VET_REVIEW, result.alertLevel());
        assertEquals(List.of("SCORE_REVIEW", "COORDINATION"), result.triggerCodes());
    }

    @Test
    void allPassProducesNoFalseTriggersAndImmutableResult() {
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request());
        assertEquals(TrainingAssessmentAlertLevel.NO_ALERT_DETECTED, result.alertLevel());
        assertTrue(result.triggerCodes().isEmpty());
        assertThrows(UnsupportedOperationException.class, () -> result.triggerCodes().add("GAIT"));
    }

    @Test
    void evaluatorRejectsIncompleteInputRatherThanCountingIt() {
        TrainingAssessmentRequest request = request();
        request.checks().remove("ALERTNESS");
        ApiException error = assertThrows(ApiException.class, () -> rules.evaluate(request));
        assertEquals("ASSESSMENT_INCOMPLETE", error.getCode());
    }

    @Test
    void evaluatorAcceptsConcernWithoutIndividualNotesAndStillAppliesOverride() {
        TrainingAssessmentRequest request = request("GAIT");
        request.failNotes().clear();
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request);
        assertEquals(9, result.passedCount());
        assertEquals(TrainingAssessmentAlertLevel.VET_REVIEW_REQUIRED, result.alertLevel());
        assertEquals(List.of("GAIT"), result.triggerCodes());
    }

    @Test
    void allConcernsWithoutNotesStillRequireUrgentVeterinaryReview() {
        TrainingAssessmentRequest request = request(FAILURE_ORDER.toArray(String[]::new));
        request.failNotes().clear();
        TrainingAssessmentRules.Evaluation result = rules.evaluate(request);
        assertEquals(0, result.passedCount());
        assertEquals(10, result.failedCount());
        assertEquals(TrainingAssessmentAlertLevel.URGENT_VET_REVIEW, result.alertLevel());
        assertEquals("SCORE_URGENT", result.triggerCodes().get(0));
    }
    @Test
    void rulesDoNotMutateSubmittedObservations() {
        TrainingAssessmentRequest request = request("GAIT");
        request.failNotes().put("GAIT", "  Uneven movement observed.  ");
        rules.evaluate(request);
        assertEquals("  Uneven movement observed.  ", request.failNotes().get("GAIT"));
        assertEquals(false, request.checks().get("GAIT"));
    }

    private TrainingAssessmentRequest request(String... failedCodes) {
        List<String> failures = Arrays.asList(failedCodes);
        Map<String, Boolean> checks = new LinkedHashMap<>();
        Map<String, String> notes = new LinkedHashMap<>();
        for (TrainingAssessmentCriterion criterion : TrainingAssessmentCriterion.values()) {
            boolean passed = !failures.contains(criterion.name());
            checks.put(criterion.name(), passed);
            if (!passed) {
                notes.put(criterion.name(), "Concern observed during the post-training check.");
            }
        }
        return new TrainingAssessmentRequest(TrainingAssessmentValidator.CHECKLIST_VERSION, checks, notes);
    }
}