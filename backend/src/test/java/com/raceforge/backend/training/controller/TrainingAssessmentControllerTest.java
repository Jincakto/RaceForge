package com.raceforge.backend.training.controller;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.permission.service.PermissionAccess;
import com.raceforge.backend.security.*;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.service.*;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {TrainingAssessmentController.class, TrainingSessionController.class,
        TrainingScheduleController.class})
@Import({SecurityConfig.class, AuthProperties.class})
class TrainingAssessmentControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtService jwt;
    @MockitoBean UserRepository users;
    @MockitoBean TrainingAssessmentService assessments;
    @MockitoBean TrainingAssessmentNotificationService notifications;
    @MockitoBean TrainingSessionService sessions;
    @MockitoBean TrainingSessionFeedbackService feedback;
    @MockitoBean TrainingScheduleService schedule;
    @MockitoBean(name = "permissionAccess") PermissionAccess permissionAccess;

    @BeforeEach void setup() {
        when(permissionAccess.has(any(), eq("MANAGE_TRAINING"))).thenReturn(true);
        when(sessions.completeSession(anyString(), any(), anyString())).thenAnswer(inv -> {
            var request = inv.getArgument(1, CompleteSessionRequest.class);
            new TrainingAssessmentValidator().validate(request.getAssessment());
            return new TrainingSessionResponse();
        });
    }

    @Test void missingTokenIsUnauthorized() throws Exception {
        mvc.perform(get("/api/training-assessments/template")).andExpect(status().isUnauthorized());
        verifyNoInteractions(assessments);
    }

    @Test void expiredTokenIsUnauthorized() throws Exception {
        when(jwt.parse("token")).thenThrow(new io.jsonwebtoken.ExpiredJwtException(null, null, "expired"));
        mvc.perform(get("/api/training-assessments/template").header("Authorization","Bearer token"))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest @ValueSource(strings={"HORSE_OWNER","GROOM","USER"})
    void otherRolesCannotOpenAssessmentOrTemplate(String role) throws Exception {
        authenticate(role, "ACTIVE");
        for (var path : new String[]{"/api/training-assessments/template",
                "/api/training-sessions/SES-001/assessment", "/api/training-assessments/notifications/41/target"}) {
            mvc.perform(get(path).header("Authorization","Bearer token")).andExpect(status().isForbidden());
        }
        verifyNoInteractions(assessments, notifications);
    }

    @ParameterizedTest @ValueSource(strings={"HEAD_TRAINER","VETERINARIAN","CLUB_MANAGER"})
    void readRolesCanReachScopedService(String role) throws Exception {
        authenticate(role, "ACTIVE");
        mvc.perform(get("/api/training-sessions/SES-001/assessment").header("Authorization","Bearer token"))
                .andExpect(status().isOk());
        verify(assessments).get("SES-001");
    }

    @Test void scopedServiceDenialReturnsForbidden() throws Exception {
        authenticate("VETERINARIAN", "ACTIVE");
        when(assessments.get("SES-001")).thenThrow(new AccessDeniedException("Not assigned to this horse."));
        mvc.perform(get("/api/training-sessions/SES-001/assessment").header("Authorization","Bearer token"))
                .andExpect(status().isForbidden());
    }

    @Test void inactiveAccountHasNoBusinessAccess() throws Exception {
        authenticate("HEAD_TRAINER", "PENDING");
        mvc.perform(get("/api/training-assessments/template").header("Authorization","Bearer token"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(assessments);
    }

    @ParameterizedTest @ValueSource(strings={"VETERINARIAN","CLUB_MANAGER","HORSE_OWNER"})
    void onlyTrainerMaySendManualNotification(String role) throws Exception {
        authenticate(role, "ACTIVE");
        mvc.perform(post("/api/training-sessions/SES-001/vet-notification")
                .header("Authorization","Bearer token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Please check this horse.\"}")).andExpect(status().isForbidden());
        verify(assessments, never()).manual(anyString(), any());
    }

    @Test void manualNotificationRequiresManageTraining() throws Exception {
        authenticate("HEAD_TRAINER", "ACTIVE");
        when(permissionAccess.has(any(), eq("MANAGE_TRAINING"))).thenReturn(false);
        mvc.perform(post("/api/training-sessions/SES-001/vet-notification")
                .header("Authorization","Bearer token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Please check this horse.\"}")).andExpect(status().isForbidden());
    }

    @Test void manualNotificationUsesSessionAndReasonNotRecipientFromClient() throws Exception {
        authenticate("HEAD_TRAINER","ACTIVE");
        mvc.perform(post("/api/training-sessions/SES-001/vet-notification")
                .header("Authorization","Bearer token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Please check this horse.\"}")).andExpect(status().isOk());
        verify(assessments).manual("SES-001", "Please check this horse.");
    }

    @Test void targetUsesIntegerNotificationId() throws Exception {
        authenticate("VETERINARIAN","ACTIVE");
        when(notifications.target(41)).thenReturn(new TrainingNotificationTargetResponse(
                "SES-001","HOR-001","TRAINING_ASSESSMENT","/training/assessments/SES-001"));
        mvc.perform(get("/api/training-assessments/notifications/41/target")
                .header("Authorization","Bearer token")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value("SES-001"));
        verify(notifications).target(41);
    }

    @Test void pendingStartReturnsStableConflictCode() throws Exception {
        authenticate("HEAD_TRAINER","ACTIVE");
        when(sessions.startSession("SES-002")).thenThrow(new ApiException(HttpStatus.CONFLICT,
                "PENDING_POST_TRAINING_REVIEW", "Training is paused until a vet review is completed."));
        mvc.perform(patch("/api/training-sessions/SES-002/start").header("Authorization","Bearer token"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data.code").value("PENDING_POST_TRAINING_REVIEW"));
    }

    @Test void missingAssessmentCannotCompleteThroughHttp() throws Exception {
        authenticate("HEAD_TRAINER","ACTIVE");
        mvc.perform(patch("/api/training-sessions/SES-001/complete").header("Authorization","Bearer token")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.code").value("ASSESSMENT_REQUIRED"));
    }

    @Test void invalidAssessmentBooleanRejectedBeforeSessionService() throws Exception {
        authenticate("HEAD_TRAINER","ACTIVE");
        mvc.perform(patch("/api/training-sessions/SES-001/complete").header("Authorization","Bearer token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"assessment\":{\"checklistVersion\":\"POST_TRAINING_V1\",\"checks\":{\"ALERTNESS\":\"true\"}}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.code").value("ASSESSMENT_INCOMPLETE"));
        verify(sessions,never()).completeSession(anyString(), any(), anyString());
    }

    @Test void attendanceMissedDoesNotRequireAssessment() throws Exception {
        authenticate("HEAD_TRAINER","ACTIVE");
        when(schedule.submitAttendance(eq("SES-001"), any(), eq("USR-TEST")))
                .thenReturn(new AttendanceResponse(new TrainingSessionResponse(), false, null));
        mvc.perform(put("/api/training-sessions/SES-001/attendance").header("Authorization","Bearer token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"MISSED\",\"absenceReason\":\"BAD_WEATHER\"}"))
                .andExpect(status().isOk());
        verify(schedule).submitAttendance(eq("SES-001"), any(), eq("USR-TEST"));
    }

    @Test void duplicateRootAssessmentRejectedBeforeSessionService() throws Exception {
        authenticate("HEAD_TRAINER","ACTIVE");
        mvc.perform(patch("/api/training-sessions/SES-001/complete").header("Authorization","Bearer token")
                .contentType(MediaType.APPLICATION_JSON).content("{\"assessment\":{},\"assessment\":{}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.code").value("INVALID_CRITERION_CODE"));
        verify(sessions,never()).completeSession(anyString(),any(),anyString());
    }

    private void authenticate(String name, String status) {
        int roleId = switch(name) {
            case "HEAD_TRAINER" -> 2; case "VETERINARIAN" -> 3;
            case "HORSE_OWNER" -> 5; case "GROOM" -> 4; case "USER" -> 6; default -> 1;
        };
        var role = new Role(); role.setRoleId(roleId); role.setRoleName(name);
        var user = new User(); user.setUserId("USR-TEST"); user.setRole(role);
        user.setStatus(status); user.setEmail("staff@example.com");
        when(jwt.parse("token")).thenReturn(new AuthenticatedUser("USR-TEST",user.getEmail(),status,roleId,name));
        when(users.findDetailedById("USR-TEST")).thenReturn(Optional.of(user));
    }
}
