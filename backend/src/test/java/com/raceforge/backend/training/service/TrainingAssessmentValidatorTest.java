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
        checks.remove("ALERTNESS");
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
        checks.put("ALERTNESS", null);
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
        checks.remove("ALERTNESS");
        checks.put("GUM_MOISTURE", true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
    }

    @Test
    void t03NullCriterionKeyIsRejected() {
        Map<String, Boolean> checks = allPassed();
        checks.remove("ALERTNESS");
        checks.put(null, true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"true", "false", "0", "1"})
    @SuppressWarnings({"rawtypes", "unchecked"})
    void t03RawStringAnswerCannotBypassValidator(String answer) {
        Map checks = allPassed();
        checks.put("ALERTNESS", answer);
        assertInvalid("ASSESSMENT_INCOMPLETE", request(checks, Map.of()));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void t03RawIntegerAnswerCannotBypassValidator() {
        Map checks = allPassed();
        checks.put("ALERTNESS", 1);
        assertInvalid("ASSESSMENT_INCOMPLETE", request(checks, Map.of()));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rawNonStringCriterionKeyIsRejected() {
        Map checks = allPassed();
        checks.remove("ALERTNESS");
        checks.put(1, true);
        assertInvalid("INVALID_CRITERION_CODE", request(checks, Map.of()));
    }

    @Test
    void concernCanBeSavedWithoutIndividualNotes() {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("ALERTNESS"), Map.of()));
        assertFalse(cleaned.checks().get("ALERTNESS"));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @Test
    void concernAcceptsMissingLegacyNotesMap() {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("ALERTNESS"), null));
        assertFalse(cleaned.checks().get("ALERTNESS"));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @Test
    void directCallerNullLegacyNoteIsTreatedAsAbsent() {
        Map<String, String> notes = new LinkedHashMap<>();
        notes.put("ALERTNESS", null);
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("ALERTNESS"), notes));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\t\r\n", "\u2003\u2003"})
    void optionalBlankLegacyConcernNotesAreTreatedAsAbsent(String note) {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("ALERTNESS"), Map.of("ALERTNESS", note)));
        assertTrue(cleaned.failNotes().isEmpty());
    }

    @Test
    void t05OverlongConcernNoteIsRejectedAfterTrim() {
        assertInvalid("FAIL_NOTE_TOO_LONG", request(withConcern("ALERTNESS"),
                Map.of("ALERTNESS", " " + "x".repeat(1001) + " ")));
    }

    @Test
    void thousandCharacterConcernNoteIsAcceptedAfterTrim() {
        TrainingAssessmentRequest cleaned = validator.validate(request(withConcern("ALERTNESS"),
                Map.of("ALERTNESS", " \t" + "x".repeat(1000) + "\n ")));
        assertEquals("x".repeat(1000), cleaned.failNotes().get("ALERTNESS"));
    }

    @Test
    void trimsNotesWithoutChangingInputMaps() {
        Map<String, Boolean> checks = withConcern("ALERTNESS");
        Map<String, String> notes = new LinkedHashMap<>(Map.of("ALERTNESS", "  Less responsive.  "));
        TrainingAssessmentRequest cleaned = validator.validate(request(checks, notes));
        assertEquals("Less responsive.", cleaned.failNotes().get("ALERTNESS"));
        assertEquals("  Less responsive.  ", notes.get("ALERTNESS"));
        assertEquals(false, checks.get("ALERTNESS"));
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
        Map notes = Map.of("ALERTNESS", 42);
        assertInvalid("FAIL_NOTE_REQUIRED", request(withConcern("ALERTNESS"), notes));
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
        TrainingAssessmentRequest cleaned = validator.validate(request(allPassed(), Map.of("ALERTNESS", "  Observed.  ")));
        assertEquals("Observed.", cleaned.failNotes().get("ALERTNESS"));
    }

    @Test
    void optionalPassNoteStillHasLengthLimit() {
        assertInvalid("FAIL_NOTE_TOO_LONG", request(allPassed(), Map.of("ALERTNESS", "x".repeat(1001))));
    }

    @Test
    void cleanedMapsAreDefensiveAndOrderedByTemplate() {
        Map<String, Boolean> input = allPassed();
        TrainingAssessmentRequest cleaned = validator.validate(request(input, Map.of()));
        input.put("ALERTNESS", false);
        assertEquals(true, cleaned.checks().get("ALERTNESS"));
        assertEquals(java.util.Arrays.stream(TrainingAssessmentCriterion.values()).map(Enum::name).toList(),
                cleaned.checks().keySet().stream().toList());
        assertThrows(UnsupportedOperationException.class, () -> cleaned.checks().put("ALERTNESS", false));
        assertThrows(UnsupportedOperationException.class, () -> cleaned.failNotes().put("ALERTNESS", "Changed."));
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