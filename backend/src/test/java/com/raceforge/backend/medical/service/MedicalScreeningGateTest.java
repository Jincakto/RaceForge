package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseAssignment;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.service.ModuleIdAllocator;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.training.service.TrainingAssessmentNotificationService;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MedicalScreeningGateTest {
    private final HorseRepository horses = mock(HorseRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final HorseAssignmentRepository assignments = mock(HorseAssignmentRepository.class);
    private final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
    private final MedicalAssignmentService service = new MedicalAssignmentService(assignments, records,
            horses, users, mock(HealthProfileRepository.class), mock(NotificationService.class),
            mock(AuditLogService.class), mock(ModuleIdAllocator.class), mock(TrainingAssessmentNotificationService.class));

    private User user(String id, String roleName) {
        Role role = new Role(); role.setRoleName(roleName);
        User user = new User(); user.setUserId(id); user.setStatus("ACTIVE"); user.setRole(role);
        when(users.findDetailedById(id)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void directAssignmentIsBlockedBeforeScreening() {
        user("1", "CLUB_MANAGER"); user("2", "VETERINARIAN");
        Horse horse = new Horse(); horse.setAdmissionStatus("PENDING");
        when(horses.findByIdForUpdate("HOR-001")).thenReturn(Optional.of(horse));
        assertThrows(BusinessRuleException.class, () -> service.assign("HOR-001", "2", "1"));
        verifyNoInteractions(assignments, records);
    }

    @Test
    void existingAssignmentDoesNotBypassScreeningOrReturnedProfile() {
        Horse horse = new Horse(); horse.setAdmissionStatus("PENDING");
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
        assertThrows(BusinessRuleException.class, () -> service.requireAccepted("HOR-001", "2"));
        horse.getAdmission().setScreeningStatus("NEEDS_CORRECTION"); horse.setAdmissionStatus("NOT_SUBMITTED");
        assertThrows(BusinessRuleException.class, () -> service.requireAccepted("HOR-001", "2"));
        verifyNoInteractions(assignments);
    }

    @Test
    void acceptedVetCanExamineScreenedPendingOrLegacyApprovedHorse() {
        Horse horse = new Horse(); horse.setAdmissionStatus("PENDING");
        horse.getAdmission().setScreeningStatus("PASSED");
        User vet = user("2", "VETERINARIAN");
        HorseAssignment assignment = new HorseAssignment(); assignment.setAssignee(vet); assignment.setStatus("ACCEPTED");
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-001", "VET"))
                .thenReturn(Optional.of(assignment));
        assertDoesNotThrow(() -> service.requireAccepted("HOR-001", "2"));
        horse.setAdmissionStatus("APPROVED"); horse.getAdmission().resetScreening();
        assertDoesNotThrow(() -> service.requireAccepted("HOR-001", "2"));
    }
}
