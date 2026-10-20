package com.raceforge.backend.medical.dto;

import com.raceforge.backend.horse.entity.HorseAssignment;
import java.time.LocalDateTime;

/** Fields map to Horse_Assignment, not to the removed Medical_Assignment table. */
public record MedicalAssignmentResponse(
        String assignmentId,
        String horseId,
        String horseName,
        String veterinarianId,
        String veterinarianName,
        String assignedBy,
        String status,
        String reason,
        LocalDateTime createdAt,
        LocalDateTime respondedAt,
        String medicalRecordId
) {
    public static MedicalAssignmentResponse from(HorseAssignment a) {
        return new MedicalAssignmentResponse(
                a.getId(), a.getHorse().getHorseId(), a.getHorse().getHorseName(),
                a.getAssignee().getUserId(), a.getAssignee().getFullName(),
                a.getAssignedBy().getUserId(), a.getStatus(), a.getReason(),
                a.getCreatedAt(), a.getRespondedAt(), a.getMedicalRecordId());
    }
}
