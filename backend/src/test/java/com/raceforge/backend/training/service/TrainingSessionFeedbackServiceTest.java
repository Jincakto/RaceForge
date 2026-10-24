package com.raceforge.backend.training.service;
import org.junit.jupiter.api.*;import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;
import com.raceforge.backend.training.repository.TrainingSessionRepository;import com.raceforge.backend.training.entity.*;import java.util.*;
class TrainingSessionFeedbackServiceTest {
 TrainingSessionRepository repo;TrainingWorkflowGuard guard;TrainingSessionFeedbackService service;TrainingSession s;
 @BeforeEach void setup(){repo=mock(TrainingSessionRepository.class);guard=mock(TrainingWorkflowGuard.class);service=new TrainingSessionFeedbackService(repo,guard);s=new TrainingSession();s.setPlan(new TrainingPlan());s.setStatus("COMPLETED");s.setEndExerciseHeartRate(200);when(repo.findById("SES-001")).thenReturn(Optional.of(s));}
 String action(int recovery){s.setRecoveryHeartRate2Min(recovery);return (String)service.feedback("SES-001").get("suggestedAction");}
 @Test void boundaryBelow20(){assertEquals("REVIEW_REDUCTION",action(161));}
 @Test void boundaryExactly20(){assertEquals("REVIEW_MAINTENANCE",action(160));}
 @Test void boundaryBelow40(){assertEquals("REVIEW_MAINTENANCE",action(121));}
 @Test void boundaryExactly40(){assertEquals("REVIEW_INCREASE",action(120));}
 @Test void above40(){assertEquals("REVIEW_INCREASE",action(100));}
 @Test void risingRecovery(){assertEquals("REVIEW_REDUCTION",action(210));assertTrue(service.feedback("SES-001").get("note").toString().contains("Check the measurements"));}
 @Test void equalReadings(){assertEquals("REVIEW_REDUCTION",action(200));}
 @Test void missingInvalidOrIncomplete(){assertEquals("INSUFFICIENT_DATA",service.feedback("SES-001").get("suggestedAction"));s.setEndExerciseHeartRate(0);assertEquals("INSUFFICIENT_DATA",action(100));s.setEndExerciseHeartRate(200);s.setStatus("SCHEDULED");assertEquals("INSUFFICIENT_DATA",action(100));}
 @Test void noHistoryOrTimestampRequired(){s.setRecoveryHeartRate2Min(120);var r=service.feedback("SES-001");assertEquals("REVIEW_INCREASE",r.get("suggestedAction"));assertEquals(false,r.get("automaticScheduleChange"));assertEquals(true,r.get("requiresTrainerConfirmation"));assertNotNull(r.get("note"));}
 @Test void unauthorized(){doThrow(new org.springframework.security.access.AccessDeniedException("Denied")).when(guard).authorizePlan(s.getPlan());assertThrows(org.springframework.security.access.AccessDeniedException.class,()->action(100));}
 @Test void configIsValidated(){org.springframework.test.util.ReflectionTestUtils.setField(service,"reductionRatio",0.5);org.springframework.test.util.ReflectionTestUtils.setField(service,"increaseRatio",0.4);assertThrows(IllegalStateException.class,service::validateThresholds);}
}
