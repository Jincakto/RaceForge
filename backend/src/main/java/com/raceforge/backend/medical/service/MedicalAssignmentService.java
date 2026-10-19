package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.dto.MedicalAssignmentResponse;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.horse.entity.HorseAssignment;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.notification.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MedicalAssignmentService {

    private static final List<String> OPEN_STATUSES = List.of("ASSIGNED", "ACCEPTED");
    private final HorseAssignmentRepository assignments;
    private final MedicalRecordRepository medicalRecords;
    private final HorseRepository horses;
    private final UserRepository users;
    private final HealthProfileRepository profiles;
    private final NotificationService notifications;
    private final AuditLogService audit;

    public MedicalAssignmentService(HorseAssignmentRepository assignments,
                                    MedicalRecordRepository medicalRecords,
                                    HorseRepository horses,
                                    UserRepository users,
                                    HealthProfileRepository profiles,
                                    NotificationService notifications,
                                    AuditLogService audit) {
        this.assignments = assignments;
        this.medicalRecords = medicalRecords;
        this.horses = horses;
        this.users = users;
        this.profiles = profiles;
        this.notifications = notifications;
        this.audit = audit;
    }

    /** CM assigns or reassigns a vet; a HealthProfile is created only once. */
    @Transactional
    public MedicalAssignmentResponse assign(String horseId, Integer veterinarianId, Integer managerId) {
        User manager = requireRole(managerId, "CLUB_MANAGER");
        User vet = requireRole(veterinarianId, "VETERINARIAN");
        Horse horse = horses.findByIdForUpdate(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));

        if (!List.of("PENDING", "APPROVED").contains(horse.getAdmissionStatus())) {
            throw new BusinessRuleException("Horse must be submitted for admission before veterinary assignment");
        }

        List<HorseAssignment> active = assignments.findByHorse_HorseIdAndKindAndStatusIn(horseId, "VET", OPEN_STATUSES);
        if (active.stream().anyMatch(a -> a.getAssignee().getUserId().equals(veterinarianId))) {
            throw new BusinessRuleException("Veterinarian already has an active assignment for this horse");
        }
        if (active.size() > 1) {
            throw new BusinessRuleException("Multiple active assignments detected; resolve data before reassigning");
        }
        for (HorseAssignment previous : active) {
            previous.setStatus("REASSIGNED");
            // No reassigned_at column in the shared table; Audit holds the event time.
            notifications.notify(previous.getAssignee().getUserId(), "MEDICAL_ASSIGNMENT_REASSIGNED",
                    "Veterinary assignment changed", "Horse " + horseId + " has been reassigned");
        }

        // A new assignment supersedes every unfinished examination of this horse.
        // Keep CONFIRMED records intact; CANCELLED drafts remain available for audit.
        // This also prevents an old draft from becoming editable again if a former
        // veterinarian receives a new ACCEPTED assignment later.
        cancelSupersededDrafts(horseId, managerId);

        if (profiles.findByHorse_HorseId(horseId).isEmpty()) {
            HealthProfile profile = new HealthProfile();
            profile.setHorse(horse);
            profiles.saveAndFlush(profile);
        }
        HorseAssignment assignment = new HorseAssignment();
        assignment.setHorse(horse);
        assignment.setKind("VET");
        assignment.setAssignee(vet);
        assignment.setAssignedBy(manager);
        assignment.setStatus("ASSIGNED");
        assignment.setCreatedAt(LocalDateTime.now());
        assignments.saveAndFlush(assignment);
        notifications.notify(veterinarianId, "MEDICAL_ASSIGNMENT_CREATED",
                "New veterinary examination", "You have been assigned horse " + horseId);
        recordAudit(managerId, assignment, "MEDICAL_ASSIGNMENT_CREATED", null);
        return MedicalAssignmentResponse.from(assignment);
    }

    @Transactional
    public MedicalAssignmentResponse accept(Integer assignmentId, Integer veterinarianId) {
        requireRole(veterinarianId, "VETERINARIAN");
        HorseAssignment a = findAssignedToVet(assignmentId, veterinarianId);
        requireStatus(a, "ASSIGNED");
        a.setStatus("ACCEPTED");
        a.setRespondedAt(LocalDateTime.now());
        recordAudit(veterinarianId, a, "MEDICAL_ASSIGNMENT_ACCEPTED", null);
        return MedicalAssignmentResponse.from(a);
    }

    /** A decline is a terminal decision for this assignment; CM must assign again. */
    @Transactional
    public MedicalAssignmentResponse decline(Integer assignmentId, Integer veterinarianId, String reason) {
        requireRole(veterinarianId, "VETERINARIAN");
        if (reason == null || reason.trim().length() < 10 || reason.trim().length() > 500) {
            throw new BusinessRuleException("Decline reason must contain 10 to 500 characters");
        }
        HorseAssignment a = findAssignedToVet(assignmentId, veterinarianId);
        requireStatus(a, "ASSIGNED");
        a.setStatus("DECLINED");
        a.setRespondedAt(LocalDateTime.now());
        a.setReason(reason.trim());
        notifications.notify(a.getAssignedBy().getUserId(), "MEDICAL_ASSIGNMENT_DECLINED",
                "Veterinarian declined assignment",
                "Horse " + a.getHorse().getHorseId() + ": " + reason.trim());
        recordAudit(veterinarianId, a, "MEDICAL_ASSIGNMENT_DECLINED", reason.trim());
        return MedicalAssignmentResponse.from(a);
    }

    @Transactional(readOnly = true)
    public List<MedicalAssignmentResponse> myAssignments(Integer veterinarianId) {
        requireRole(veterinarianId, "VETERINARIAN");
        return assignments.findByAssignee_UserIdAndKindAndStatusInOrderByCreatedAtDesc(
                        veterinarianId, "VET", OPEN_STATUSES)
                .stream().map(MedicalAssignmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MedicalAssignmentResponse> acceptedHorses(Integer veterinarianId) {
        requireRole(veterinarianId, "VETERINARIAN");
        return assignments.findByAssignee_UserIdAndKindAndStatusInOrderByCreatedAtDesc(
                        veterinarianId, "VET", List.of("ACCEPTED"))
                .stream().map(MedicalAssignmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MedicalAssignmentResponse> myHistory(Integer veterinarianId) {
        requireRole(veterinarianId, "VETERINARIAN");
        return assignments.findByAssignee_UserIdAndKindOrderByCreatedAtDesc(veterinarianId, "VET")
                .stream().map(MedicalAssignmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MedicalAssignmentResponse> declinedAssignments(Integer managerId) {
        requireRole(managerId, "CLUB_MANAGER");
        return assignments.findByKindAndStatusOrderByCreatedAtDesc("VET", "DECLINED")
                .stream().map(MedicalAssignmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MedicalAssignmentResponse> horseHistory(String horseId) {
        if (!horses.existsById(horseId)) throw new ResourceNotFoundException("Horse not found");
        return assignments.findByHorse_HorseIdAndKindOrderByCreatedAtDesc(horseId, "VET")
                .stream().map(MedicalAssignmentResponse::from).toList();
    }

    /** Called at create, draft update and confirmation; never trust a client-supplied vet ID. */
    @Transactional(readOnly = true)
    public void requireAccepted(String horseId, Integer veterinarianId) {
        if (!assignments.existsByHorse_HorseIdAndAssignee_UserIdAndKindAndStatusIn(
                horseId, veterinarianId, "VET", List.of("ACCEPTED"))) {
            throw new BusinessRuleException("Veterinarian must accept an active assignment before examination");
        }
    }

    /** Once a record is confirmed, this accepted assignment has been fulfilled. */
    @Transactional
    public void complete(String horseId, Integer veterinarianId) {
        complete(horseId, veterinarianId, null);
    }

    @Transactional
    public void complete(String horseId, Integer veterinarianId, String medicalRecordId) {
        HorseAssignment assignment = assignments
                .findFirstByHorse_HorseIdAndAssignee_UserIdAndKindAndStatusOrderByCreatedAtDesc(
                        horseId, veterinarianId, "VET", "ACCEPTED")
                .orElseThrow(() -> new BusinessRuleException("No accepted assignment for confirmed examination"));
        assignment.setStatus("COMPLETED");
        assignment.setMedicalRecordId(medicalRecordId);
        // Confirmation timestamp is in Medical_Record.confirmed_at.
        // Assignment.responded_at retains the Vet acceptance time.
        recordAudit(veterinarianId, assignment, "MEDICAL_ASSIGNMENT_COMPLETED", null);
    }

    /** Cancel unfinished records when a CM issues a new assignment. */
    private void cancelSupersededDrafts(String horseId, Integer managerId) {
        List<MedicalRecord> drafts = medicalRecords
                .findByHealthProfile_Horse_HorseIdAndStatus(horseId, "DRAFT");
        for (MedicalRecord draft : drafts) {
            draft.setStatus("CANCELLED");
            audit.record(managerId, horseId, "MEDICAL_RECORD", draft.getMedicalRecordId(),
                    "MEDICAL_DRAFT_CANCELLED_ON_REASSIGNMENT", "SUCCESS",
                    "Horse " + horseId + " reassigned; draft retained for traceability");
        }

        if (!drafts.isEmpty()) {
            medicalRecords.saveAll(drafts);
        }
    }

    private HorseAssignment findAssignedToVet(Integer assignmentId, Integer veterinarianId) {
        HorseAssignment a = assignments.findByIdForUpdate(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Veterinary assignment not found"));
        if (!"VET".equals(a.getKind()) || !a.getAssignee().getUserId().equals(veterinarianId)) {
            throw new BusinessRuleException("Only the assigned veterinarian may respond");
        }
        return a;
    }

    private void requireStatus(HorseAssignment assignment, String expected) {
        if (!expected.equals(assignment.getStatus())) {
            throw new BusinessRuleException("Only an ASSIGNED task can be accepted or declined");
        }
    }

    private User requireRole(Integer userId, String requiredRole) {
        User user = users.findDetailedById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!"ACTIVE".equals(user.getStatus()) || user.getRole() == null
                || !requiredRole.equals(user.getRole().getRoleName())) {
            throw new BusinessRuleException("An active " + requiredRole + " user is required");
        }
        return user;
    }

    private void recordAudit(Integer actorId, HorseAssignment assignment, String action, String reason) {
        audit.record(actorId, assignment.getHorse().getHorseId(),
                "HORSE_ASSIGNMENT", assignment.getId(), action, "SUCCESS", reason);
    }
}
