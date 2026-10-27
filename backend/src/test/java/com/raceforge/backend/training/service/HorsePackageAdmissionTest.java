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
    @org.junit.jupiter.api.BeforeEach void templateReader(){org.springframework.test.util.ReflectionTestUtils.setField(service,"packageRoadmaps",mock(PackageRoadmapTemplateService.class));}
    private final com.raceforge.backend.horse.service.ModuleIdAllocator ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
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
            mapper, entityManager, events, expirations, ids);

    @Test
    void unapprovedHorseCannotRegisterEvenIfOwnerMatches() {
        User owner = new User();
        owner.setUserId("7");
        Horse horse = new Horse();
        horse.setHorseId("HOR-001");
        horse.setOwner(owner);
        horse.setAdmissionStatus("PENDING");
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));

        assertThrows(BusinessRuleException.class,
                () -> service.register(new HorsePackageRegisterRequest("HOR-001", "PKG-012"), "7"));
        verify(packages, never()).findById("PKG-012");
        verify(registrations, never()).saveAndFlush(any());
    }

    @Test
    void racingRejectionDoesNotPersistRegistration() {
        TrainingWorkflowGuard guard=mock(TrainingWorkflowGuard.class);
        org.springframework.test.util.ReflectionTestUtils.setField(service,"workflowGuard",guard);
        Horse horse=approvedHorse();
        var pack=new com.raceforge.backend.training.entity.TrainingPackage();
        pack.setStatus("ACTIVE");pack.setPackageType("RACING");
        when(packages.findById("PKG-012")).thenReturn(Optional.of(pack));
        doThrow(new BusinessRuleException("RACING requires FIT")).when(guard).requireRacingEligible(horse);
        assertThrows(BusinessRuleException.class,()->service.register(new HorsePackageRegisterRequest("HOR-001","PKG-012"),"7"));
        var order=inOrder(guard);order.verify(guard).requireHealthy(horse);order.verify(guard).requireRacingEligible(horse);
        verify(registrations,never()).saveAndFlush(any());
        verifyNoInteractions(ids,events);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"BASIC","PERFORMANCE","RACING"})
    void onlyRacingInvokesAdditionalGuardAndValidRegistrationIsSaved(String type) {
        TrainingWorkflowGuard guard=mock(TrainingWorkflowGuard.class);
        org.springframework.test.util.ReflectionTestUtils.setField(service,"workflowGuard",guard);
        Horse horse=approvedHorse();
        var pack=new com.raceforge.backend.training.entity.TrainingPackage();
        pack.setStatus("ACTIVE");pack.setPackageType(type);
        when(packages.findById("PKG-012")).thenReturn(Optional.of(pack));
        var profile=new com.raceforge.backend.medical.entity.HealthProfile();profile.setProfileId("HPR-001");
        when(profiles.findByHorse_HorseId("HOR-001")).thenReturn(Optional.of(profile));
        var initial=new com.raceforge.backend.medical.entity.MedicalRecord();initial.setExamType("INITIAL");initial.setStatus("CONFIRMED");
        when(medicalRecords.findByHealthProfile_ProfileIdOrderByExaminedAtDesc("HPR-001")).thenReturn(java.util.List.of(initial));
        when(ids.next("HPG")).thenReturn("HPG-001");
        when(registrations.saveAndFlush(any())).thenAnswer(invocation->invocation.getArgument(0));
        assertDoesNotThrow(()->service.register(new HorsePackageRegisterRequest("HOR-001","PKG-012"),"7"));
        verify(guard).requireHealthy(horse);
        verify(guard,times("RACING".equals(type)?1:0)).requireRacingEligible(horse);
        verify(registrations).saveAndFlush(argThat(registration->"PENDING".equals(registration.getStatus())&&registration.getHorse()==horse));
    }

    private Horse approvedHorse() {
        User owner=new User();owner.setUserId("7");
        Horse horse=new Horse();horse.setHorseId("HOR-001");horse.setOwner(owner);
        horse.setAdmissionStatus("APPROVED");horse.setHealthStatus("READY");horse.setTrainingLocked(false);
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));return horse;
    }
}
