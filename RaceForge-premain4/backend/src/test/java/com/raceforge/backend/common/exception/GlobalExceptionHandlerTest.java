package com.raceforge.backend.common.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

class GlobalExceptionHandlerTest {
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void malformedJsonAndWrongFieldTypesReturn400() throws Exception {
        for (String body : new String[]{"{", "{\"name\":\"a\",\"count\":\"abc\"}"}) {
            mvc.perform(post("/test").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.code").value("INVALID_REQUEST_BODY"));
        }
    }

    @Test
    void validationIdentifiesField() throws Exception {
        mvc.perform(post("/test").contentType("application/json").content("{\"name\":\"\",\"count\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.validationErrors.name").exists());
    }

    @Test
    void parameterAndMissingParameterReturn400() throws Exception {
        mvc.perform(get("/test/number").param("id", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.code").value("INVALID_PARAMETER_TYPE"));
        mvc.perform(get("/test/number"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void methodAndMediaErrorsKeepProtocolStatus() throws Exception {
        mvc.perform(put("/test"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().exists("Allow"));
        mvc.perform(post("/test").contentType("text/plain").content("hello"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void explicitHttpAndBusinessErrorsArePreserved() throws Exception {
        mvc.perform(get("/test/error/http"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication is required"));
        mvc.perform(get("/test/error/business"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already exists"));
    }

    @Test
    void infrastructureFailuresHaveSpecificCodesAndDoNotExposeRawCause() throws Exception {
        Object[][] cases = {
                {"smtp-auth", 503, "MAIL_AUTHENTICATION_FAILED"},
                {"smtp-send", 503, "EMAIL_DELIVERY_FAILED"},
                {"db-connect", 503, "DATABASE_UNAVAILABLE"},
                {"db-constraint", 409, "DATA_CONSTRAINT_VIOLATION"},
                {"hibernate", 500, "PERSISTENCE_STATE_ERROR"},
                {"unknown", 500, "INTERNAL_SERVER_ERROR"}
        };
        for (Object[] testCase : cases) {
            mvc.perform(get("/test/error/" + testCase[0]))
                    .andExpect(status().is((Integer) testCase[1]))
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.code").value(testCase[2]))
                    .andExpect(jsonPath("$.data.errorId").isNotEmpty())
                    .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("sensitive-detail"))));
        }
    }

    @RestController
    static class TestController {
        record Body(@NotBlank String name, int count) {}

        @PostMapping("/test")
        Body post(@Valid @RequestBody Body body) { return body; }

        @GetMapping("/test/number")
        int number(@RequestParam int id) { return id; }

        @GetMapping("/test/error/{kind}")
        void error(@PathVariable String kind) {
            throw switch (kind) {
                case "http" -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
                case "business" -> new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email already exists");
                case "smtp-auth" -> new MailAuthenticationException("sensitive-detail");
                case "smtp-send" -> new MailSendException("sensitive-detail");
                case "db-connect" -> new DataAccessResourceFailureException("sensitive-detail");
                case "db-constraint" -> new DataIntegrityViolationException("sensitive-detail");
                case "hibernate" -> new RuntimeException(new org.hibernate.AssertionFailure("sensitive-detail"));
                default -> new NullPointerException("sensitive-detail");
            };
        }
    }
}
