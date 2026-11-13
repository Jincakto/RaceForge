package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.training.dto.TrainingAssessmentRequest;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TrainingAssessmentValidatorTest {
    private final TrainingAssessmentValidator validator = new TrainingAssessmentValidator();

    @Test
    void t01MissingAssessmentIsRequired() {
        assertInvalid("ASSESSMENT_REQUIRED", null);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"POST_TRAINING_V2", "post_training_v1", " POST_TRAINING_V1 "})
    void rejectsUnsupportedVersion(String version) {
        assertInvalid("INVALID_CRITERION_CODE", new TrainingAssessmentRequest(version, allPassed(), Map.of()));
    }

    @Test
    void t02NineAnswersAreIncomplete() {
        Map<String, Boolean> checks = allPassed();
        checks.remove("TASK_COMPLETION");
        assertInvalid("ASSESSMENT_INCOMPLETE", request(checks, Map.of()));
    }

    @Test
    void nullChecksAreIncomplete() {
        assertInvalid("ASSESSMENT_INCOMPLETE", request(null, Map.of()));
    }

    @Test
    void emptyChecksAreIncomplete() {
        assertInvalid("ASSESSMENT_INCOMPLETE", request(Map.of(), Map.of()));
    }

    @Test
    void t03NullIsNotAConcernAnswer() {
        Map<String, Boolean> checks = allPassed();
        checks.put("TASK_COMPLETION", null);
        assertInvalid("ASSESSMENT_INCOMPLETE", request(checks, Map.of()));
    }

    @Test
    void t03UnknownAdditionalCriterionIsRejected() {
        Map<String, Boolean> checks = allPassed();
        checks.put("UNKNOWN", true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
    }

    @Test
    void t03UnknownReplacementCriterionIsRejected() {
        Map<String, Boolean> checks = allPassed();
        checks.remove("TASK_COMPLETION");
        checks.put("GUM_MOISTURE", true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ALERTNESS", "COORDINATION", "BREATHING_EFFORT", "GAIT", "LIMB_CONDITION",
            "MUSCLE_COMFORT", "EXTERNAL_INJURY", "SWEATING", "MUCOUS_MEMBRANES", "NASAL_BLEEDING"})
    void oldCriterionCodesCannotReplaceNewCodesOrAppearInNotes(String oldCode) {
        Map<String, Boolean> checks = allPassed();
        checks.remove("TASK_COMPLETION");
        checks.put(oldCode, true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
        assertInvalid("INVALID_CRITERION_CODE", request(allPassed(), Map.of(oldCode, "Old code.")));
    }

    @Test
    void t03NullCriterionKeyIsRejected() {
        Map<String, Boolean> checks = allPassed();
        checks.remove("TASK_COMPLETION");
        checks.put(null, true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"true", "false", "0", "1"})
    @SuppressWarnings({"rawtypes", "unchecked"})
    void t03RawStringAnswerCannotBypassValidator(String answer) {
        Map checks = allPassed();
        checks.put("TASK_COMPLETION", answer);
        assertInvalid("ASSESSMENT_INCOMPLETE", request(checks, Map.of()));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void t03RawIntegerAnswerCannotBypassValidator() {
        Map checks = allPassed();
        checks.put("TASK_COMPLETION", 1);
        assertInvalid("ASSESSMENT_INCOMPLETE", request(checks, Map.of()));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rawNonStringCriterionKeyIsRejected() {
        Map checks = allPassed();
        checks.remove("TASK_COMPLETION");
        checks.put(1, true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
    }

    @Test
    void concernCanBeSavedWithoutIndividualNotes() {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("TASK_COMPLETION"), Map.of()));
        assertFalse(cleaned.checks().get("TASK_COMPLETION"));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @Test
    void concernAcceptsMissingLegacyNotesMap() {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("TASK_COMPLETION"), null));
        assertFalse(cleaned.checks().get("TASK_COMPLETION"));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @Test
    void directCallerNullLegacyNoteIsTreatedAsAbsent() {
        Map<String, String> notes = new LinkedHashMap<>();
        notes.put("TASK_COMPLETION", null);
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("TASK_COMPLETION"), notes));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\t\r\n", "\u2003\u2003"})
    void optionalBlankLegacyConcernNotesAreTreatedAsAbsent(String note) {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("TASK_COMPLETION"), Map.of("TASK_COMPLETION", note)));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @Test
    void t05OverlongConcernNoteIsRejectedAfterTrim() {
        assertInvalid("FAIL_NOTE_TOO_LONG", request(withConcern("TASK_COMPLETION"),
                Map.of("TASK_COMPLETION", " " + "x".repeat(1001) + " ")));
    }

    @Test
    void thousandCharacterConcernNoteIsAcceptedAfterTrim() {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("TASK_COMPLETION"),
                Map.of("TASK_COMPLETION", " \t" + "x".repeat(1000) + "\n ")));
        assertEquals("x".repeat(1000), cleaned.failNotes().get("TASK_COMPLETION"));
    }

    @Test
    void trimsNotesWithoutChangingInputMaps() {
        Map<String, Boolean> checks = withConcern("TASK_COMPLETION");
        Map<String, String> notes = new LinkedHashMap<>(Map.of("TASK_COMPLETION", "  Less responsive.  "));
        TrainingAssessmentRequest cleaned = validator.validate(request(checks, notes));
        assertEquals("Less responsive.", cleaned.failNotes().get("TASK_COMPLETION"));
        assertEquals("  Less responsive.  ", notes.get("TASK_COMPLETION"));
        assertEquals(false, checks.get("TASK_COMPLETION"));
        assertNotSame(checks, cleaned.checks());
        assertNotSame(notes, cleaned.failNotes());
    }

    @Test
    void unknownNoteCodeIsRejectedEvenWhenAllChecksPass() {
        assertInvalid("INVALID_CRITERION_CODE", request(allPassed(), Map.of("UNKNOWN", "Note.")));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rawNonTextNoteIsRejected() {
        Map notes = Map.of("TASK_COMPLETION", 42);
        assertInvalid("FAIL_NOTE_REQUIRED", request(withConcern("TASK_COMPLETION"), notes));
    }

    @Test
    void allPassAcceptsMissingNotes() {
        TrainingAssessmentRequest cleaned = validator.validate(request(allPassed(), null));
        assertEquals(10, cleaned.checks().size());
        assertTrue(cleaned.checks().values().stream().allMatch(Boolean::booleanValue));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @Test
    void optionalPassNoteIsPreservedAndTrimmed() {
        TrainingAssessmentRequest cleaned = validator.validate(request(allPassed(), Map.of("TASK_COMPLETION", "  Observed.  ")));
        assertEquals("Observed.", cleaned.failNotes().get("TASK_COMPLETION"));
    }

    @Test
    void optionalPassNoteStillHasLengthLimit() {
        assertInvalid("FAIL_NOTE_TOO_LONG", request(allPassed(), Map.of("TASK_COMPLETION", "x".repeat(1001))));
    }

    @Test
    void cleanedMapsAreDefensiveAndOrderedByTemplate() {
        Map<String, Boolean> input = allPassed();
        TrainingAssessmentRequest cleaned = validator.validate(request(input, Map.of()));
        input.put("TASK_COMPLETION", false);
        assertEquals(true, cleaned.checks().get("TASK_COMPLETION"));
        assertEquals(java.util.Arrays.stream(TrainingAssessmentCriterion.values()).map(Enum::name).toList(),
                cleaned.checks().keySet().stream().toList());
        assertThrows(UnsupportedOperationException.class, () -> cleaned.checks().put("TASK_COMPLETION", false));
        assertThrows(UnsupportedOperationException.class, () -> cleaned.failNotes().put("TASK_COMPLETION", "Changed."));
    }

    @Test
    void allTenConcernsAreAcceptedWithNoIndividualNotes() {
        Map<String, Boolean> checks = allPassed();
        checks.replaceAll((code, value) -> false);
        TrainingAssessmentRequest cleaned = validator.validate(request(checks, null));
        assertEquals(10, cleaned.checks().size());
        assertTrue(cleaned.checks().values().stream().noneMatch(Boolean::booleanValue));
        assertTrue(cleaned.failNotes().isEmpty());
    }
    private void assertInvalid(String code, TrainingAssessmentRequest request) {
        ApiException error = assertThrows(ApiException.class, () -> validator.validate(request));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals(code, error.getCode());
        assertNotNull(error.getMessage());
        assertFalse(error.getMessage().isBlank());
    }

    private TrainingAssessmentRequest request(Map<String, Boolean> checks, Map<String, String> notes) {
        return new TrainingAssessmentRequest(TrainingAssessmentValidator.CHECKLIST_VERSION, checks, notes);
    }

    private Map<String, Boolean> withConcern(String code) {
        Map<String, Boolean> checks = allPassed();
        checks.put(code, false);
        return checks;
    }

    private Map<String, Boolean> allPassed() {
        Map<String, Boolean> checks = new LinkedHashMap<>();
        for (TrainingAssessmentCriterion criterion : TrainingAssessmentCriterion.values()) {
            checks.put(criterion.name(), true);
        }
        return checks;
    }
}