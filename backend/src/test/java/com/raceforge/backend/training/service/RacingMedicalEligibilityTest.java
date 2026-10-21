package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.repository.*;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RacingMedicalEligibilityTest {
    private final MedicalRecordRepository records=mock(MedicalRecordRepository.class);
    private final MedicalVitalSignRepository vitals=mock(MedicalVitalSignRepository.class);
    private final MedicalClinicalExamRepository exams=mock(MedicalClinicalExamRepository.class);
    private final TrainingMedicalReader reader=new TrainingMedicalReader(records,vitals,exams);
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final TrainingWorkflowGuard guard=new TrainingWorkflowGuard(jdbc,mock(HorsePackageRepository.class));
    private Horse horse;
    private MedicalRecord record;
    private MedicalVitalSign vital;

    @BeforeEach void setup() {
        ReflectionTestUtils.setField(guard,"medicalReader",reader);
        horse=new Horse();horse.setHorseId("HOR-001");
        horse.setAdmissionStatus("APPROVED");horse.setStatus("ACTIVE");
        horse.setHealthStatus("READY");horse.setTrainingLocked(false);
        record=record("MED-002",LocalDateTime.of(2026,10,22,9,0));
        vital=new MedicalVitalSign();vital.setBodyTemperature(new BigDecimal("38.0"));
        vital.setRestingHeartRate(36);vital.setRestingRespiratoryRate(14);
        when(records.findByHealthProfile_Horse_HorseIdAndStatus("HOR-001","CONFIRMED"))
                .thenReturn(List.of(record));
        when(vitals.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(Optional.of(vital));
        when(exams.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(List.of(movement("NORMAL")));
        when(jdbc.queryForObject(anyString(),eq(Integer.class),eq("HOR-001"))).thenReturn(0);
    }
    private MedicalRecord record(String id,LocalDateTime time) {
        MedicalRecord r=new MedicalRecord();r.setMedicalRecordId(id);r.setExaminedAt(time);
        r.setConfirmedAt(time);r.setStatus("CONFIRMED");r.setFinalConclusion("FIT");r.setTrainingEligible(true);return r;
    }
    private MedicalClinicalExam movement(String status) {
        MedicalClinicalExam e=new MedicalClinicalExam();e.setExaminationArea("MOVEMENT_LEGS");e.setConditionStatus(status);return e;
    }
    private void rejected(String message) {
        assertTrue(assertThrows(BusinessRuleException.class,()->guard.requireRacingEligible(horse)).getMessage().contains(message));
    }
    @Test void fitCompleteNormalRecordQualifies() {
        assertDoesNotThrow(()->guard.requireRacingEligible(horse));
    }
    @ParameterizedTest @ValueSource(strings={"FIT_WITH_MONITORING","NOT_FIT"})
    void otherConclusionsDoNotQualify(String conclusion) {
        record.setFinalConclusion(conclusion);rejected("FIT conclusion");
    }
    @Test void missingConclusionDoesNotQualify() {record.setFinalConclusion(null);rejected("FIT conclusion");}
    @Test void ineligibleHorseDoesNotQualify() {record.setTrainingEligible(false);rejected("authorization");}
    @Test void unknownEligibilityDoesNotQualify() {record.setTrainingEligible(null);rejected("authorization");}
    @ParameterizedTest @ValueSource(strings={"temperature","heart","respiratory"})
    void eachVitalIsRequired(String field) {
        switch(field) {case "temperature" -> vital.setBodyTemperature(null);case "heart" -> vital.setRestingHeartRate(null);default -> vital.setRestingRespiratoryRate(null);}
        rejected("temperature, resting heart rate");
    }
    @Test void missingVitalRowDoesNotQualify() {
        when(vitals.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(Optional.empty());rejected("temperature, resting heart rate");
    }
    @Test void missingMovementDoesNotQualify() {
        MedicalClinicalExam eye=new MedicalClinicalExam();eye.setExaminationArea("EYES");eye.setConditionStatus("NORMAL");
        when(exams.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(List.of(eye));rejected("requires a MOVEMENT_LEGS");
    }
    @Test void duplicateNormalMovementDoesNotQualify() {
        when(exams.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(List.of(movement("NORMAL"),movement("NORMAL")));
        rejected("duplicate");
    }
    @Test void abnormalMovementDoesNotQualify() {
        when(exams.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(List.of(movement("ABNORMAL")));rejected("NORMAL MOVEMENT_LEGS");
    }
    @Test void missingMovementStatusDoesNotQualify() {
        when(exams.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(List.of(movement(null)));rejected("NORMAL MOVEMENT_LEGS");
    }
    @Test void latestRecordCannotBorrowOlderNormalMovement() {
        MedicalRecord old=record("MED-001",record.getExaminedAt().minusDays(1));
        when(records.findByHealthProfile_Horse_HorseIdAndStatus("HOR-001","CONFIRMED")).thenReturn(List.of(record,old));
        when(exams.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(List.of());
        rejected("requires a MOVEMENT_LEGS");
        verify(exams,never()).findByMedicalRecord_MedicalRecordId("MED-001");
        verify(vitals,never()).findByMedicalRecord_MedicalRecordId("MED-001");
    }
    @Test void latestConfirmedConclusionWinsOverOlderFit() {
        MedicalRecord old=record("MED-001",record.getExaminedAt().minusDays(1));record.setFinalConclusion("FIT_WITH_MONITORING");
        when(records.findByHealthProfile_Horse_HorseIdAndStatus("HOR-001","CONFIRMED")).thenReturn(List.of(old,record));rejected("FIT conclusion");
    }
    @Test void noConfirmedRecordDoesNotQualify() {
        when(records.findByHealthProfile_Horse_HorseIdAndStatus("HOR-001","CONFIRMED")).thenReturn(List.of());rejected("confirmed medical");
        verify(records,never()).findByHealthProfile_Horse_HorseIdAndStatus("HOR-001","DRAFT");
        verify(records,never()).findByHealthProfile_Horse_HorseIdAndStatus("HOR-001","CANCELLED");
    }
    @Test void monitoringAndAbnormalMovementStillPassExistingGeneralGuard() {
        record.setFinalConclusion("FIT_WITH_MONITORING");
        when(exams.findByMedicalRecord_MedicalRecordId("MED-002")).thenReturn(List.of(movement("ABNORMAL")));
        assertDoesNotThrow(()->guard.requireHealthy(horse));
    }
}
