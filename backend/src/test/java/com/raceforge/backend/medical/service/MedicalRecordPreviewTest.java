package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.medical.dto.MedicalEvaluationPreviewRequest;
import com.raceforge.backend.medical.dto.MedicalRecordUpdateRequest;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.mapper.MedicalRecordMapper;
import com.raceforge.backend.medical.repository.*;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MedicalRecordPreviewTest {

    private final com.raceforge.backend.horse.service.ModuleIdAllocator ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
    private final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
    private final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
    private final MedicalVitalSignRepository vitals = mock(MedicalVitalSignRepository.class);
    private final MedicalClinicalExamRepository exams = mock(MedicalClinicalExamRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final MedicalEvaluationService evaluation = mock(MedicalEvaluationService.class);
    private final MedicalRecordMapper mapper = mock(MedicalRecordMapper.class);
    private final TrainingLockService trainingLocks = mock(TrainingLockService.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final MedicalAssignmentService assignments = mock(MedicalAssignmentService.class);

    private final MedicalRecordService service = new MedicalRecordService(
            profiles, records, vitals, exams, users, evaluation,
            mapper, trainingLocks, audit, assignments, ids);

    private void activeVet(String id) {
        Role role = new Role();
        role.setRoleName("VETERINARIAN");
        User user = new User();
        user.setUserId(id);
        user.setRole(role);
        user.setStatus("ACTIVE");
        when(users.findDetailedById(id)).thenReturn(Optional.of(user));
    }

    @Test
    void previewReturnsSuggestionWithoutSavingOrTrainingLock() {
        activeVet("7");
        var request = new MedicalEvaluationPreviewRequest("INITIAL", null, List.of());
        when(evaluation.evaluate(eq("INITIAL"), isNull(), anyList()))
                .thenReturn(new MedicalEvaluationResult(
                        MedicalEvaluationResult.EvaluationLevel.CRITICAL,
                        "Resting respiratory rate is high", "TRAINING_LOCK", true));

        var response = service.previewEvaluation("HOR-001", "7", request);

        assertEquals("CRITICAL", response.level());
        assertEquals("NOT_FIT", response.suggestedConclusion());
        assertTrue(response.suggestedLock());
        verify(assignments).requireAccepted("HOR-001", "7");
        verifyNoInteractions(records, vitals, exams, trainingLocks, audit);
    }

    @Test
    void cancelledDraftCannotBeEditedOrConfirmed() {
        activeVet("7");
        MedicalRecord cancelled = new MedicalRecord();
        cancelled.setMedicalRecordId("MED-091");
        cancelled.setStatus("CANCELLED");
        when(records.findById("MED-091")).thenReturn(Optional.of(cancelled));

        assertThrows(BusinessRuleException.class,
                () -> service.updateMedicalDraft("MED-091", "7", new MedicalRecordUpdateRequest()));
        assertThrows(BusinessRuleException.class,
                () -> service.confirmMedicalRecord("MED-091", "7"));
        verifyNoInteractions(assignments, trainingLocks);
    }

    @Test
    void previewDoesNotBypassAssignmentAcceptance() {
        activeVet("7");
        doThrow(new BusinessRuleException("Assignment not accepted"))
                .when(assignments).requireAccepted("HOR-001", "7");

        assertThrows(BusinessRuleException.class,
                () -> service.previewEvaluation("HOR-001", "7",
                        new MedicalEvaluationPreviewRequest("INITIAL", null, List.of())));
        verifyNoInteractions(evaluation, records, trainingLocks);
    }
}
