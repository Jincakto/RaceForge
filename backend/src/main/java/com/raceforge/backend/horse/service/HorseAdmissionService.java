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
<<<<<<< HEAD

    private static final Set<String> SUBMITTABLE_STATUSES =
            Set.of("NOT_SUBMITTED", "REJECTED");

=======
    @org.springframework.beans.factory.annotation.Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
>>>>>>> 76de6e5 (luu code)
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
<<<<<<< HEAD
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
        horse.setAdmissionNote(null);
        horse.getAdmission().setMedicalRecordId(null);
        horse.getAdmission().setDecisionBy(null);
        horse.getAdmission().setDecidedAt(null);
        audit(horse, actorId, "HORSE_ADMISSION_SUBMITTED", null);

        return mapper.toResponse(horse);
=======
    public HorseResponse submit(String id,String actor){
        Horse h=locked(id);
        if(!h.getOwner().getUserId().equals(actor))throw new BusinessRuleException("Only the owner may submit this horse");
        if(!java.util.Set.of("NOT_SUBMITTED","REJECTED").contains(h.getAdmissionStatus()))throw new BusinessRuleException("Horse admission is already pending or approved");
        if(h.getDocumentType()==null||h.getDocumentType().isBlank()||h.getDocumentUrl()==null||h.getDocumentUrl().isBlank())throw new BusinessRuleException("Identity document type and URL are required before admission submission");
        if(profiles.findByHorse_HorseId(id).isEmpty()){var profile=new HealthProfile();profile.setHorse(h);profiles.save(profile);}
        h.setAdmissionStatus("PENDING");h.setAdmissionNote(null);record(h,actor,"HORSE_ADMISSION_SUBMITTED",null);return mapper.toResponse(h);
>>>>>>> 76de6e5 (luu code)
    }

    @Transactional
<<<<<<< HEAD
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
            requireRegistrationDocuments(horse);
            initialMedicalRecordId = requireConfirmedInitialExam(horseId);
        }

        // Admission approval is independent of training clearance, training lock,
        // and the operational ACTIVE/INACTIVE status of the horse.
        horse.setAdmissionStatus(approved ? "APPROVED" : "REJECTED");
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
=======
    public HorseResponse review(String id,String actor,boolean approved,String note){
        Horse h=locked(id);
        if(!"PENDING".equals(h.getAdmissionStatus()))throw new BusinessRuleException("Only pending admissions can be reviewed");
        if(!approved&&(note==null||note.isBlank()))throw new BusinessRuleException("Rejection reason is required");
        if(approved){var records=jdbc.queryForList("SELECT TOP 1 mr.medical_record_id,mr.training_eligible,mr.final_conclusion FROM dbo.Medical_Record mr JOIN dbo.Health_Profile hp ON hp.profile_id=mr.profile_id WHERE hp.horse_id=? AND mr.status='CONFIRMED' ORDER BY mr.examined_at DESC,mr.confirmed_at DESC",id);if(records.isEmpty()||!Boolean.TRUE.equals(records.get(0).get("training_eligible"))||(records.get(0).get("final_conclusion")==null || !java.util.Set.of("FIT","FIT_WITH_MONITORING").contains(records.get(0).get("final_conclusion"))))throw new BusinessRuleException("A confirmed fit-for-training examination is required before admission");h.admission().setMedicalRecordId((String)records.get(0).get("medical_record_id"));h.setStatus("ACTIVE");}
        h.setAdmissionStatus(approved?"APPROVED":"REJECTED");h.setAdmissionNote(note);h.admission().setDecisionBy(actor);h.admission().setDecidedAt(java.time.LocalDateTime.now());
        if(approved&&profiles.findByHorse_HorseId(id).isEmpty()){var profile=new HealthProfile();profile.setHorse(h);profiles.save(profile);}
        // Approval creates a health profile, but does not declare the horse medically ready.
        record(h,actor,approved?"HORSE_ADMISSION_APPROVED":"HORSE_ADMISSION_REJECTED",note);return mapper.toResponse(h);
    }
    @Transactional(readOnly=true)
    public String profile(String id){
        return profiles.findByHorse_HorseId(id).orElseThrow(()->new ResourceNotFoundException("Health profile not found; submit the horse for examination first")).getProfileId();
    }
    private Horse locked(String id){return horses.findByIdForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Horse not found"));}
    private void record(Horse h,String actor,String action,String note){audit.record(actor,h.getHorseId(),"HORSE",h.getHorseId(),action,"SUCCESS",note);}
>>>>>>> 76de6e5 (luu code)
}
