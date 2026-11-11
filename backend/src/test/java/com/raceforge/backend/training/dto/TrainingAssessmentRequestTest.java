package com.raceforge.backend.training.dto;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.GlobalExceptionHandler;
import com.raceforge.backend.training.controller.TrainingAssessmentRequestBodyAdvice;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import com.raceforge.backend.training.service.TrainingAssessmentValidator;
import jakarta.validation.Valid;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

class TrainingAssessmentRequestTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final TrainingAssessmentValidator validator = new TrainingAssessmentValidator();
    private final TrainingAssessmentRequestBodyAdvice advice = new TrainingAssessmentRequestBodyAdvice();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ParserController())
                .setControllerAdvice(advice, new GlobalExceptionHandler())
                .setMessageConverters(new JacksonJsonHttpMessageConverter(mapper))
                .build();
    }

    @Test
    void acceptsExactlyTenBooleanAnswersAndKeepsMeasurementFields() {
        FixtureRequest request = mapper.readValue("{\"distance\":1.25,\"avgSpeed\":8.5,\"assessment\":"
                + validAssessment() + "}", FixtureRequest.class);
        TrainingAssessmentRequest assessment = validator.validate(request.getAssessment());
        assertEquals(new BigDecimal("1.25"), request.getDistance());
        assertEquals(8.5, request.getAvgSpeed());
        assertEquals(10, assessment.checks().size());
        assertTrue(assessment.checks().values().stream().allMatch(Boolean.TRUE::equals));
        assertTrue(assessment.failNotes().isEmpty());
        assertEquals("POST_TRAINING_V1", assessment.checklistVersion());
    }

    @Test
    void falseAnswerIsPreservedAndNoteIsTrimmedBySharedValidator() {
        String json = validAssessment().replace("\"BALANCE\":true", "\"BALANCE\":false")
                .replace("\"failNotes\":{}", "\"failNotes\":{\"BALANCE\":\"  Uneven steps after exercise.  \"}");
        TrainingAssessmentRequest request = validator.validate(mapper.readValue(json, TrainingAssessmentRequest.class));
        assertFalse(request.checks().get("BALANCE"));
        assertEquals("Uneven steps after exercise.", request.failNotes().get("BALANCE"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "\"true\"", "\"false\"", "0", "1", "1.0", "{}", "[]"})
    void neverCoercesNullStringsNumbersOrContainersToBoolean(String answer) {
        String json = validAssessment().replace("\"TASK_COMPLETION\":true", "\"TASK_COMPLETION\":" + answer);
        assertApi("ASSESSMENT_INCOMPLETE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "1", "true", "[]", "{}"})
    void versionMustBeAString(String version) {
        String json = validAssessment().replace("\"POST_TRAINING_V1\"", version);
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "[]", "\"yes\"", "1", "true"})
    void checksMustBeAnObject(String checks) {
        assertApi("ASSESSMENT_INCOMPLETE", () -> mapper.readValue(
                "{\"checklistVersion\":\"POST_TRAINING_V1\",\"checks\":" + checks + "}",
                TrainingAssessmentRequest.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "[]", "\"note\"", "1", "true"})
    void notesMustBeAnObjectWhenSupplied(String notes) {
        String json = validAssessment().replace("\"failNotes\":{}", "\"failNotes\":" + notes);
        assertApi("FAIL_NOTE_REQUIRED", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "[]", "{}", "1", "false"})
    void noteValuesMustBeText(String note) {
        String json = validAssessment().replace("\"failNotes\":{}", "\"failNotes\":{\"BALANCE\":" + note + "}");
        assertApi("FAIL_NOTE_REQUIRED", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @Test
    void legacyNotesCanBeOmittedWhenThereAreNoConcerns() {
        String json = validAssessment().replace(",\"failNotes\":{}", "");
        assertTrue(validator.validate(mapper.readValue(json, TrainingAssessmentRequest.class)).failNotes().isEmpty());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Observed an unusual gait after exercise."})
    void allConcernAnswersNeedNoIndividualNotesAndPreserveMeasurementsAndOptionalOverallNotes(String overallNotes) {
        String allConcerns = validAssessment().replace(":true", ":false").replace(",\"failNotes\":{}", "");
        FixtureRequest request = mapper.readValue("{\"distance\":1.25,\"avgSpeed\":8.5,\"performanceNotes\":"
                + mapper.writeValueAsString(overallNotes) + ",\"assessment\":" + allConcerns + "}", FixtureRequest.class);
        TrainingAssessmentRequest assessment = validator.validate(request.getAssessment());
        assertEquals(new BigDecimal("1.25"), request.getDistance());
        assertEquals(8.5, request.getAvgSpeed());
        assertEquals(overallNotes, request.getPerformanceNotes());
        assertEquals(10, assessment.checks().size());
        assertTrue(assessment.checks().values().stream().noneMatch(Boolean::booleanValue));
        assertTrue(assessment.failNotes().isEmpty());
    }
    @ParameterizedTest
    @ValueSource(strings = {"ALERTNESS", "COORDINATION", "BREATHING_EFFORT", "GAIT", "LIMB_CONDITION",
            "MUSCLE_COMFORT", "EXTERNAL_INJURY", "SWEATING", "MUCOUS_MEMBRANES", "NASAL_BLEEDING",
            "GUM_MOISTURE", "UNKNOWN", "task_completion", ""})
    void rejectsOldAndUnknownCriterionCodes(String code) {
        String json = validAssessment().replace("\"TASK_COMPLETION\":true", "\"" + code + "\":true");
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @Test
    void rejectsUnknownNoteCriterionEvenIfEveryCheckPassed() {
        String json = validAssessment().replace("\"failNotes\":{}", "\"failNotes\":{\"UNKNOWN\":\"Text\"}");
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"passedCount", "failedCount", "severity", "alertLevel", "reviewStatus", "canStart", "recipientId"})
    void rejectsServerOwnedAndUnknownAssessmentProperties(String field) {
        String json = validAssessment().replaceFirst("\\{", "{\"" + field + "\":0,");
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @Test
    void detectsDuplicateCheckBeforeTheMapCanOverwriteIt() {
        String json = validAssessment().replace("\"TASK_COMPLETION\":true", "\"TASK_COMPLETION\":false,\"TASK_COMPLETION\":true");
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @Test
    void detectsEscapedDuplicateCriterionNames() {
        String json = validAssessment().replace("\"TASK_COMPLETION\":true", "\"TASK_COMPLETION\":true,\"TASK_COMPL\\u0045TION\":true");
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @Test
    void detectsDuplicateNoteBeforeTheMapCanOverwriteIt() {
        String json = validAssessment().replace("\"failNotes\":{}",
                "\"failNotes\":{\"BALANCE\":\"First\",\"BALANCE\":\"Second\"}");
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"checklistVersion\":\"POST_TRAINING_V1\",", "\"checks\":{},", "\"failNotes\":{},"})
    void detectsRepeatedAssessmentProperties(String repeated) {
        String json = "{" + repeated + validAssessment().substring(1);
        assertApi("INVALID_CRITERION_CODE", () -> mapper.readValue(json, TrainingAssessmentRequest.class));
    }

    @Test
    void sharedValidationRejectsMissingVersionChecksOrAnswers() {
        assertApi("INVALID_CRITERION_CODE", () -> validator.validate(mapper.readValue(
                validAssessment().replace("\"checklistVersion\":\"POST_TRAINING_V1\",", ""),
                TrainingAssessmentRequest.class)));
        assertApi("ASSESSMENT_INCOMPLETE", () -> validator.validate(mapper.readValue(
                "{\"checklistVersion\":\"POST_TRAINING_V1\"}", TrainingAssessmentRequest.class)));
        assertApi("ASSESSMENT_INCOMPLETE", () -> validator.validate(mapper.readValue(
                validAssessment().replace("\"TASK_COMPLETION\":true,", ""), TrainingAssessmentRequest.class)));
    }

    @Test
    void directHttpNullAndMissingAssessmentUseStableRequiredCode() throws Exception {
        for (String body : new String[]{"{}", "{\"assessment\":null}"}) {
            mvc.perform(post("/assessment-parser/complete").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.code").value("ASSESSMENT_REQUIRED"));
        }
    }

    @Test
    void httpTypeErrorsKeepTheirSpecificApiCodeThroughTheExistingGlobalHandler() throws Exception {
        String body = "{\"assessment\":" + validAssessment().replace("\"BALANCE\":true", "\"BALANCE\":\"true\"") + "}";
        mvc.perform(post("/assessment-parser/complete").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.code").value("ASSESSMENT_INCOMPLETE"));
    }

    @Test
    void httpDuplicateRootAssessmentCannotOverwriteTheFirstAssessment() throws Exception {
        String body = "{\"assessment\":" + validAssessment() + ",\"assessment\":" + validAssessment() + "}";
        mvc.perform(post("/assessment-parser/complete").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.code").value("INVALID_CRITERION_CODE"));
    }

    @Test
    void attendanceMissedDoesNotRequireAssessmentWhileCompletedDoes() throws Exception {
        mvc.perform(post("/assessment-parser/attendance").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"MISSED\",\"absenceReason\":\"BAD_WEATHER\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("MISSED"));
        mvc.perform(post("/assessment-parser/attendance").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.code").value("ASSESSMENT_REQUIRED"));
    }

    @Test
    void attendanceAlsoRejectsDuplicateRootAssessment() throws Exception {
        mvc.perform(post("/assessment-parser/attendance").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\",\"assessment\":" + validAssessment()
                                + ",\"assessment\":" + validAssessment() + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.code").value("INVALID_CRITERION_CODE"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "[]", "null", "{} {}", "{\"assessment\":{]"})
    void malformedOrMultipleJsonRootsAreRejected(String body) throws Exception {
        mvc.perform(post("/assessment-parser/complete").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    void preflightPreservesTheOriginalBytesAndHeaders() throws Exception {
        byte[] body = ("{ \"assessment\": " + validAssessment() + ", \"performanceNotes\":\"Horse — observed.\" }")
                .getBytes(StandardCharsets.UTF_8);
        MockHttpInputMessage input = new MockHttpInputMessage(body);
        input.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        input.getHeaders().set("X-Assessment-Test", "retained");
        MethodParameter parameter = parameter("complete", FixtureRequest.class);
        HttpInputMessage replay = advice.beforeBodyRead(input, parameter, FixtureRequest.class,
                JacksonJsonHttpMessageConverter.class);
        assertSame(input.getHeaders(), replay.getHeaders());
        assertArrayEquals(body, replay.getBody().readAllBytes());
        assertArrayEquals(body, replay.getBody().readAllBytes());
    }

    @Test
    void adviceOnlyAppliesToCompletionAndAttendanceRequestTypes() throws Exception {
        assertTrue(advice.supports(parameter("complete", FixtureRequest.class), FixtureRequest.class,
                JacksonJsonHttpMessageConverter.class));
        assertTrue(advice.supports(parameter("attendance", FixtureAttendance.class), FixtureAttendance.class,
                JacksonJsonHttpMessageConverter.class));
        assertFalse(advice.supports(parameter("unrelated", OtherRequest.class), OtherRequest.class,
                JacksonJsonHttpMessageConverter.class));
    }

    @Test
    void duplicatePreflightDoesNotChangeTheMapperForUnrelatedRequests() throws Exception {
        mvc.perform(post("/assessment-parser/unrelated").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"metadata\":{\"value\":1,\"value\":2}}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.value").value(2));
    }

    private static String validAssessment() {
        String checks = Stream.of(TrainingAssessmentCriterion.values())
                .map(criterion -> "\"" + criterion.name() + "\":true")
                .collect(Collectors.joining(","));
        return "{\"checklistVersion\":\"POST_TRAINING_V1\",\"checks\":{" + checks + "},\"failNotes\":{}}";
    }

    private static MethodParameter parameter(String methodName, Class<?> requestClass) throws Exception {
        Method method = ParserController.class.getMethod(methodName, requestClass);
        return new MethodParameter(method, 0);
    }

    private static void assertApi(String expectedCode, Executable action) {
        Throwable failure = assertThrows(RuntimeException.class, action);
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ApiException api) {
                assertEquals(expectedCode, api.getCode());
                assertEquals(HttpStatus.BAD_REQUEST, api.getStatus());
                return;
            }
        }
        fail("Expected an ApiException with code " + expectedCode + ", got " + failure, failure);
    }

    public static class FixtureRequest extends CompleteSessionRequest {
        private TrainingAssessmentRequest assessment;
        public TrainingAssessmentRequest getAssessment() { return assessment; }
        public void setAssessment(TrainingAssessmentRequest value) { assessment = value; }
    }

    public static class FixtureAttendance extends AttendSessionRequest {
        private TrainingAssessmentRequest assessment;
        public TrainingAssessmentRequest getAssessment() { return assessment; }
        public void setAssessment(TrainingAssessmentRequest value) { assessment = value; }
    }

    public record OtherRequest(Map<String, Object> metadata) { }

    @RestController
    public static class ParserController {
        private final TrainingAssessmentValidator validator = new TrainingAssessmentValidator();

        @PostMapping("/assessment-parser/complete")
        public Map<String, String> complete(@Valid @RequestBody FixtureRequest request) {
            validator.validate(request.getAssessment());
            return Map.of("status", "COMPLETED");
        }

        @PostMapping("/assessment-parser/attendance")
        public Map<String, String> attendance(@Valid @RequestBody FixtureAttendance request) {
            if ("COMPLETED".equals(request.getStatus())) {
                validator.validate(request.getAssessment());
            }
            return Map.of("status", request.getStatus());
        }

        @PostMapping("/assessment-parser/unrelated")
        public Map<String, Object> unrelated(@RequestBody OtherRequest request) {
            return request.metadata();
        }
    }
}
