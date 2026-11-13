package com.raceforge.backend.training.dto;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/** Strict parsing is local to assessment input; other application JSON is unchanged. */
public class TrainingAssessmentRequestDeserializer extends ValueDeserializer<TrainingAssessmentRequest> {
    private static final Set<String> CRITERION_CODES = Stream.of(TrainingAssessmentCriterion.values())
            .map(Enum::name).collect(Collectors.toUnmodifiableSet());

    @Override
    public TrainingAssessmentRequest deserialize(JsonParser parser, DeserializationContext context) {
        if (parser.currentToken() != JsonToken.START_OBJECT) {
            throw badRequest("ASSESSMENT_INCOMPLETE", "Complete the post-training health check using the current template.");
        }
        String version = null;
        Map<String, Boolean> checks = null;
        Map<String, String> notes = Map.of();
        Set<String> fields = new HashSet<>();
        while (parser.nextToken() != JsonToken.END_OBJECT) {
            if (parser.currentToken() != JsonToken.PROPERTY_NAME) {
                throw badRequest("ASSESSMENT_INCOMPLETE", "The post-training health check is not a valid JSON object.");
            }
            String field = parser.currentName();
            if (!fields.add(field)) {
                throw duplicate();
            }
            parser.nextToken();
            switch (field) {
                case "checklistVersion" -> {
                    if (parser.currentToken() != JsonToken.VALUE_STRING) {
                        throw badRequest("INVALID_CRITERION_CODE", "Use the current post-training health check template.");
                    }
                    version = parser.getString();
                }
                case "checks" -> checks = readChecks(parser);
                case "failNotes" -> notes = readNotes(parser);
                default -> throw badRequest("INVALID_CRITERION_CODE",
                        "Only the checklist version, checks and optional legacy observation notes may be submitted in the health check.");
            }
        }
        // Required keys, version, all ten answers and any provided legacy note content are validated by the shared validator.
        return new TrainingAssessmentRequest(version, checks, notes);
    }

    private Map<String, Boolean> readChecks(JsonParser parser) {
        if (parser.currentToken() != JsonToken.START_OBJECT) {
            throw incomplete();
        }
        Map<String, Boolean> checks = new LinkedHashMap<>();
        while (parser.nextToken() != JsonToken.END_OBJECT) {
            if (parser.currentToken() != JsonToken.PROPERTY_NAME) {
                throw incomplete();
            }
            String code = parser.currentName();
            requireKnownCriterion(code);
            if (checks.containsKey(code)) {
                throw duplicate();
            }
            JsonToken answer = parser.nextToken();
            if (answer != JsonToken.VALUE_TRUE && answer != JsonToken.VALUE_FALSE) {
                throw incomplete();
            }
            checks.put(code, answer == JsonToken.VALUE_TRUE);
        }
        return checks;
    }

    private Map<String, String> readNotes(JsonParser parser) {
        if (parser.currentToken() != JsonToken.START_OBJECT) {
            throw badRequest("FAIL_NOTE_REQUIRED", "Enter observation notes as text for the relevant checks.");
        }
        Map<String, String> notes = new LinkedHashMap<>();
        while (parser.nextToken() != JsonToken.END_OBJECT) {
            if (parser.currentToken() != JsonToken.PROPERTY_NAME) {
                throw badRequest("FAIL_NOTE_REQUIRED", "Observation notes, when provided, must contain text.");
            }
            String code = parser.currentName();
            requireKnownCriterion(code);
            if (notes.containsKey(code)) {
                throw duplicate();
            }
            if (parser.nextToken() != JsonToken.VALUE_STRING) {
                throw badRequest("FAIL_NOTE_REQUIRED", "Observation notes, when provided, must contain text.");
            }
            notes.put(code, parser.getString());
        }
        return notes;
    }

    private void requireKnownCriterion(String code) {
        if (!CRITERION_CODES.contains(code)) {
            throw badRequest("INVALID_CRITERION_CODE", "Use only the checks in the current health check template.");
        }
    }

    private ApiException duplicate() {
        return badRequest("INVALID_CRITERION_CODE", "Submit each health check field only once.");
    }

    private ApiException incomplete() {
        return badRequest("ASSESSMENT_INCOMPLETE", "Answer all 10 checks with Pass or Concern observed before saving.");
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }
}
