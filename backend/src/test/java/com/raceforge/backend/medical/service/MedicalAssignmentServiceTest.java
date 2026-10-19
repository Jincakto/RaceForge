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
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.notification.service.NotificationService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MedicalAssignmentServiceTest {
    private final HorseAssignmentRepository assignments = mock(HorseAssignmentRepository.class);
    private final MedicalRecordRepository medicalRecords = mock(MedicalRecordRepository.class);
    private final HorseRepository horses = mock(HorseRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final MedicalAssignmentService service = new MedicalAssignmentService(
            assignments, medicalRecords, horses, users, profiles, notifications, audit);

    private User user(String id, String roleName) {
        User user = new User();
        Role role = new Role();
        role.setRoleName(roleName);
        user.setUserId(id);
        user.setStatus("ACTIVE");
        user.setFullName("User " + id);
        user.setRole(role);
        when(users.findDetailedById(id)).thenReturn(Optional.of(user));
        return user;
    }

    private Horse horse() {
        Horse horse = new Horse();
        horse.setHorseId("HOR-001");
        horse.setHorseName("Thunder King");
        horse.setAdmissionStatus("PENDING");
        when(horses.findByIdForUpdate("HOR-001")).thenReturn(Optional.of(horse));
        return horse;
    }

    private HorseAssignment task(User vet, String status) {
        HorseAssignment a = new HorseAssignment();
        a.setId(22);
        a.setHorse(horse());
        a.setKind("VET");
        a.setAssignee(vet);
        a.setAssignedBy(user("2", "CLUB_MANAGER"));
        a.setStatus(status);
        when(assignments.findByIdForUpdate(22)).thenReturn(Optional.of(a));
        return a;
    }

    @Test
    void acceptanceDoesNotCreateAMedicalRecord() {
        HorseAssignment a = task(user("7", "VETERINARIAN"), "ASSIGNED");
        service.accept(22, "7");
        assertEquals("ACCEPTED", a.getStatus());
        assertNotNull(a.getRespondedAt());
        verifyNoInteractions(medicalRecords);
    }

    @Test
    void declineRequiresMatchingVetAndReason() {
        HorseAssignment a = task(user("7", "VETERINARIAN"), "ASSIGNED");
        user("8", "VETERINARIAN");
        assertThrows(BusinessRuleException.class, () -> service.decline(22, "8", "Unavailable this week"));
        assertThrows(BusinessRuleException.class, () -> service.decline(22, "7", "short"));
        service.decline(22, "7", "Unavailable this week");
        assertEquals("DECLINED", a.getStatus());
        assertEquals("Unavailable this week", a.getReason());
        verify(notifications).notify(eq("2"), eq("MEDICAL_ASSIGNMENT_DECLINED"), anyString(), anyString());
    }

    @Test
    void acceptedVetCanCompleteWithMedicalRecordReference() {
        user("7", "VETERINARIAN");
        HorseAssignment a = task(user("7", "VETERINARIAN"), "ACCEPTED");
        when(assignments.findFirstByHorse_HorseIdAndAssignee_UserIdAndKindAndStatusOrderByCreatedAtDesc(
                "HOR-001", "7", "VET", "ACCEPTED")).thenReturn(Optional.of(a));
        service.complete("HOR-001", "7", "MED-014");
        assertEquals("COMPLETED", a.getStatus());
        assertEquals("MED-014", a.getMedicalRecordId());
    }

    @Test
    void reassigningCancelsDraftButKeepsConfirmedExam() {
        user("2", "CLUB_MANAGER");
        user("8", "VETERINARIAN");
        horse();
        HorseAssignment previous = task(user("7", "VETERINARIAN"), "ACCEPTED");
        when(assignments.findByHorse_HorseIdAndKindAndStatusIn(
                eq("HOR-001"), eq("VET"), anyList())).thenReturn(List.of(previous));
        when(profiles.findByHorse_HorseId("HOR-001")).thenReturn(Optional.of(new HealthProfile()));
        MedicalRecord draft = new MedicalRecord();
        draft.setStatus("DRAFT");
        when(medicalRecords.findByHealthProfile_Horse_HorseIdAndStatus("HOR-001", "DRAFT"))
                .thenReturn(List.of(draft));
        service.assign("HOR-001", "8", "2");
        assertEquals("REASSIGNED", previous.getStatus());
        assertEquals("CANCELLED", draft.getStatus());
        verify(medicalRecords).saveAll(List.of(draft));
        verify(profiles, never()).saveAndFlush(any(HealthProfile.class));
        verify(assignments).saveAndFlush(argThat(a -> "VET".equals(a.getKind())
                && a.getAssignee().getUserId().equals("8")));
    }

    @Test
    void firstAssignmentCreatesHealthProfileOnlyOnce() {
        user("2", "CLUB_MANAGER");
        user("7", "VETERINARIAN");
        horse();
        when(assignments.findByHorse_HorseIdAndKindAndStatusIn(
                eq("HOR-001"), eq("VET"), anyList())).thenReturn(List.of());
        when(profiles.findByHorse_HorseId("HOR-001")).thenReturn(Optional.empty());
        service.assign("HOR-001", "7", "2");
        verify(profiles).saveAndFlush(any(HealthProfile.class));
    }
}
