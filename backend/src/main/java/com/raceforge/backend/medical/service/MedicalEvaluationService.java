package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.MedicalVitalSignRequest;
import com.raceforge.backend.medical.dto.MedicalClinicalExamRequest;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicalEvaluationService {

    public MedicalEvaluationResult evaluate(
            MedicalVitalSignRequest vitalSign,
            List<MedicalClinicalExamRequest> clinicalExams) {

        StringBuilder systemNote = new StringBuilder();

        boolean abnormalDetected = false;
        boolean severeDetected = false;

        if (vitalSign != null) {

            if (vitalSign.getBodyTemperature() != null) {
                systemNote.append(
                        "Body temperature recorded: "
                ).append(vitalSign.getBodyTemperature())
                 .append(". ");
            }

            if (vitalSign.getRestingHeartRate() != null) {
                systemNote.append(
                        "Resting heart rate recorded: "
                ).append(vitalSign.getRestingHeartRate())
                 .append(". ");
            }

            if (vitalSign.getRestingRespiratoryRate() != null) {
                systemNote.append(
                        "Resting respiratory rate recorded: "
                ).append(vitalSign.getRestingRespiratoryRate())
                 .append(". ");
            }
        }

        if (clinicalExams != null) {

            for (MedicalClinicalExamRequest exam : clinicalExams) {

                if ("ABNORMAL".equalsIgnoreCase(
                        exam.getConditionStatus())) {

                    abnormalDetected = true;

                    systemNote.append(
                            "Abnormal condition detected in "
                    ).append(exam.getExaminationArea())
                     .append(". ");

                    if ("SEVERE".equalsIgnoreCase(
                            exam.getSeverity())) {

                        severeDetected = true;
                    }
                }
            }
        }

        String trainingNote;
        boolean suggestedLock = false;

        if (severeDetected) {

            suggestedLock = true;

            trainingNote =
                    "Training lock is recommended. "
                    + "Veterinarian confirmation is required.";

        } else if (abnormalDetected) {

            trainingNote =
                    "Medical review is recommended before training.";

        } else {

            trainingNote =
                    "No abnormal clinical condition was reported. "
                    + "Veterinarian review is still required.";
        }

        if (systemNote.length() == 0) {
            systemNote.append(
                    "No medical examination data was provided."
            );
        }

        return new MedicalEvaluationResult(
                systemNote.toString(),
                trainingNote,
                suggestedLock
        );
    }
}
