package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.mapper.MedicalRecordMapper;
import com.raceforge.backend.medical.repository.*;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MedicalEligibilityConfirmationTest {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
    private final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
    private final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
    private final MedicalVitalSignRepository vitals = mock(MedicalVitalSignRepository.class);
    private final MedicalClinicalExamRepository exams = mock(MedicalClinicalExamRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final MedicalEvaluationService evaluation = mock(MedicalEvaluationService.class);
    private final MedicalRecordMapper mapper = mock(MedicalRecordMapper.class);
    private final TrainingLockService locks = mock(TrainingLockService.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final MedicalAssignmentService assignments = mock(MedicalAssignmentService.class);

    private final MedicalRecordService service = new MedicalRecordService(
            profiles, records, vitals, exams, users, evaluation,
            mapper, locks, audit, assignments, ids);

    private MedicalRecord draft(String selected, String overrideReason,
                                String monitoringNote, String lockReason,
                                MedicalEvaluationResult.EvaluationLevel level) {
        Role role = new Role();
        role.setRoleName("VETERINARIAN");
        User vet = new User();
        vet.setUserId("7");
        vet.setRole(role);
        vet.setStatus("ACTIVE");
        when(users.findDetailedById("7")).thenReturn(Optional.of(vet));

        Horse horse = new Horse();
        horse.setHorseId("HOR-001");
        HealthProfile profile = new HealthProfile();
        profile.setProfileId("HLT-005");
        profile.setHorse(horse);

        MedicalRecord record = new MedicalRecord();
        record.setMedicalRecordId("MED-091");
        record.setHealthProfile(profile);
        record.setVeterinarian(vet);
        record.setExamType("INITIAL");
        record.setStatus("DRAFT");
        record.setFinalConclusion(selected);
        record.setOverrideReason(overrideReason);
        record.setMonitoringNote(monitoringNote);
        record.setTrainingLockReason(lockReason);
        when(records.findById("MED-091")).thenReturn(Optional.of(record));
        when(vitals.findByMedicalRecord_MedicalRecordId("MED-091")).thenReturn(Optional.empty());
        when(exams.findByMedicalRecord_MedicalRecordId("MED-091")).thenReturn(List.of());
        when(evaluation.evaluate(eq("INITIAL"), isNull(), anyList()))
                .thenReturn(new MedicalEvaluationResult(level, "Demo evaluation", "Demo", false));
        return record;
    }

    @Test
    void fitDoesNotLockOrInventReason() {
        MedicalRecord record = draft("FIT", null, null, null,
                MedicalEvaluationResult.EvaluationLevel.NORMAL);
        service.confirmMedicalRecord("MED-091", "7");
        assertEquals(Boolean.TRUE, record.getTrainingEligible());
        assertNull(record.getEligibilityReason());
        assertEquals("CONFIRMED", record.getStatus());
        verifyNoInteractions(locks);
    }

    @Test
    void monitoringUsesMonitoringReasonWithoutLock() {
        MedicalRecord record = draft("FIT_WITH_MONITORING", null,
                "Monitor respiration daily", null,
                MedicalEvaluationResult.EvaluationLevel.WARNING);
        service.confirmMedicalRecord("MED-091", "7");
        assertEquals(Boolean.TRUE, record.getTrainingEligible());
        assertEquals("Monitor respiration daily", record.getEligibilityReason());
        verifyNoInteractions(locks);
    }

    @Test
    void notFitUsesLockReasonAndRequestsLock() {
        MedicalRecord record = draft("NOT_FIT", null, null,
                "Vet confirms training must stop", MedicalEvaluationResult.EvaluationLevel.CRITICAL);
        service.confirmMedicalRecord("MED-091", "7");
        assertEquals(Boolean.FALSE, record.getTrainingEligible());
        assertEquals("Vet confirms training must stop", record.getEligibilityReason());
        verify(locks).lockFromConfirmedExamination(
                eq(record.getHealthProfile().getHorse()), eq(record), eq(record.getVeterinarian()),
                eq("Vet confirms training must stop"));
    }

    @Test
    void fitDifferentFromSuggestionKeepsOverrideExplanation() {
        MedicalRecord record = draft("FIT", "Vet examined this case in detail", null, null,
                MedicalEvaluationResult.EvaluationLevel.CRITICAL);
        service.confirmMedicalRecord("MED-091", "7");
        assertEquals(Boolean.TRUE, record.getTrainingEligible());
        assertEquals("Vet examined this case in detail", record.getEligibilityReason());
        verifyNoInteractions(locks);
    }
}
