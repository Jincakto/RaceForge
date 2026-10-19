package com.raceforge.backend.horse.admission;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class AdmissionService {
    private final AdmissionRepository admissions;
    private final AssignmentRepository assignments;
    private final HorseRepository horses;
    private final UserRepository users;
    private final HealthProfileRepository profiles;
    private final MedicalRecordRepository records;
    private final NotificationService notifications;
    private final AuditLogService audit;
    public AdmissionService(AdmissionRepository admissions, AssignmentRepository assignments, HorseRepository horses,
            UserRepository users, HealthProfileRepository profiles, MedicalRecordRepository records,
            NotificationService notifications, AuditLogService audit) {
        this.admissions=admissions; this.assignments=assignments; this.horses=horses; this.users=users;
        this.profiles=profiles; this.records=records; this.notifications=notifications; this.audit=audit;
    }
    public record View(Admission admission, String horseName, String ownerId, Integer profileId,
                       List<Assignment> assignments) {}
    public record Staff(String userId, String fullName, String role) {}
    public AuthenticatedUser actor() {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)
                || !"ACTIVE".equals(user.status())) throw error(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED","Active login required");
        return user;
    }
    public void requireRole(String role) {
        if(!role.equals(actor().roleName())) throw error(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Required role: "+role);
    }
    public void register(Horse horse) {
        Admission a=new Admission(); a.horseId=horse.getHorseId(); a.status="PENDING_REVIEW"; a.createdAt=LocalDateTime.now();
        admissions.save(a);
        HealthProfile profile=new HealthProfile(); profile.setHorse(horse); profiles.save(profile);
        managers(horse.getHorseId(),"New horse registration awaiting veterinarian assignment");
    }
    private Horse locked(String id) { return horses.findByIdForUpdate(id).orElseThrow(()->error(HttpStatus.NOT_FOUND,"HORSE_NOT_FOUND","Horse not found")); }
    private Admission admission(String id) { return admissions.findById(id).orElseThrow(()->error(HttpStatus.CONFLICT,"ADMISSION_MISSING","Admission needs migration/review")); }
    private void state(Admission a,String... allowed) {
        if(!List.of(allowed).contains(a.status)) throw error(HttpStatus.CONFLICT,"INVALID_ADMISSION_STATE","Cannot perform this action in "+a.status);
    }
    public boolean canRead(Horse h) {
        var u=actor();
        return "CLUB_MANAGER".equals(u.roleName()) || Objects.equals(h.getOwner().getUserId(),u.userId())
            || assignments.findByHorseIdOrderByIdDesc(h.getHorseId()).stream().anyMatch(a->a.assigneeId.equals(u.userId()))
            || (h.getHeadTrainer()!=null && h.getHeadTrainer().getUserId().equals(u.userId()))
            || ("VETERINARIAN".equals(u.roleName()) && profiles.findByHorse_HorseId(h.getHorseId())
                .map(p->records.findByHealthProfile_ProfileIdOrderByExaminedAtDesc(p.getProfileId()).stream()
                    .anyMatch(r->r.getVeterinarian().getUserId().equals(u.userId()))).orElse(false));
    }
    public void checkRead(Horse h) { if(!canRead(h)) throw error(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Horse is not assigned to this account"); }
    @Transactional(readOnly=true)
    public List<View> list() { return horses.findAll().stream().filter(this::canRead).map(this::view).toList(); }
    @Transactional(readOnly=true)
    public View get(String id) { Horse h=horses.findById(id).orElseThrow(()->error(HttpStatus.NOT_FOUND,"HORSE_NOT_FOUND","Horse not found")); checkRead(h); return view(h); }
    private View view(Horse h) {
        return new View(admission(h.getHorseId()),h.getHorseName(),h.getOwner().getUserId(),
            profiles.findByHorse_HorseId(h.getHorseId()).map(HealthProfile::getProfileId).orElse(null), assignments.findByHorseIdOrderByIdDesc(h.getHorseId()));
    }
    @Transactional(readOnly=true)
    public List<Staff> staff() {
        requireRole("CLUB_MANAGER");
        return users.findAll().stream().filter(u->"ACTIVE".equals(u.getStatus()) && u.getRole()!=null
            && List.of("VETERINARIAN","HEAD_TRAINER").contains(u.getRole().getRoleName()))
            .map(u->new Staff(u.getUserId(),u.getFullName(),u.getRole().getRoleName())).toList();
    }
    public View assign(String id,String kind,String assigneeId) {
        requireRole("CLUB_MANAGER"); Horse h=locked(id); Admission a=admission(id);
        boolean vet="VET".equals(kind);
        if(!vet && !"TRAINER".equals(kind)) throw error(HttpStatus.BAD_REQUEST,"INVALID_KIND","Use VET or TRAINER");
        if(vet) state(a,"PENDING_REVIEW","AWAITING_VET_REASSIGNMENT","NEEDS_REVIEW");
        else state(a,"AWAITING_TRAINER_ASSIGNMENT","AWAITING_TRAINER_REASSIGNMENT");
        User recipient=users.findDetailedById(assigneeId).orElseThrow(()->error(HttpStatus.NOT_FOUND,"USER_NOT_FOUND","Assignee not found"));
        if(!"ACTIVE".equals(recipient.getStatus()) || recipient.getRole()==null || !(vet?"VETERINARIAN":"HEAD_TRAINER").equals(recipient.getRole().getRoleName()))
            throw error(HttpStatus.BAD_REQUEST,"INVALID_ASSIGNEE","Assignee must have the active matching role");
        if(vet && profiles.findByHorse_HorseId(id).isEmpty()) { HealthProfile p=new HealthProfile(); p.setHorse(h); profiles.save(p); }
        Assignment task=new Assignment(); task.horseId=id; task.kind=kind; task.assignedBy=actor().userId(); task.assigneeId=assigneeId;
        task.status="PENDING"; task.createdAt=LocalDateTime.now(); assignments.save(task);
        a.status=vet?"AWAITING_VET_ACCEPTANCE":"AWAITING_TRAINER_ACCEPTANCE";
        event(id,"ASSIGN_"+kind,assigneeId);
        notifyUser(assigneeId,id,"New "+kind+" assignment awaiting your response"); return view(h);
    }
    public View respond(String id,Integer assignmentId,String action,String reason) {
        Horse h=locked(id); Admission a=admission(id);
        Assignment task=assignments.findById(assignmentId).filter(t->t.horseId.equals(id))
            .orElseThrow(()->error(HttpStatus.NOT_FOUND,"ASSIGNMENT_NOT_FOUND","Assignment not found"));
        boolean cancel="CANCEL".equals(action); boolean vet="VET".equals(task.kind);
        if(cancel) requireRole("CLUB_MANAGER");
        else { requireRole(vet?"VETERINARIAN":"HEAD_TRAINER"); if(!task.assigneeId.equals(actor().userId())) throw error(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Only the assigned recipient may respond"); }
        if(!List.of("ACCEPT","REJECT","CANCEL").contains(action)) throw error(HttpStatus.BAD_REQUEST,"INVALID_ACTION","Use ACCEPT, REJECT or CANCEL");
        if(!"PENDING".equals(task.status)) throw error(HttpStatus.CONFLICT,"ASSIGNMENT_ALREADY_HANDLED","Assignment already handled");
        state(a,vet?"AWAITING_VET_ACCEPTANCE":"AWAITING_TRAINER_ACCEPTANCE");
        task.respondedAt=LocalDateTime.now();
        if("ACCEPT".equals(action)) {
            task.status="ACCEPTED"; a.status=vet?"AWAITING_EXAMINATION":"COMPLETED";
            if(!vet) { h.setHeadTrainer(users.findById(task.assigneeId).orElseThrow()); h.setStatus("ACTIVE"); }
        } else {
            task.reason=reason(reason); task.status=cancel?"CANCELLED":"REJECTED";
            a.status=vet?"AWAITING_VET_REASSIGNMENT":"AWAITING_TRAINER_REASSIGNMENT";
        }
        event(id,action+"_"+task.kind,task.reason); managers(id,task.kind+" "+task.status+(task.reason==null?"":": "+task.reason));
        if(cancel) notifyUser(task.assigneeId,id,"Assignment cancelled: "+task.reason);
        if("COMPLETED".equals(a.status)) notifyUser(h.getOwner().getUserId(),id,"Trainer accepted horse; admission completed");
        return view(h);
    }
    public void checkInitial(String id,String vetId,String recordId,boolean correction) {
        locked(id); Admission a=admission(id);
        // Corrections after admission retain the original author's checks in MedicalRecordService.
        if(correction && !"AWAITING_EXAMINATION".equals(a.status)) return;
        state(a,"AWAITING_EXAMINATION");
        Assignment task=currentVet(id,vetId);
        if(task.medicalRecordId!=null && !task.medicalRecordId.equals(recordId)) throw error(HttpStatus.CONFLICT,"INITIAL_RECORD_EXISTS","Edit the existing initial examination draft");
    }
    public void checkExamination(String id,String vetId,String examType,String recordId,boolean correction) {
        if("INITIAL".equals(examType)) checkInitial(id,vetId,recordId,correction);
        else { locked(id); requireCompleted(id); }
    }
    private Assignment currentVet(String id,String vetId) {
        return assignments.findByHorseIdOrderByIdDesc(id).stream().filter(t->"VET".equals(t.kind) && "ACCEPTED".equals(t.status) && t.assigneeId.equals(vetId))
            .findFirst().orElseThrow(()->error(HttpStatus.FORBIDDEN,"VET_NOT_ASSIGNED","Accept the veterinarian assignment first"));
    }
    public void linkInitial(MedicalRecord record) {
        if("INITIAL".equals(record.getExamType()) && record.getCorrectionOf()==null)
            currentVet(record.getHealthProfile().getHorse().getHorseId(),record.getVeterinarian().getUserId()).medicalRecordId=record.getMedicalRecordId();
    }
    public void examined(MedicalRecord record) {
        if(!"INITIAL".equals(record.getExamType())) return;
        String id=record.getHealthProfile().getHorse().getHorseId(); locked(id); Admission a=admission(id);
        if(record.getCorrectionOf()!=null) {
            if("AWAITING_ADMISSION_DECISION".equals(a.status) && Objects.equals(a.medicalRecordId,record.getCorrectionOf().getMedicalRecordId())) a.medicalRecordId=record.getMedicalRecordId();
            return;
        }
        state(a,"AWAITING_EXAMINATION"); Assignment task=currentVet(id,record.getVeterinarian().getUserId());
        if(!Objects.equals(task.medicalRecordId,record.getMedicalRecordId())) throw error(HttpStatus.CONFLICT,"WRONG_EXAMINATION","Wrong assigned examination");
        task.status="COMPLETED"; a.medicalRecordId=record.getMedicalRecordId(); a.status="AWAITING_ADMISSION_DECISION";
        event(id,"EXAMINATION_COMPLETED",record.getMedicalRecordId());
        managers(id,"Initial examination confirmed; admission decision required");
        notifyUser(record.getHealthProfile().getHorse().getOwner().getUserId(),id,"Examination completed; awaiting manager decision");
    }
    public View decide(String id,boolean accepted,String reason) {
        requireRole("CLUB_MANAGER"); Horse h=locked(id); Admission a=admission(id); state(a,"AWAITING_ADMISSION_DECISION");
        MedicalRecord record=records.findById(a.medicalRecordId).orElseThrow(()->error(HttpStatus.CONFLICT,"EXAMINATION_REQUIRED","Confirmed examination required"));
        if(!"CONFIRMED".equals(record.getStatus()) || !record.getHealthProfile().getHorse().getHorseId().equals(id)) throw error(HttpStatus.CONFLICT,"EXAMINATION_REQUIRED","Confirmed examination required");
        a.decisionReason=accepted?(reason==null?null:reason.trim()):reason(reason); a.decisionBy=actor().userId(); a.decidedAt=LocalDateTime.now();
        a.status=accepted?"AWAITING_TRAINER_ASSIGNMENT":"REJECTED";
        if(!accepted) h.setStatus("INACTIVE");
        event(id,accepted?"ADMISSION_ACCEPTED":"ADMISSION_REJECTED",a.decisionReason);
        notifyUser(h.getOwner().getUserId(),id,accepted?"Horse accepted; awaiting trainer assignment":"Horse rejected: "+a.decisionReason); return view(h);
    }
    public void requireCompleted(String id) { state(admission(id),"COMPLETED"); }
    public void requireEditable(Horse h) {
        requireRole("HORSE_OWNER"); if(!h.getOwner().getUserId().equals(actor().userId())) throw error(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Only the owner can edit");
        state(admission(h.getHorseId()),"PENDING_REVIEW","AWAITING_VET_REASSIGNMENT");
    }
    private String reason(String value) { if(value==null || value.isBlank() || value.trim().length()>1000) throw error(HttpStatus.BAD_REQUEST,"REASON_REQUIRED","A reason of 1-1000 characters is required"); return value.trim(); }
    private void managers(String id,String message) { users.findActiveManagers().forEach(u->notifyUser(u.getUserId(),id,message)); }
    private void notifyUser(String user,String horse,String message) { notifications.notify(user,"HORSE_ADMISSION",horse,message+" ["+horse+"]"); }
    private void event(String id,String action,String detail) { audit.record(actor().userId(),id,"HORSE",id,action,"SUCCESS",detail); }
    private ApiException error(HttpStatus status,String code,String message) { return new ApiException(status,code,message); }
}
