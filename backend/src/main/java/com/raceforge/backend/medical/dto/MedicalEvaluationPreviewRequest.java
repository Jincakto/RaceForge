package com.raceforge.backend.medical.dto;

import java.util.List;

/** Input for a non-persisting medical recommendation preview. */
public record MedicalEvaluationPreviewRequest(
        String examType,
        MedicalVitalSignRequest vitalSign,
        List<MedicalClinicalExamRequest> clinicalExams
) {}
