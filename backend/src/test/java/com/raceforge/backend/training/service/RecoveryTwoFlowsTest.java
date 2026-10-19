package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.entity.TrainingLock;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import com.raceforge.backend.training.dto.HorsePackageRegisterRequest;
import com.raceforge.backend.training.dto.RecoveryApprovalRequest;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecoveryTwoFlowsTest {

    private final com.raceforge.backend.horse.service.ModuleIdAllocator ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
    private final HorseRepository horses = mock(HorseRepository.class);
    private final HorsePackageRepository registrations = mock(HorsePackageRepository.class);
    private final TrainingPackageRepository packages = mock(TrainingPackageRepository.class);
    private final TrainingLockRepository locks = mock(TrainingLockRepository.class);
    private final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
    private final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
    private final HorsePackageMapper mapper = mock(HorsePackageMapper.class);
    private final EntityManager em = mock(EntityManager.class);
    private final PackageEventService events = mock(PackageEventService.class);
    private final TrainingPackageExpirationService expirations = mock(TrainingPackageExpirationService.class);

    private final RecoveryPackageService recovery = new RecoveryPackageService(
            horses, registrations, packages, locks, mapper, em, events, expirations, ids);
    private final HorsePackageService ownerService = new HorsePackageService(
            horses, packages, registrations, profiles, records, mapper, em, events, expirations, ids);

    private Horse horse() {
        User owner = new User();
        owner.setUserId("7");
        Horse h = new Horse();
        h.setHorseId("HOR-001");
        h.setOwner(owner);
        h.setAdmissionStatus("APPROVED");
        h.setHealthStatus("NOT_FIT");
        h.setTrainingLocked(true);
        when(horses.findById("HOR-001")).thenReturn(Optional.of(h));
        return h;
    }

    private TrainingPackage recoveryPackage() {
        TrainingPackage pkg = new TrainingPackage();
        pkg.setPackageId("PKG-002");
        pkg.setStatus("ACTIVE");
        pkg.setPackageType("RECOVERY");
        pkg.setDurationDays(14);
        pkg.setPrice(new BigDecimal("1000000"));
        when(packages.findById("PKG-002")).thenReturn(Optional.of(pkg));
        return pkg;
    }

    private void medicalLocked(Horse h) {
        MedicalRecord mr = new MedicalRecord();
        mr.setStatus("CONFIRMED");
        mr.setMedicalRecordId("MED-001");
        TrainingLock lock = new TrainingLock();
        lock.setMedicalRecord(mr);
        lock.setLockedAt(java.time.LocalDateTime.now());
        when(locks.findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc("HOR-001"))
                .thenReturn(Optional.of(lock));
    }

    @Test
    void cmApprovalImmediatelyActivatesCenterCoveredRecoveryWithoutPayment() {
        Horse h = horse();
        medicalLocked(h);
        TrainingPackage recoveryPkg = recoveryPackage();
        TrainingPackage normal = new TrainingPackage();
        normal.setPackageType("RACING");
        HorsePackage original = new HorsePackage();
        original.setHorse(h);
        original.setTrainingPackage(normal);
        original.setStatus("PAUSED");
        original.setPauseReason("TRAINING_LOCK_MEDICAL:MED-001");
        original.setPausedAt(java.time.LocalDateTime.now().minusMinutes(1));
        original.setPaymentStatus("PAID");
        original.setRemainingDays(12);
        when(registrations.findByHorseIdOrderByRegisteredAtDesc("HOR-001"))
                .thenReturn(List.of(original));
        when(registrations.saveAndFlush(any(HorsePackage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        recovery.approveRecovery("HOR-001", new RecoveryApprovalRequest("PKG-002", "In-training injury"), "2");

        var captured = org.mockito.ArgumentCaptor.forClass(HorsePackage.class);
        verify(registrations).saveAndFlush(captured.capture());
        HorsePackage created = captured.getValue();
        assertEquals("ACTIVE", created.getStatus());
        assertEquals("CENTER_COVERED", created.getPaymentStatus());
        assertEquals(BigDecimal.ZERO, created.getTotalPrice());
        assertNull(created.getPaidAt());
        assertEquals(recoveryPkg, created.getTrainingPackage());
        assertEquals(original, created.getReplacedHorsePackage());
        assertEquals(12, original.getRemainingDays());
        assertEquals("PAUSED", original.getStatus());
    }

    @Test
    void cmCannotSponsorRecoveryWithoutPausedOrdinaryTrainingPackage() {
        Horse h = horse();
        medicalLocked(h);
        recoveryPackage();
        when(registrations.findByHorseIdOrderByRegisteredAtDesc("HOR-001"))
                .thenReturn(List.of());
        assertThrows(BusinessRuleException.class,
                () -> recovery.approveRecovery("HOR-001", new RecoveryApprovalRequest("PKG-002", "First injury"), "2"));
        verify(registrations, never()).saveAndFlush(any());
    }

    @Test
    void firstTimeOwnerCanRegisterRecoveryButItRemainsPendingPayment() {
        Horse h = horse();
        recoveryPackage();
        HealthProfile profile = new HealthProfile();
        profile.setProfileId("HLT-003");
        when(profiles.findByHorse_HorseId("HOR-001")).thenReturn(Optional.of(profile));
        MedicalRecord initial = new MedicalRecord();
        initial.setExamType("INITIAL");
        initial.setStatus("CONFIRMED");
        when(records.findByHealthProfile_ProfileIdOrderByExaminedAtDesc("HLT-003"))
                .thenReturn(List.of(initial));
        when(registrations.findByHorseIdOrderByRegisteredAtDesc("HOR-001"))
                .thenReturn(List.of());
        when(registrations.saveAndFlush(any(HorsePackage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ownerService.register(new HorsePackageRegisterRequest("HOR-001", "PKG-002"), "7");

        var captured = org.mockito.ArgumentCaptor.forClass(HorsePackage.class);
        verify(registrations).saveAndFlush(captured.capture());
        assertEquals("PENDING", captured.getValue().getStatus());
        assertEquals("PENDING", captured.getValue().getPaymentStatus());
        assertEquals(new BigDecimal("1000000"), captured.getValue().getTotalPrice());
        assertNull(captured.getValue().getReplacedHorsePackage());
    }

    @Test
    void successfulOwnerPaymentActivatesFirstTimeRecovery() {
        Horse h = horse();
        medicalLocked(h);
        HorsePackage pending = new HorsePackage();
        pending.setHorse(h);
        pending.setTrainingPackage(recoveryPackage());
        pending.setStatus("PENDING");
        pending.setPaymentStatus("PENDING");
        pending.setTotalPrice(new BigDecimal("1000000"));
        when(registrations.findById("HPG-044")).thenReturn(Optional.of(pending));
        when(registrations.findByHorse_HorseIdAndStatus("HOR-001", "ACTIVE"))
                .thenReturn(List.of());
        when(registrations.findByHorseIdOrderByRegisteredAtDesc("HOR-001"))
                .thenReturn(List.of(pending));
        when(registrations.saveAndFlush(any(HorsePackage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        recovery.simulateRecoveryPayment("HPG-044", true, "7");

        assertEquals("ACTIVE", pending.getStatus());
        assertEquals("PAID", pending.getPaymentStatus());
        assertNotNull(pending.getPaidAt());
        assertEquals(14, pending.getRemainingDays());
        assertEquals(new BigDecimal("1000000"), pending.getTotalPrice());
    }

    @Test
    void ownerCannotUsePaymentEndpointForCenterFundedRecovery() {
        Horse h = horse();
        HorsePackage centerRecovery = new HorsePackage();
        centerRecovery.setHorse(h);
        centerRecovery.setTrainingPackage(recoveryPackage());
        centerRecovery.setReplacedHorsePackage(new HorsePackage());
        centerRecovery.setStatus("ACTIVE");
        centerRecovery.setPaymentStatus("CENTER_COVERED");
        when(registrations.findById("HPG-045")).thenReturn(Optional.of(centerRecovery));
        assertThrows(BusinessRuleException.class,
                () -> recovery.simulateRecoveryPayment("HPG-045", true, "7"));
        verify(registrations, never()).saveAndFlush(any());
    }
}
