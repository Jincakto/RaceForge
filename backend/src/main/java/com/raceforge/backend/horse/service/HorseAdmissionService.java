package com.raceforge.backend.horse.service;

import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

@Service
public class HorseAdmissionService {

    private static final Set<String> SUBMITTABLE_STATUSES =
            Set.of("NOT_SUBMITTED", "REJECTED");

    private final HorseRepository horses;
    private final HorseMapper mapper;
    private final HealthProfileRepository profiles;
    private final MedicalRecordRepository medicalRecords;
    private final AuditLogService audit;

    public HorseAdmissionService(
            HorseRepository horses,
            HorseMapper mapper,
            HealthProfileRepository profiles,
            MedicalRecordRepository medicalRecords,
            AuditLogService audit
    ) {
        this.horses = horses;
        this.mapper = mapper;
        this.profiles = profiles;
        this.medicalRecords = medicalRecords;
        this.audit = audit;
    }

    @Transactional
    public HorseResponse submit(String horseId, Integer actorId) {
        Horse horse = findLockedHorse(horseId);

        if (horse.getOwner() == null ||
                !actorId.equals(horse.getOwner().getUserId())) {
            throw new BusinessRuleException("Only the owner may submit this horse");
        }

        if (!SUBMITTABLE_STATUSES.contains(horse.getAdmissionStatus())) {
            throw new BusinessRuleException(
                    "Only a new or rejected horse registration can be submitted"
            );
        }

        requireRegistrationDocuments(horse);

        horse.setAdmissionStatus("PENDING");
        horse.setAdmissionNote(null);
        horse.getAdmission().setMedicalRecordId(null);
        horse.getAdmission().setDecisionBy(null);
        horse.getAdmission().setDecidedAt(null);
        audit(horse, actorId, "HORSE_ADMISSION_SUBMITTED", null);

        return mapper.toResponse(horse);
    }

    @Transactional
    public HorseResponse review(
            String horseId,
            Integer actorId,
            boolean approved,
            String note
    ) {
        Horse horse = findLockedHorse(horseId);

        if (!"PENDING".equals(horse.getAdmissionStatus())) {
            throw new BusinessRuleException("Only pending admissions can be reviewed");
        }

        if (!approved && isBlank(note)) {
            throw new BusinessRuleException("Rejection reason is required");
        }

        String initialMedicalRecordId = null;
        if (approved) {
            requireRegistrationDocuments(horse);
            initialMedicalRecordId = requireConfirmedInitialExam(horseId);
        }

        // Admission approval is independent of training clearance, training lock,
        // and the operational ACTIVE/INACTIVE status of the horse.
        horse.setAdmissionStatus(approved ? "APPROVED" : "REJECTED");
        horse.setAdmissionNote(note);
        horse.getAdmission().setMedicalRecordId(initialMedicalRecordId);
        // User IDs are currently Integer in Java; this column is VARCHAR(20)
        // and must be switched to the real prefixed user ID during Auth migration.
        horse.getAdmission().setDecisionBy(String.valueOf(actorId));
        horse.getAdmission().setDecidedAt(LocalDateTime.now());

        audit(
                horse,
                actorId,
                approved ? "HORSE_ADMISSION_APPROVED" : "HORSE_ADMISSION_REJECTED",
                note
        );

        return mapper.toResponse(horse);
    }

    @Transactional(readOnly = true)
    public Integer profile(String horseId) {
        return profiles.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Health profile not found; veterinary assignment is required"
                ))
                .getProfileId();
    }

    private String requireConfirmedInitialExam(String horseId) {
        var profile = profiles.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new BusinessRuleException(
                        "Initial veterinary examination is required before approval"));

        var initial = medicalRecords
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
                .stream()
                .filter(record -> "INITIAL".equalsIgnoreCase(record.getExamType())
                        && "CONFIRMED".equalsIgnoreCase(record.getStatus()))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException(
                        "A confirmed INITIAL examination is required before approval"));
        return initial.getMedicalRecordId();
    }

    private void requireRegistrationDocuments(Horse horse) {
        if (isBlank(horse.getImageUrl())
                || isBlank(horse.getRegistrationNumber())
                || isBlank(horse.getDocumentType())
                || isBlank(horse.getDocumentUrl())) {
            throw new BusinessRuleException(
                    "Horse image, registration number, document type and document URL are required"
            );
        }
        // The CM reviews document authenticity manually; a URL alone is not proof.
    }

    private boolean isBlank(String text) {
        return text == null || text.isBlank();
    }

    private Horse findLockedHorse(String horseId) {
        return horses.findByIdForUpdate(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
    }

    private void audit(Horse horse, Integer actorId, String action, String note) {
        audit.record(
                actorId,
                horse.getHorseId(),
                "HORSE",
                horse.getHorseId(),
                action,
                "SUCCESS",
                note
        );
    }
}
