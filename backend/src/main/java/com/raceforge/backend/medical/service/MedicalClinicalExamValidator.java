package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.MedicalClinicalExamRequest;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class MedicalClinicalExamValidator {

    // The eight areas in the current medical-examination UI.
    // Frontend and backend must send the same identifiers, not Vietnamese labels.
    private static final Set<String> REQUIRED_AREAS = Set.of(
            "EYES", "NOSE", "MOUTH", "MOVEMENT_LEGS"
    );
    private static final Set<String> VALID_EXAM_TYPES = Set.of(
            "INITIAL", "PERIODIC", "FOLLOW_UP"
    );
    private static final Set<String> VALID_CONDITIONS = Set.of("NORMAL", "ABNORMAL");
    private static final int MAX_ABNORMAL_NOTES = 200;

    /**
     * @return true if all eight areas are present with valid statuses and notes.
     *         Returns false for incomplete drafts; throws for invalid supplied values.
     */
    public boolean validate(String examType, List<MedicalClinicalExamRequest> exams) {
        String type = normalize(examType);
        if (type == null || !VALID_EXAM_TYPES.contains(type)) {
            throw new IllegalArgumentException("Unsupported or missing examination type: " + examType);
        }
        if (exams == null || exams.isEmpty()) {
            return false;
        }

        boolean complete = true;
        Set<String> submittedAreas = new HashSet<>();
        for (MedicalClinicalExamRequest exam : exams) {
            if (exam == null) {
                complete = false;
                continue;
            }
            String area = normalize(exam.getExaminationArea());
            String condition = normalize(exam.getConditionStatus());
            if (area == null) {
                complete = false;
                continue;
            }
            if (!REQUIRED_AREAS.contains(area)) {
                throw new IllegalArgumentException("Unsupported examination area: " + area);
            }
            if (!submittedAreas.add(area)) {
                throw new IllegalArgumentException("Duplicate examination area: " + area);
            }
            if (condition == null) {
                complete = false;
                continue;
            }
            if (!VALID_CONDITIONS.contains(condition)) {
                throw new IllegalArgumentException("Unsupported condition status: " + condition);
            }
            if ("ABNORMAL".equals(condition)) {
                String notes = exam.getNotes();
                if (notes == null || notes.isBlank()) {
                    complete = false;
                } else if (notes.trim().length() > MAX_ABNORMAL_NOTES) {
                    throw new IllegalArgumentException(
                            "Abnormal description exceeds " + MAX_ABNORMAL_NOTES + " characters: " + area);
                }
            }
        }
        return complete && submittedAreas.containsAll(REQUIRED_AREAS);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
