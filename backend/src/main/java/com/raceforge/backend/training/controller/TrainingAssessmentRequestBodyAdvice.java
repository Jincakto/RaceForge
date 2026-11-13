package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.training.dto.CompleteSessionRequest;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Type;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.Set;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.json.JsonMapper;

/** Prevent duplicate root assessment fields from being overwritten before DTO validation. */
@RestControllerAdvice
public class TrainingAssessmentRequestBodyAdvice extends RequestBodyAdviceAdapter {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Override
    public boolean supports(MethodParameter parameter, Type targetType,
            Class<? extends HttpMessageConverter<?>> converterType) {
        return CompleteSessionRequest.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public HttpInputMessage beforeBodyRead(HttpInputMessage inputMessage, MethodParameter parameter,
            Type targetType, Class<? extends HttpMessageConverter<?>> converterType) throws IOException {
        byte[] body = inputMessage.getBody().readAllBytes();
        validateJson(body);
        return new HttpInputMessage() {
            @Override
            public InputStream getBody() {
                return new ByteArrayInputStream(body);
            }

            @Override
            public HttpHeaders getHeaders() {
                return inputMessage.getHeaders();
            }
        };
    }

    private void validateJson(byte[] body) {
        try (JsonParser parser = JSON.createParser(body)) {
            if (parser.nextToken() != JsonToken.START_OBJECT) {
                throw invalidJson();
            }
            Deque<Set<String>> objectFields = new ArrayDeque<>();
            objectFields.push(new HashSet<>());
            while (parser.nextToken() != null) {
                JsonToken token = parser.currentToken();
                if (token == JsonToken.START_OBJECT) {
                    objectFields.push(new HashSet<>());
                } else if (token == JsonToken.PROPERTY_NAME) {
                    if (!objectFields.peek().add(parser.currentName())) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CRITERION_CODE",
                                "Submit each JSON field only once.");
                    }
                } else if (token == JsonToken.END_OBJECT) {
                    objectFields.pop();
                    if (objectFields.isEmpty()) {
                        if (parser.nextToken() != null) {
                            throw invalidJson();
                        }
                        return;
                    }
                }
            }
            throw invalidJson();
        } catch (JacksonException exception) {
            throw invalidJson();
        }
    }

    private ApiException invalidJson() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST_BODY",
                "Request body is missing or invalid. Check JSON syntax, field types and date formats.");
    }
}
