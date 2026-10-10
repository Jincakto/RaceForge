
package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.MedicalClinicalExamRequest;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class MedicalClinicalExamValidator {

    private static final Set<String> REQUIRED_AREAS = Set.of(
            "LEGS",
            "EYES",
            "RESPIRATORY",
            "SKIN",
            "MOVEMENT",
            "GENERAL_CONDITION"
    );

    private static final Set<String> VALID_CONDITIONS = Set.of(
            "NORMAL",
            "ABNORMAL",
            "CRITICAL"
    );

    private static final Set<String> VALID_SEVERITIES = Set.of(
            "MILD",
            "MODERATE",
            "SEVERE",
            "CRITICAL"
    );

    public boolean validate(
            String examType,
            List<MedicalClinicalExamRequest> exams) {

        if (exams == null || exams.isEmpty()) {
            return false;
        }

        boolean complete = true;
        Set<String> submittedAreas = new HashSet<>();

        for (MedicalClinicalExamRequest exam : exams) {

            if (exam == null
                    || isBlank(exam.getExaminationArea())
                    || isBlank(exam.getConditionStatus())) {
                complete = false;
                continue;
            }

            String area = normalize(exam.getExaminationArea());
            String condition = normalize(exam.getConditionStatus());

            if (!submittedAreas.add(area)) {
                throw new IllegalArgumentException(
                        "Duplicate examination area: " + area
                );
            }

            if (!VALID_CONDITIONS.contains(condition)) {
                throw new IllegalArgumentException(
                        "Invalid condition status: " + condition
                );
            }

            String severity = isBlank(exam.getSeverity())
                    ? ""
                    : normalize(exam.getSeverity());

            if ("NORMAL".equals(condition)) {
                if (!severity.isEmpty()) {
                    throw new IllegalArgumentException(
                            "NORMAL must not have severity: " + area
                    );
                }
            } else {
                if (severity.isEmpty()) {
                    complete = false;
                    continue;
                }

                if (!VALID_SEVERITIES.contains(severity)) {
                    throw new IllegalArgumentException(
                            "Invalid severity: " + severity
                    );
                }

                if ("CRITICAL".equals(condition)
                        && !Set.of("SEVERE", "CRITICAL")
                                .contains(severity)) {
                    throw new IllegalArgumentException(
                            "CRITICAL requires SEVERE or CRITICAL: " + area
                    );
                }
            }
        }

        if ("INITIAL".equalsIgnoreCase(examType)) {
            complete = complete
                    && submittedAreas.containsAll(REQUIRED_AREAS);
        }

        return complete;
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
