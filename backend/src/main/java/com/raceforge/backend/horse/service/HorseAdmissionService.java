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
import com.raceforge.backend.notification.service.NotificationService;
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
    private final NotificationService notifications;

    public HorseAdmissionService(
            HorseRepository horses,
            HorseMapper mapper,
            HealthProfileRepository profiles,
            MedicalRecordRepository medicalRecords,
            AuditLogService audit,
            NotificationService notifications
    ) {
        this.horses = horses;
        this.mapper = mapper;
        this.profiles = profiles;
        this.medicalRecords = medicalRecords;
        this.audit = audit;
        this.notifications = notifications;
    }

    @Transactional
    public HorseResponse submit(String horseId, String actorId) {
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
        horse.getAdmission().resetScreening();
        horse.getAdmission().setSubmittedAt(LocalDateTime.now());
        horse.setAdmissionNote(null);
        horse.getAdmission().setMedicalRecordId(null);
        horse.getAdmission().setDecisionBy(null);
        horse.getAdmission().setDecidedAt(null);
        audit(horse, actorId, "HORSE_ADMISSION_SUBMITTED", null);

        return mapper.toResponse(horse);
    }

    /** Notes here are owner-facing requests for evidence, not source comparison details. */
    @Transactional
    public HorseResponse screen(String horseId, String actorId, String decision, String reason) {
        Horse horse = findLockedHorse(horseId);
        if (!"PENDING".equals(horse.getAdmissionStatus())
                || !"PENDING".equals(horse.getAdmission().getScreeningStatus())) {
            throw new BusinessRuleException("Only admissions awaiting screening can be screened");
        }
        if (!Set.of("PASSED", "NEEDS_CORRECTION", "REJECTED").contains(decision == null ? "" : decision)) {
            throw new BusinessRuleException("Invalid screening decision");
        }
        if (!"PASSED".equals(decision) && isBlank(reason)) {
            throw new BusinessRuleException("An owner-facing reason is required");
        }
        if (reason != null && reason.length() > 500) {
            throw new BusinessRuleException("Reason cannot exceed 500 characters");
        }
        if ("PASSED".equals(decision)) requireRegistrationDocuments(horse);
        var admission = horse.getAdmission();
        admission.setScreeningStatus(decision);
        admission.setScreenedBy(actorId);
        admission.setScreenedAt(LocalDateTime.now());
        admission.setScreeningReason(isBlank(reason) ? null : reason.trim());
        if ("NEEDS_CORRECTION".equals(decision)) {
            horse.setAdmissionStatus("NOT_SUBMITTED");
            admission.setMedicalRecordId(null);
        } else if ("REJECTED".equals(decision)) {
            horse.setAdmissionStatus("REJECTED");
            horse.setAdmissionNote(reason.trim());
            admission.setDecisionBy(actorId);
            admission.setDecidedAt(LocalDateTime.now());
        }
        audit(horse, actorId, "HORSE_SCREENING_" + decision, admission.getScreeningReason());
        notifications.notify(horse.getOwner().getUserId(), "HORSE_SCREENING_" + decision,
                "Horse admission screening", "Horse " + horseId + ": "
                        + ("PASSED".equals(decision) ? "Screening passed; awaiting veterinary assignment."
                        : "NEEDS_CORRECTION".equals(decision) ? "Please update and resubmit your profile. " + reason.trim()
                        : "Admission rejected. " + reason.trim()));
        return mapper.toResponse(horse);
    }

    @Transactional
    public HorseResponse review(
            String horseId,
            String actorId,
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
            if (!"PASSED".equals(horse.getAdmission().getScreeningStatus())) {
                throw new BusinessRuleException("Document screening must pass before admission approval");
            }
            requireRegistrationDocuments(horse);
            initialMedicalRecordId = requireConfirmedInitialExam(horse);
        }

        // Admission approval is independent of training clearance, training lock,
        // and the operational ACTIVE/INACTIVE status of the horse.
        horse.setAdmissionStatus(approved ? "APPROVED" : "REJECTED");
        if (!approved && !"PASSED".equals(horse.getAdmission().getScreeningStatus())) {
            horse.getAdmission().setScreeningStatus("REJECTED");
            horse.getAdmission().setScreenedBy(actorId);
            horse.getAdmission().setScreenedAt(LocalDateTime.now());
            horse.getAdmission().setScreeningReason(note.trim());
        }
        horse.setAdmissionNote(note);
        horse.getAdmission().setMedicalRecordId(initialMedicalRecordId);
        horse.getAdmission().setDecisionBy(actorId);
        horse.getAdmission().setDecidedAt(LocalDateTime.now());

        audit(
                horse,
                actorId,
                approved ? "HORSE_ADMISSION_APPROVED" : "HORSE_ADMISSION_REJECTED",
                note
        );
        notifications.notify(horse.getOwner().getUserId(), "HORSE_ADMISSION_" + (approved ? "APPROVED" : "REJECTED"),
                "Horse admission decision", "Horse " + horseId + (approved ? " was admitted to the club." : " was rejected. " + note.trim()));

        return mapper.toResponse(horse);
    }

    @Transactional(readOnly = true)
    public String profile(String horseId) {
        return profiles.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Health profile not found; veterinary assignment is required"
                ))
                .getProfileId();
    }

    private String requireConfirmedInitialExam(Horse horse) {
        String horseId = horse.getHorseId();
        var profile = profiles.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new BusinessRuleException(
                        "Initial veterinary examination is required before approval"));

        var initial = medicalRecords
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
                .stream()
                .filter(record -> "INITIAL".equalsIgnoreCase(record.getExamType())
                        && "CONFIRMED".equalsIgnoreCase(record.getStatus()))
                .filter(record -> horse.getAdmission().getSubmittedAt() == null
                        || (record.getCreatedAt() != null
                        && !record.getCreatedAt().isBefore(horse.getAdmission().getSubmittedAt())))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException(
                        "A confirmed INITIAL examination is required before approval"));
        return initial.getMedicalRecordId();
    }

    private void requireRegistrationDocuments(Horse horse) {
        if (isBlank(horse.getImageUrl())
                || isBlank(horse.getRegistrationNumber())
                || isBlank(horse.getDocumentUrl())) {
            throw new BusinessRuleException(
                    "Horse image, registration number and document URL are required"
            );
        }
        // Existing horses, including records created before UELN validation, must also
        // satisfy the current identification policy before Admission submission/approval.
        UelnValidator.normalizeAndValidate(horse.getRegistrationNumber());
        // The CM reviews document authenticity manually; a URL alone is not proof.
    }

    private boolean isBlank(String text) {
        return text == null || text.isBlank();
    }

    private Horse findLockedHorse(String horseId) {
        return horses.findByIdForUpdate(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
    }

    private void audit(Horse horse, String actorId, String action, String note) {
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
