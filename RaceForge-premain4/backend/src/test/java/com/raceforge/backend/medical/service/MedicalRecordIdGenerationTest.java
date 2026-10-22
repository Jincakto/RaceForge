package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.dto.MedicalRecordCreateRequest;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.mapper.MedicalRecordMapper;
import com.raceforge.backend.medical.repository.*;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MedicalRecordIdGenerationTest {
    @Test
    void newDraftUsesPrefixedMedicalIdBeforeItIsSaved() {
        HealthProfileRepository profiles = mock(HealthProfileRepository.class);
        MedicalRecordRepository records = mock(MedicalRecordRepository.class);
        MedicalVitalSignRepository vitals = mock(MedicalVitalSignRepository.class);
        MedicalClinicalExamRepository exams = mock(MedicalClinicalExamRepository.class);
        UserRepository users = mock(UserRepository.class);
        MedicalEvaluationService evaluation = mock(MedicalEvaluationService.class);
        MedicalRecordMapper mapper = mock(MedicalRecordMapper.class);
        TrainingLockService locks = mock(TrainingLockService.class);
        AuditLogService audit = mock(AuditLogService.class);
        MedicalAssignmentService assignments = mock(MedicalAssignmentService.class);

        var ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
        when(ids.next("MED")).thenReturn("MED-042");
        Role role = new Role();
        role.setRoleName("VETERINARIAN");
        User vet = new User();
        vet.setUserId("7");
        vet.setStatus("ACTIVE");
        vet.setRole(role);
        when(users.findDetailedById("7")).thenReturn(Optional.of(vet));
        Horse horse = new Horse();
        horse.setHorseId("HOR-001");
        HealthProfile profile = new HealthProfile();
        profile.setProfileId("HLT-005");
        profile.setHorse(horse);
        when(profiles.findById("HLT-005")).thenReturn(Optional.of(profile));
        when(evaluation.evaluate(eq("INITIAL"), isNull(), isNull()))
                .thenReturn(new MedicalEvaluationResult(
                        MedicalEvaluationResult.EvaluationLevel.INCOMPLETE,
                        "Awaiting examination data", null, false));
        when(records.save(any(MedicalRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        MedicalRecordCreateRequest request = new MedicalRecordCreateRequest();
        request.setProfileId("HLT-005");
        request.setVeterinarianId("7");
        request.setExamType("INITIAL");

        service(profiles, records, vitals, exams, users, evaluation, mapper, locks, audit, assignments, ids)
                .createMedicalRecord(request);

        verify(records).save(argThat(record -> "MED-042".equals(record.getMedicalRecordId())));
        verify(assignments).requireAccepted("HOR-001", "7");
    }

    private MedicalRecordService service(HealthProfileRepository profiles,
                                        MedicalRecordRepository records,
                                        MedicalVitalSignRepository vitals,
                                        MedicalClinicalExamRepository exams,
                                        UserRepository users,
                                        MedicalEvaluationService evaluation,
                                        MedicalRecordMapper mapper,
                                        TrainingLockService locks,
                                        AuditLogService audit,
                                        MedicalAssignmentService assignments, com.raceforge.backend.horse.service.ModuleIdAllocator ids) {
        return new MedicalRecordService(profiles, records, vitals, exams, users,
                evaluation, mapper, locks, audit, assignments, ids);
    }
}
