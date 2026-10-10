package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.MedicalClinicalExamRequest;
import com.raceforge.backend.medical.dto.MedicalVitalSignRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.raceforge.backend.medical.service.MedicalEvaluationResult.EvaluationLevel;

@Service
public class MedicalEvaluationService {
    private final MedicalClinicalExamValidator clinicalExamValidator;

    public MedicalEvaluationService(MedicalClinicalExamValidator clinicalExamValidator) {
        this.clinicalExamValidator = clinicalExamValidator;
    }

    public MedicalEvaluationResult evaluate(String examType,
                                            MedicalVitalSignRequest vitalSign,
                                            List<MedicalClinicalExamRequest> clinicalExams) {
        List<String> findings = new ArrayList<>();
        boolean hasWarning = false;
        boolean hasCritical = false;
        boolean incomplete = false;

        boolean clinicalComplete = clinicalExamValidator.validate(examType, clinicalExams);
        if (!clinicalComplete) {
            incomplete = true;
            findings.add("Clinical examination data is incomplete.");
        }

        if (vitalSign == null) {
            incomplete = true;
            findings.add("Vital signs are missing.");
        } else {
            BigDecimal temperature = vitalSign.getBodyTemperature();
            Integer heartRate = vitalSign.getRestingHeartRate();
            Integer respiratoryRate = vitalSign.getRestingRespiratoryRate();

            if (temperature == null) {
                incomplete = true;
                findings.add("Body temperature is missing.");
            } else {
                if (temperature.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("Body temperature must be positive.");
                }
                if (temperature.compareTo(MedicalReferenceRange.CRITICAL_HIGH_TEMPERATURE) >= 0) {
                    hasCritical = true;
                    findings.add("Critical high temperature alert.");
                } else if (temperature.compareTo(MedicalReferenceRange.MIN_NORMAL_TEMPERATURE) < 0
                        || temperature.compareTo(MedicalReferenceRange.MAX_NORMAL_TEMPERATURE) > 0) {
                    hasWarning = true;
                    findings.add("Temperature outside normal range.");
                }
            }

            if (heartRate == null) {
                incomplete = true;
                findings.add("Resting heart rate is missing.");
            } else {
                if (heartRate <= 0) {
                    throw new IllegalArgumentException("Resting heart rate must be positive.");
                }
                if (heartRate > MedicalReferenceRange.CRITICAL_HIGH_HEART_RATE) {
                    hasCritical = true;
                    findings.add("Critical high resting heart rate alert.");
                } else if (heartRate < MedicalReferenceRange.MIN_NORMAL_HEART_RATE
                        || heartRate > MedicalReferenceRange.MAX_NORMAL_HEART_RATE) {
                    hasWarning = true;
                    findings.add("Heart rate outside normal range.");
                }
            }

            if (respiratoryRate == null) {
                incomplete = true;
                findings.add("Resting respiratory rate is missing.");
            } else {
                if (respiratoryRate <= 0) {
                    throw new IllegalArgumentException("Respiratory rate must be positive.");
                }
                if (respiratoryRate < MedicalReferenceRange.MIN_NORMAL_RESPIRATORY_RATE
                        || respiratoryRate > MedicalReferenceRange.MAX_NORMAL_RESPIRATORY_RATE) {
                    hasWarning = true;
                    findings.add("Respiratory rate outside normal range.");
                }
            }
        }

        if (clinicalExams != null) {
            for (MedicalClinicalExamRequest exam : clinicalExams) {
                if (exam == null || isBlank(exam.getExaminationArea())
                        || isBlank(exam.getConditionStatus())) {
                    continue;
                }
                String condition = normalize(exam.getConditionStatus());
                String severity = isBlank(exam.getSeverity()) ? "" : normalize(exam.getSeverity());
                String area = normalize(exam.getExaminationArea());
                if ("CRITICAL".equals(condition)
                        || "SEVERE".equals(severity) || "CRITICAL".equals(severity)) {
                    hasCritical = true;
                    findings.add("Critical clinical finding in " + area + ".");
                } else if ("ABNORMAL".equals(condition)
                        && ("MILD".equals(severity) || "MODERATE".equals(severity))) {
                    hasWarning = true;
                    findings.add("Abnormal clinical finding in " + area + ".");
                }
            }
        }

        EvaluationLevel level;
        if (hasCritical) {
            level = EvaluationLevel.CRITICAL;
        } else if (incomplete) {
            level = EvaluationLevel.INCOMPLETE;
        } else if (hasWarning) {
            level = EvaluationLevel.WARNING;
        } else {
            level = EvaluationLevel.NORMAL;
        }

        String type = normalize(examType);
        String trainingNote;
        if ("FOLLOW_UP".equals(type)) {
            trainingNote = switch (level) {
                case NORMAL -> "FOLLOW_UP_NORMAL_REVIEW_REQUIRED";
                case WARNING -> "FOLLOW_UP_CAUTION_REVIEW_REQUIRED";
                case CRITICAL -> "TRAINING_LOCK";
                case INCOMPLETE -> "EVALUATION_INCOMPLETE";
            };
        } else {
            trainingNote = switch (level) {
                case NORMAL -> "ALLOW_TRAINING";
                case WARNING -> "ALLOW_WITH_CAUTION";
                case CRITICAL -> "TRAINING_LOCK";
                case INCOMPLETE -> "EVALUATION_INCOMPLETE";
            };
        }
        String systemNote = findings.isEmpty()
                ? "All evaluated indicators are within normal range."
                : String.join(" ", findings);
        return new MedicalEvaluationResult(
                level, systemNote, trainingNote, level == EvaluationLevel.CRITICAL);
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
