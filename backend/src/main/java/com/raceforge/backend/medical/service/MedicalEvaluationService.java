package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.MedicalClinicalExamRequest;
import com.raceforge.backend.medical.dto.MedicalVitalSignRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

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
        boolean warning = false;
        boolean critical = false;
        boolean incomplete = !clinicalExamValidator.validate(examType, clinicalExams);

        if (incomplete) {
            findings.add("Clinical examination is incomplete.");
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
                requirePositive(temperature, "Body temperature");
                if (temperature.compareTo(MedicalReferenceRange.CRITICAL_HIGH_TEMPERATURE) >= 0) {
                    critical = true;
                    findings.add("Temperature greatly exceeds the configured reference range.");
                } else if (temperature.compareTo(MedicalReferenceRange.MIN_NORMAL_TEMPERATURE) < 0
                        || temperature.compareTo(MedicalReferenceRange.MAX_NORMAL_TEMPERATURE) > 0) {
                    warning = true;
                    findings.add("Temperature is outside the configured reference range.");
                }
            }

            if (heartRate == null) {
                incomplete = true;
                findings.add("Resting heart rate is missing.");
            } else {
                requirePositive(heartRate, "Resting heart rate");
                if (heartRate > MedicalReferenceRange.CRITICAL_HIGH_HEART_RATE) {
                    critical = true;
                    findings.add("Resting heart rate greatly exceeds the configured reference range.");
                } else if (heartRate < MedicalReferenceRange.MIN_NORMAL_HEART_RATE
                        || heartRate > MedicalReferenceRange.MAX_NORMAL_HEART_RATE) {
                    warning = true;
                    findings.add("Resting heart rate is outside the configured reference range.");
                }
            }

            if (respiratoryRate == null) {
                incomplete = true;
                findings.add("Resting respiratory rate is missing.");
            } else {
                requirePositive(respiratoryRate, "Resting respiratory rate");
                if (respiratoryRate >= MedicalReferenceRange.CRITICAL_HIGH_RESPIRATORY_RATE) {
                    critical = true;
                    findings.add("Resting respiratory rate greatly exceeds the configured reference range.");
                } else if (respiratoryRate < MedicalReferenceRange.MIN_NORMAL_RESPIRATORY_RATE
                        || respiratoryRate > MedicalReferenceRange.MAX_NORMAL_RESPIRATORY_RATE) {
                    warning = true;
                    findings.add("Resting respiratory rate is outside the configured reference range.");
                }
            }

            if (vitalSign.getWeight() != null) {
                requirePositive(vitalSign.getWeight(), "Weight");
            }
        }

        if (clinicalExams != null) {
            for (MedicalClinicalExamRequest exam : clinicalExams) {
                if (exam != null && "ABNORMAL".equalsIgnoreCase(exam.getConditionStatus())) {
                    // Binary clinical status cannot establish severity or prove an injury.
                    warning = true;
                    findings.add("Clinical abnormality in " + exam.getExaminationArea() + ".");
                }
            }
        }

        EvaluationLevel level = incomplete ? EvaluationLevel.INCOMPLETE
                : critical ? EvaluationLevel.CRITICAL
                : warning ? EvaluationLevel.WARNING
                : EvaluationLevel.NORMAL;
        String trainingNote = switch (level) {
            case NORMAL -> "ALLOW_TRAINING";
            case WARNING -> "ALLOW_WITH_CAUTION";
            case CRITICAL -> "TRAINING_LOCK";  
            case INCOMPLETE -> "EVALUATION_INCOMPLETE";
        };
        return new MedicalEvaluationResult(
                level,
                findings.isEmpty() ? "All entered indicators are within the configured reference ranges."
                        : String.join(" ", findings),
                trainingNote,
                level == EvaluationLevel.CRITICAL
        );
    }

    private void requirePositive(BigDecimal value, String label) {
        if (value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(label + " must be positive.");
        }
    }

    private void requirePositive(Integer value, String label) {
        if (value <= 0) {
            throw new IllegalArgumentException(label + " must be positive.");
        }
    }
}
