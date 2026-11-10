package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.training.dto.TrainingAssessmentRequest;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Pure validation shared by HTTP completion and attendance completion. */
@Component
public class TrainingAssessmentValidator {
    public static final String CHECKLIST_VERSION = "POST_TRAINING_V1";
    public static final int CRITERION_COUNT = 10;
    private static final int MAX_NOTE_LENGTH = 1000;
    private static final Set<String> CRITERION_CODES = Stream.of(TrainingAssessmentCriterion.values())
            .map(Enum::name)
            .collect(Collectors.toUnmodifiableSet());

    /** All ten answers are required; legacy per-check notes are optional and trimmed when supplied. */
    public TrainingAssessmentRequest validate(TrainingAssessmentRequest request) {
        if (request == null) {
            throw badRequest("ASSESSMENT_REQUIRED", "Complete the post-training health check before saving.");
        }
        if (!CHECKLIST_VERSION.equals(request.checklistVersion())) {
            throw badRequest("INVALID_CRITERION_CODE", "Use the current post-training health check template.");
        }

        // Inspect erased map entries too: callers other than Jackson must not bypass types.
        Map<?, ?> submittedChecks = request.checks();
        if (submittedChecks == null) {
            throw incomplete();
        }
        requireKnownKeys(submittedChecks);
        if (submittedChecks.size() != CRITERION_COUNT) {
            throw incomplete();
        }

        Map<String, Boolean> checks = new LinkedHashMap<>();
        for (TrainingAssessmentCriterion criterion : TrainingAssessmentCriterion.values()) {
            Object answer = submittedChecks.get(criterion.name());
            if (!(answer instanceof Boolean)) {
                throw incomplete();
            }
            checks.put(criterion.name(), (Boolean) answer);
        }

        Map<?, ?> submittedNotes = request.failNotes();
        if (submittedNotes == null) {
            submittedNotes = Map.of();
        }
        requireKnownKeys(submittedNotes);
        Map<String, String> notes = new LinkedHashMap<>();
        for (TrainingAssessmentCriterion criterion : TrainingAssessmentCriterion.values()) {
            String code = criterion.name();
            Object rawNote = submittedNotes.get(code);
            if (rawNote != null && !(rawNote instanceof String)) {
                throw badRequest("FAIL_NOTE_REQUIRED", "Observation notes, when provided, must contain text.");
            }
            String note = rawNote == null ? null : ((String) rawNote).strip();
            if (note != null && note.length() > MAX_NOTE_LENGTH) {
                throw badRequest("FAIL_NOTE_TOO_LONG", "Keep each observation note within 1,000 characters.");
            }
            if (note != null && !note.isEmpty()) {
                notes.put(code, note);
            }
        }

        return new TrainingAssessmentRequest(CHECKLIST_VERSION,
                Collections.unmodifiableMap(checks), Collections.unmodifiableMap(notes));
    }

    private void requireKnownKeys(Map<?, ?> values) {
        for (Object key : values.keySet()) {
            if (!(key instanceof String) || !CRITERION_CODES.contains(key)) {
                throw badRequest("INVALID_CRITERION_CODE", "Use only the checks in the current health check template.");
            }
        }
    }

    private ApiException incomplete() {
        return badRequest("ASSESSMENT_INCOMPLETE", "Complete all 10 checks before saving.");
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }
}