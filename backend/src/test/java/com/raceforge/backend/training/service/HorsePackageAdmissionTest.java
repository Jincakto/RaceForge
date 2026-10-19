package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.training.dto.HorsePackageRegisterRequest;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HorsePackageAdmissionTest {
    private final HorseRepository horses = mock(HorseRepository.class);
    private final TrainingPackageRepository packages = mock(TrainingPackageRepository.class);
    private final HorsePackageRepository registrations = mock(HorsePackageRepository.class);
    private final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
    private final MedicalRecordRepository medicalRecords = mock(MedicalRecordRepository.class);
    private final HorsePackageMapper mapper = mock(HorsePackageMapper.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final PackageEventService events = mock(PackageEventService.class);
    private final TrainingPackageExpirationService expirations = mock(TrainingPackageExpirationService.class);
    private final HorsePackageService service = new HorsePackageService(
            horses, packages, registrations, profiles, medicalRecords,
            mapper, entityManager, events, expirations);

    @Test
    void unapprovedHorseCannotRegisterEvenIfOwnerMatches() {
        User owner = new User();
        owner.setUserId(7);
        Horse horse = new Horse();
        horse.setHorseId("HOR-001");
        horse.setOwner(owner);
        horse.setAdmissionStatus("PENDING");
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));

        assertThrows(BusinessRuleException.class,
                () -> service.register(new HorsePackageRegisterRequest("HOR-001", "PKG-000012"), 7));
        verify(packages, never()).findById("PKG-000012");
        verify(registrations, never()).saveAndFlush(any());
    }
}
