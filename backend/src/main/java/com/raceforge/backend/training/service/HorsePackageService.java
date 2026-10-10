package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.training.dto.HorsePackageRegisterRequest;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class HorsePackageService {

    private final HorseRepository horseRepository;
    private final TrainingPackageRepository trainingPackageRepository;
    private final HorsePackageRepository horsePackageRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final HorsePackageMapper mapper;
    private final EntityManager entityManager;

    public HorsePackageService(
            HorseRepository horseRepository,
            TrainingPackageRepository trainingPackageRepository,
            HorsePackageRepository horsePackageRepository,
            HealthProfileRepository healthProfileRepository,
            MedicalRecordRepository medicalRecordRepository,
            HorsePackageMapper mapper,
            EntityManager entityManager
    ) {
        this.horseRepository = horseRepository;
        this.trainingPackageRepository = trainingPackageRepository;
        this.horsePackageRepository = horsePackageRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Transactional
    public HorsePackageResponse register(HorsePackageRegisterRequest request, String ownerId) {
        requireOwnerId(ownerId);

      Horse horse = horseRepository.findById(request.horseId())
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + request.horseId()));
        entityManager.lock(horse, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        checkOwnership(horse, ownerId);

        TrainingPackage trainingPackage = trainingPackageRepository.findById(request.packageId())
                .orElseThrow(() -> new ResourceNotFoundException("Training package not found: " + request.packageId()));
        if (!"ACTIVE".equals(trainingPackage.getStatus())) {
            throw new BusinessRuleException("This training package is not available");
        }

        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horse.getHorseId())
                .orElseThrow(() -> new BusinessRuleException("Initial medical examination is required"));
        boolean initialConfirmed = medicalRecordRepository
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
                .stream().anyMatch(this::isConfirmedInitial);
        if (!initialConfirmed) {
            throw new BusinessRuleException("A confirmed INITIAL examination is required before registration");
        }

        boolean recovery = "RECOVERY".equals(trainingPackage.getPackageType());
        boolean locked = Boolean.TRUE.equals(horse.getTrainingLocked());
        if (locked && !recovery) {
            throw new BusinessRuleException("Training is locked: only a veterinarian-authorized recovery package is allowed");
        }
        if (recovery) {

          throw new BusinessRuleException("Recovery registration requires veterinarian approval and the CM workflow (Stage 4)");
        }
        if (!"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException("Horse must have READY health status to register a normal package");
        }
        if (horsePackageRepository.existsByHorse_HorseIdAndStatusIn(
                horse.getHorseId(), List.of("PENDING", "ACTIVE", "PAUSED"))) {
            throw new BusinessRuleException("Horse already has a pending or ongoing package");
        }

        HorsePackage registration = new HorsePackage();
        registration.setHorsePackageId(newId());
        registration.setHorse(horse);
        registration.setTrainingPackage(trainingPackage);
        registration.setTotalPrice(trainingPackage.getPrice());
        registration.setStatus("PENDING");
        registration.setPaymentStatus("PENDING");
        return mapper.toResponse(horsePackageRepository.saveAndFlush(registration));
    }

    @Transactional
    public HorsePackageResponse simulatePayment(String registrationId, boolean successful, String ownerId) {
        requireOwnerId(ownerId);
        HorsePackage registration = horsePackageRepository.findForUpdate(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found: " + registrationId));
        checkOwnership(registration.getHorse(), ownerId);

        if (!"PENDING".equals(registration.getStatus()) || !"PENDING".equals(registration.getPaymentStatus())) {
            throw new BusinessRuleException("This registration is not awaiting payment");
        }
        if (!successful) {
            registration.setPaymentStatus("FAILED");
            registration.setStatus("CANCELLED");
            return mapper.toResponse(horsePackageRepository.saveAndFlush(registration));
        }

        Horse horse = registration.getHorse();
        entityManager.lock(horse, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (Boolean.TRUE.equals(horse.getTrainingLocked()) || !"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException("Horse is no longer eligible for normal training");
        }
        if (!"ACTIVE".equals(registration.getTrainingPackage().getStatus())) {
            throw new BusinessRuleException("Training package is no longer available");
        }
        if (!horsePackageRepository.findByHorse_HorseIdAndStatus(horse.getHorseId(), "ACTIVE").isEmpty()) {
            throw new BusinessRuleException("Horse already has an active package");
        }

        LocalDate today = LocalDate.now();
        int days = registration.getTrainingPackage().getDurationDays();
        registration.setPaymentStatus("PAID");
        registration.setPaidAt(LocalDateTime.now());
        registration.setStatus("ACTIVE");
        registration.setStartDate(today);
        registration.setEndDate(today.plusDays(days - 1L));
        registration.setRemainingDays(days);
        return mapper.toResponse(horsePackageRepository.saveAndFlush(registration));
    }

    @Transactional(readOnly = true)
    public List<HorsePackageResponse> history(String horseId, String ownerId) {
        requireOwnerId(ownerId);
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));
        checkOwnership(horse, ownerId);
        return horsePackageRepository.findByHorse_HorseIdOrderByRegisteredAtDesc(horseId)
                .stream().map(mapper::toResponse).toList();
    }

    private boolean isConfirmedInitial(MedicalRecord record) {
        return "INITIAL".equalsIgnoreCase(record.getExamType())
                && "CONFIRMED".equalsIgnoreCase(record.getStatus());
    }

    private void checkOwnership(Horse horse, String ownerId) {
        if (horse.getOwner() == null || !ownerId.equals(horse.getOwner().getUserId())) {
            throw new BusinessRuleException("You are not the owner of this horse");
        }
    }

    private void requireOwnerId(String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new BusinessRuleException("Authenticated Horse Owner is required");
        }
    }

    private String newId() {
        return "HPK" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 17).toUpperCase(Locale.ROOT);
    }
}
