package com.raceforge.backend.horse.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseAdmission;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HorseAdmissionServiceTest {

    private final HorseRepository horses = mock(HorseRepository.class);
    private final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
    private final MedicalRecordRepository medicalRecords = mock(MedicalRecordRepository.class);
    private final AuditLogService audit = mock(AuditLogService.class);

    private final HorseAdmissionService service = new HorseAdmissionService(
            horses, new HorseMapper(), profiles, medicalRecords, audit
    );

    private Horse horse(String admissionStatus) {
        Horse horse = new Horse();
        horse.setHorseId("HOR-014");
        User owner = new User();
        owner.setUserId("7");
        horse.setOwner(owner);
        horse.setStatus("INACTIVE");
        HorseAdmission admission = new HorseAdmission();
        horse.setAdmission(admission);
        horse.setAdmissionStatus(admissionStatus);
        horse.setImageUrl("https://example.org/horse.png");
        horse.setRegistrationNumber("REG-014");
        horse.setDocumentType("REGISTRATION_CERTIFICATE");
        horse.setDocumentUrl("https://example.org/certificate.pdf");
        when(horses.findByIdForUpdate("HOR-014")).thenReturn(Optional.of(horse));
        return horse;
    }

    private void confirmedInitialExam(String healthStatus) {
        HealthProfile profile = new HealthProfile();
        profile.setProfileId("HLT-005");
        when(profiles.findByHorse_HorseId("HOR-014")).thenReturn(Optional.of(profile));

        MedicalRecord initial = new MedicalRecord();
        initial.setMedicalRecordId("MED-001");
        initial.setExamType("INITIAL");
        initial.setStatus("CONFIRMED");
        initial.setHealthStatus(healthStatus);
        when(medicalRecords.findByHealthProfile_ProfileIdOrderByExaminedAtDesc("HLT-005"))
                .thenReturn(List.of(initial));
    }

    @Test
    void ownerSubmitDoesNotActivateHorse() {
        Horse horse = horse("NOT_SUBMITTED");
        service.submit("HOR-014", "7");
        assertEquals("PENDING", horse.getAdmissionStatus());
        assertEquals("INACTIVE", horse.getStatus());
        assertNull(horse.getHealthStatus());
    }

    @Test
    void anotherOwnerCannotSubmit() {
        horse("NOT_SUBMITTED");
        assertThrows(BusinessRuleException.class, () -> service.submit("HOR-014", "8"));
    }

    @Test
    void registrationMustIncludeDocuments() {
        Horse horse = horse("NOT_SUBMITTED");
        horse.setDocumentUrl(null);
        assertThrows(BusinessRuleException.class, () -> service.submit("HOR-014", "7"));
        assertEquals("NOT_SUBMITTED", horse.getAdmissionStatus());
    }

    @Test
    void duplicateSubmissionIsRejected() {
        horse("PENDING");
        assertThrows(BusinessRuleException.class, () -> service.submit("HOR-014", "7"));
    }

    @Test
    void approvalNeedsConfirmedInitialExam() {
        Horse horse = horse("PENDING");
        HealthProfile profile = new HealthProfile();
        profile.setProfileId("HLT-005");
        when(profiles.findByHorse_HorseId("HOR-014")).thenReturn(Optional.of(profile));
        when(medicalRecords.findByHealthProfile_ProfileIdOrderByExaminedAtDesc("HLT-005"))
                .thenReturn(List.of());

        assertThrows(BusinessRuleException.class,
                () -> service.review("HOR-014", "1", true, "Documents verified"));
        assertEquals("PENDING", horse.getAdmissionStatus());
    }

    @Test
    void approvalDoesNotRequireHealthClearanceOrCreateNewProfile() {
        Horse horse = horse("PENDING");
        confirmedInitialExam("NOT_FIT");

        service.review("HOR-014", "1", true, "Documents verified");

        assertEquals("APPROVED", horse.getAdmissionStatus());
        assertEquals("INACTIVE", horse.getStatus());
        assertNull(horse.getHealthStatus());
        assertEquals("MED-001", horse.getAdmission().getMedicalRecordId());
        verify(profiles, never()).save(any(HealthProfile.class));
    }

    @Test
    void rejectionRequiresReasonAndDoesNotCreateProfile() {
        Horse horse = horse("PENDING");
        assertThrows(BusinessRuleException.class,
                () -> service.review("HOR-014", "1", false, " "));
        assertEquals("PENDING", horse.getAdmissionStatus());

        service.review("HOR-014", "1", false, "Missing information");
        assertEquals("REJECTED", horse.getAdmissionStatus());
        verify(profiles, never()).save(any(HealthProfile.class));
    }

    @Test
    void approvedHorseCannotBeReviewedAgain() {
        horse("APPROVED");
        assertThrows(BusinessRuleException.class,
                () -> service.review("HOR-014", "1", true, ""));
    }
}
