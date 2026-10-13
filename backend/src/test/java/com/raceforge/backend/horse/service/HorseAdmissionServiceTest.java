package com.raceforge.backend.horse.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
class HorseAdmissionServiceTest {
 final HorseRepository horses=mock(HorseRepository.class);
 final HealthProfileRepository profiles=mock(HealthProfileRepository.class);
 final HorseAdmissionService service=new HorseAdmissionService(horses,new HorseMapper(),profiles,mock(AuditLogService.class));
 Horse horse(String admission){var h=new Horse();h.setHorseId(14);var owner=new User();owner.setUserId(7);h.setOwner(owner);h.setStatus("INACTIVE");h.setAdmissionStatus(admission);when(horses.findByIdForUpdate(14)).thenReturn(Optional.of(h));return h;}
 @Test void ownerSubmitDoesNotActivateHorse(){var h=horse("NOT_SUBMITTED");service.submit(14,7);assertEquals("PENDING",h.getAdmissionStatus());assertEquals("INACTIVE",h.getStatus());assertNull(h.getHealthStatus());}
 @Test void anotherOwnerCannotSubmit(){horse("NOT_SUBMITTED");assertThrows(BusinessRuleException.class,()->service.submit(14,8));}
 @Test void duplicateSubmitIsRejected(){horse("PENDING");assertThrows(BusinessRuleException.class,()->service.submit(14,7));}
 @Test void approvalCreatesProfileWithoutMedicalClearance(){var h=horse("PENDING");when(profiles.findByHorse_HorseId(14)).thenReturn(Optional.empty());service.review(14,1,true,"OK");verify(profiles).save(any(HealthProfile.class));assertEquals("APPROVED",h.getAdmissionStatus());assertNull(h.getHealthStatus());assertEquals("INACTIVE",h.getStatus());}
 @Test void rejectionRequiresReasonAndDoesNotCreateProfile(){var h=horse("PENDING");assertThrows(BusinessRuleException.class,()->service.review(14,1,false," "));assertEquals("PENDING",h.getAdmissionStatus());service.review(14,1,false,"Missing information");assertEquals("REJECTED",h.getAdmissionStatus());verify(profiles,never()).save(any());}
 @Test void cannotReviewTwice(){horse("APPROVED");assertThrows(BusinessRuleException.class,()->service.review(14,1,true,""));}
}
