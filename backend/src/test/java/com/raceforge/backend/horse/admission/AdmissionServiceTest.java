package com.raceforge.backend.horse.admission;

import com.raceforge.backend.account.entity.*;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.repository.*;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.AuthenticatedUser;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdmissionServiceTest {
    AdmissionRepository admissions=mock(AdmissionRepository.class);
    AssignmentRepository assignments=mock(AssignmentRepository.class);
    HorseRepository horses=mock(HorseRepository.class);
    UserRepository users=mock(UserRepository.class);
    HealthProfileRepository profiles=mock(HealthProfileRepository.class);
    MedicalRecordRepository records=mock(MedicalRecordRepository.class);
    NotificationService notifications=mock(NotificationService.class);
    AuditLogService audit=mock(AuditLogService.class);
    AdmissionService service=new AdmissionService(admissions,assignments,horses,users,profiles,records,notifications,audit);
    Horse horse=new Horse(); Admission admission=new Admission(); List<Assignment> tasks=new ArrayList<>(); HealthProfile profile=new HealthProfile();
    @BeforeEach void init() {
        horse.setHorseId("HOR-000"); horse.setOwner(user("OWN-000","HORSE_OWNER")); horse.setStatus("INACTIVE");
        admission.horseId="HOR-000"; admission.status="PENDING_REVIEW"; profile.setHorse(horse); profile.setProfileId(1);
        when(horses.findByIdForUpdate("HOR-000")).thenReturn(Optional.of(horse)); when(horses.findById("HOR-000")).thenReturn(Optional.of(horse));
        when(admissions.findById("HOR-000")).thenReturn(Optional.of(admission)); when(profiles.findByHorse_HorseId("HOR-000")).thenReturn(Optional.of(profile));
        when(assignments.findByHorseIdOrderByIdDesc("HOR-000")).thenAnswer(i->tasks);
        when(assignments.save(any())).thenAnswer(i->{Assignment a=i.getArgument(0);a.id=tasks.size()+1;tasks.add(a);when(assignments.findById(a.id)).thenReturn(Optional.of(a));return a;});
        when(users.findActiveManagers()).thenReturn(List.of(user("CM-000","CLUB_MANAGER")));
        staff("VET-000","VETERINARIAN");staff("HTR-000","HEAD_TRAINER");login("CM-000","CLUB_MANAGER");
    }
    User user(String id,String role) {User u=new User();u.setUserId(id);u.setStatus("ACTIVE");Role r=new Role();r.setRoleName(role);u.setRole(r);return u;}
    void staff(String id,String role){User u=user(id,role);when(users.findDetailedById(id)).thenReturn(Optional.of(u));when(users.findById(id)).thenReturn(Optional.of(u));}
    void login(String id,String role){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new AuthenticatedUser(id,"test@example.com","ACTIVE",1,role),null,List.of()));}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    void assignVet(){service.assign("HOR-000","VET","VET-000");login("VET-000","VETERINARIAN");service.respond("HOR-000",1,"ACCEPT",null);}
    MedicalRecord examination(){MedicalRecord r=new MedicalRecord();r.setMedicalRecordId("MED-000");r.setHealthProfile(profile);r.setVeterinarian(user("VET-000","VETERINARIAN"));r.setExamType("INITIAL");r.setStatus("CONFIRMED");when(records.findById("MED-000")).thenReturn(Optional.of(r));return r;}
    @Test void completeWorkflowRequiresEachActorAndPreservesHealthLock(){
        assignVet();service.checkInitial("HOR-000","VET-000",null,false);MedicalRecord record=examination();service.linkInitial(record);service.examined(record);
        assertEquals("AWAITING_ADMISSION_DECISION",admission.status);horse.setTrainingLocked(true);
        login("CM-000","CLUB_MANAGER");service.decide("HOR-000",true,null);service.assign("HOR-000","TRAINER","HTR-000");
        assertEquals("INACTIVE",horse.getStatus());login("HTR-000","HEAD_TRAINER");service.respond("HOR-000",2,"ACCEPT",null);
        assertEquals("COMPLETED",admission.status);assertEquals("HTR-000",horse.getHeadTrainer().getUserId());assertTrue(horse.getTrainingLocked());assertEquals("ACTIVE",horse.getStatus());
    }
    @Test void cannotDecideOrAssignTrainerBeforeExamination(){assertThrows(ApiException.class,()->service.decide("HOR-000",true,null));assertThrows(ApiException.class,()->service.assign("HOR-000","TRAINER","HTR-000"));}
    @Test void periodicExaminationCannotBypassInitialAssignment(){
        assertThrows(ApiException.class,()->service.checkExamination("HOR-000","VET-000","PERIODIC",null,false));
        assignVet();
        assertThrows(ApiException.class,()->service.checkExamination("HOR-000","VET-000","FOLLOW_UP",null,false));
        admission.status="COMPLETED";
        service.checkExamination("HOR-000","VET-000","PERIODIC",null,false);
    }
    @Test void onlyRecipientCanAccept(){service.assign("HOR-000","VET","VET-000");login("VET-001","VETERINARIAN");assertEquals(403,assertThrows(ApiException.class,()->service.respond("HOR-000",1,"ACCEPT",null)).getStatus().value());}
    @Test void rejectionRequiresReasonAndAllowsReassignment(){service.assign("HOR-000","VET","VET-000");login("VET-000","VETERINARIAN");assertThrows(ApiException.class,()->service.respond("HOR-000",1,"REJECT"," "));service.respond("HOR-000",1,"REJECT","Unavailable");assertEquals("AWAITING_VET_REASSIGNMENT",admission.status);login("CM-000","CLUB_MANAGER");service.assign("HOR-000","VET","VET-000");assertEquals(2,tasks.size());assertEquals("Unavailable",tasks.get(0).reason);}
    @Test void duplicateAcceptDoesNotNotifyTwice(){assignVet();clearInvocations(notifications);assertThrows(ApiException.class,()->service.respond("HOR-000",1,"ACCEPT",null));verifyNoInteractions(notifications);}
    @Test void cannotCancelAcceptedAssignment(){assignVet();login("CM-000","CLUB_MANAGER");assertThrows(ApiException.class,()->service.respond("HOR-000",1,"CANCEL","replace"));}
    @Test void cannotCreateSecondInitialDraft(){assignVet();service.linkInitial(examination());assertThrows(ApiException.class,()->service.checkInitial("HOR-000","VET-000",null,false));service.checkInitial("HOR-000","VET-000","MED-000",false);}
    @Test void ownerCannotAssignAndCannotReadAnotherHorse(){login("OWN-001","HORSE_OWNER");assertThrows(ApiException.class,()->service.assign("HOR-000","VET","VET-000"));assertThrows(ApiException.class,()->service.get("HOR-000"));}
    @Test void admissionRejectionPersistsReason(){assignVet();MedicalRecord r=examination();service.linkInitial(r);service.examined(r);login("CM-000","CLUB_MANAGER");assertThrows(ApiException.class,()->service.decide("HOR-000",false,""));service.decide("HOR-000",false,"Requires specialist care");assertEquals("REJECTED",admission.status);assertEquals("Requires specialist care",admission.decisionReason);}
    @Test void cancellationNotifiesRecipientAndCannotBeAccepted(){service.assign("HOR-000","VET","VET-000");service.respond("HOR-000",1,"CANCEL","Reschedule");assertEquals("CANCELLED",tasks.get(0).status);login("VET-000","VETERINARIAN");assertThrows(ApiException.class,()->service.respond("HOR-000",1,"ACCEPT",null));}
}
