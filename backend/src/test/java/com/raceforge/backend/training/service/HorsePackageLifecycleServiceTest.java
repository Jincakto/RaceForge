package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.permission.service.PermissionService;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class HorsePackageLifecycleServiceTest {
    final HorsePackageRepository packages = mock(HorsePackageRepository.class);
    final HorseRepository horses = mock(HorseRepository.class);
    final TrainingSessionRepository sessions = mock(TrainingSessionRepository.class);
    final TrainingCertificateRepository certificates = mock(TrainingCertificateRepository.class);
    final TrainerAssignmentService assignments = mock(TrainerAssignmentService.class);
    final TrainingWorkflowGuard guard = mock(TrainingWorkflowGuard.class);
    final PermissionService permissions = mock(PermissionService.class);
    final TrainingScheduleCoordinator schedule = mock(TrainingScheduleCoordinator.class);
    final PackageEventService events = mock(PackageEventService.class);
    final EntityManager em = mock(EntityManager.class);
    final LocalDate today = LocalDate.of(2026, 11, 11);
    final HorsePackageLifecycleService service = new HorsePackageLifecycleService(packages, horses, sessions,
            certificates, assignments, guard, permissions, schedule, events, new HorsePackageMapper(), em,
            Clock.fixed(today.atStartOfDay(ZoneId.of("Asia/Bangkok")).toInstant(), ZoneId.of("Asia/Bangkok")));
    Horse horse;
    HorsePackage registration;

    @BeforeEach void setup() {
        var owner = new User(); owner.setUserId("OWN-001");
        horse = new Horse(); horse.setHorseId("HOR-001"); horse.setHorseName("Test horse");
        horse.setOwner(owner); horse.setStatus("ACTIVE"); horse.setHealthStatus("READY"); horse.setTrainingLocked(false);
        var catalogue = new TrainingPackage(); catalogue.setPackageId("PKG-001"); catalogue.setPackageType("BASIC");
        registration = new HorsePackage(); registration.setHorsePackageId("HPG-001");
        registration.setHorse(horse); registration.setTrainingPackage(catalogue);
        registration.setStatus("ACTIVE"); registration.setPaymentStatus("PAID"); registration.setRemainingDays(15);
        registration.setStartDate(today.minusDays(10)); registration.setEndDate(today.plusDays(19));
        when(packages.findById("HPG-001")).thenReturn(Optional.of(registration));
        when(packages.findForUpdate("HPG-001")).thenReturn(Optional.of(registration));
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
        when(assignments.closeForPackage(eq("HPG-001"), anyString())).thenReturn(List.of("HTR-001"));
        when(guard.canAccessPackage("HPG-001", "HTR-001")).thenReturn(true);
        when(permissions.hasPermission("HEAD_TRAINER", "MANAGE_TRAINING")).thenReturn(true);
        when(certificates.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        owner();
    }
    void owner() { actor("OWN-001", "HORSE_OWNER"); }
    void trainer() { actor("HTR-001", "HEAD_TRAINER"); }
    void actor(String id, String role) {
        when(guard.actor()).thenReturn(new AuthenticatedUser(id,"test@example.invalid","ACTIVE",1,role));
    }
    TrainingSession session(String id, String status, boolean started) {
        var s = new TrainingSession(); s.setSessionId(id); s.setStatus(status);
        s.setHorse(horse); s.setScheduledStart(today.minusDays(2).atTime(7,0));
        if (started) s.setActualStart(today.atTime(7,0));
        return s;
    }
    void conflict(String code, Runnable action) {
        var e = assertThrows(ApiException.class, action::run); assertEquals(HttpStatus.CONFLICT,e.getStatus());
        assertEquals(code,e.getCode());
    }

    @ParameterizedTest @ValueSource(strings={"ACTIVE","PAUSED"})
    void cancelDeletesOnlyUnstartedScheduledWorkAndRetainsPaidHistory(String status) {
        registration.setStatus(status); horse.setTrainingLocked(true);
        var past = session("SES-001","SCHEDULED",false);
        var future = session("SES-002","SCHEDULED",false); future.setScheduledStart(today.plusDays(2).atTime(7,0));
        var completed = session("SES-003","COMPLETED",true);
        var missed = session("SES-004","MISSED",false);
        var cancelled = session("SES-005","CANCELLED",false);
        when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(past,future,completed,missed,cancelled));
        var result = service.cancel("HPG-001");
        assertEquals("CANCELLED",result.registration().status()); assertEquals(2,result.deletedSessionCount());
        assertEquals("PAID",registration.getPaymentStatus()); assertNull(result.certificate());
        verify(sessions).deleteAll(List.of(past,future)); verify(sessions).flush();
        verify(events).notifyPackageTrainers(eq("HOR-001"),eq(List.of("HTR-001")),eq("TRAINING_PACKAGE_CANCELLED"),anyString());
        assertEquals("ACTIVE",horse.getStatus()); assertTrue(horse.getTrainingLocked());
        verifyNoInteractions(certificates);
        var order = inOrder(schedule, em, packages, sessions, assignments);
        order.verify(schedule).lockSchedule(); order.verify(em).refresh(horse,LockModeType.PESSIMISTIC_WRITE);
        order.verify(packages).findForUpdate("HPG-001"); order.verify(sessions).findForPackageForUpdate("HPG-001");
        order.verify(sessions).deleteAll(List.of(past,future)); order.verify(assignments).closeForPackage(eq("HPG-001"),anyString());
    }
    @ParameterizedTest @ValueSource(booleans={false,true})
    void startedOrStoppedButUnsubmittedSessionBlocksCancel(boolean stopped) {
        var s=session("SES-001","SCHEDULED",true); if(stopped)s.setActualEnd(today.atTime(7,10));
        when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(s));
        conflict("PACKAGE_HAS_UNFINISHED_SESSION",()->service.cancel("HPG-001"));
        verify(sessions,never()).deleteAll(any()); verify(packages,never()).saveAndFlush(any());
        verifyNoInteractions(assignments,events);
    }
    @ParameterizedTest @ValueSource(strings={"PENDING","CANCELLED","COMPLETED","EXPIRED"})
    void cancelRejectsNonCancellableStates(String status) {
        registration.setStatus(status); conflict("PACKAGE_NOT_CANCELLABLE",()->service.cancel("HPG-001"));
        verifyNoInteractions(sessions,assignments,events);
    }
    @Test void cancelRejectsUnpaidPackage() {
        registration.setPaymentStatus("PENDING"); conflict("PACKAGE_NOT_CANCELLABLE",()->service.cancel("HPG-001"));
    }
    @Test void wrongOwnerCannotMutateAnything() {
        actor("OWN-002","HORSE_OWNER"); assertThrows(AccessDeniedException.class,()->service.cancel("HPG-001"));
        verifyNoInteractions(sessions,assignments,events);
    }
    @Test void otherRolesCannotCancel() {
        trainer(); assertThrows(AccessDeniedException.class,()->service.cancel("HPG-001")); verifyNoInteractions(schedule);
    }
    @Test void unknownPackageIs404() {
        assertThrows(ResourceNotFoundException.class,()->service.cancel("HPG-999"));
    }
    @Test void deleteFailureIsPropagatedWithoutChangingRegistration() {
        when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(session("SES-001","SCHEDULED",false)));
        doThrow(new IllegalStateException("foreign key")).when(sessions).flush();
        assertThrows(IllegalStateException.class,()->service.cancel("HPG-001"));
        assertEquals("ACTIVE",registration.getStatus()); verifyNoInteractions(assignments,events);
    }
    @Test void mixedCompletedMissedAndCancelledSessionsAllowCompletion() {
        trainer(); var s=session("SES-001","COMPLETED",true); s.setRecordedBy("OLD-TRAINER");
        when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(s,session("SES-002","MISSED",false),session("SES-003","CANCELLED",false)));
        var result=service.complete("HPG-001");
        assertEquals("COMPLETED",result.registration().status()); assertEquals(0,registration.getRemainingDays());
        assertEquals("RF-HPG-001",result.certificate().certificateNumber()); assertEquals(today,result.certificate().issueDate());
        var captor=ArgumentCaptor.forClass(TrainingCertificate.class); verify(certificates).saveAndFlush(captor.capture());
        horse.setHorseName("Changed later"); assertEquals("Test horse",captor.getValue().getHorseNameAtIssue());
        verify(sessions,never()).deleteAll(any());
        verify(events).notifyOwner(eq("OWN-001"),eq("HOR-001"),eq("TRAINING_PACKAGE_COMPLETED"),anyString());
    }
    @Test void allMissedSessionsCountAsFinishedBySelectedPolicy() {
        trainer(); when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(session("SES-001","MISSED",false)));
        assertNotNull(service.complete("HPG-001").certificate());
    }
    @Test void noSessionsCannotComplete() {
        trainer(); conflict("PACKAGE_SESSIONS_NOT_FINISHED",()->service.complete("HPG-001")); verifyNoInteractions(certificates,assignments,events);
    }
    @Test void onlyCancelledSessionsCannotComplete() {
        trainer(); when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(session("SES-001","CANCELLED",false)));
        conflict("PACKAGE_SESSIONS_NOT_FINISHED",()->service.complete("HPG-001"));
    }
    @ParameterizedTest @ValueSource(booleans={false,true})
    void scheduledSessionsBlockCompletionWhetherStartedOrNot(boolean started) {
        trainer(); when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(session("SES-001","SCHEDULED",started)));
        conflict("PACKAGE_SESSIONS_NOT_FINISHED",()->service.complete("HPG-001")); verifyNoInteractions(certificates);
    }
    @ParameterizedTest @ValueSource(strings={"PENDING","PAUSED","CANCELLED","COMPLETED","EXPIRED"})
    void completeRejectsNonActiveStates(String status) {
        trainer(); registration.setStatus(status); conflict("PACKAGE_NOT_COMPLETABLE",()->service.complete("HPG-001"));
    }
    @Test void completeCannotBeDoneAfterExpiry() {
        trainer(); registration.setEndDate(today.minusDays(1)); conflict("PACKAGE_NOT_COMPLETABLE",()->service.complete("HPG-001"));
    }
    @Test void completeCannotBeDoneBeforePackageStarts() {
        trainer(); registration.setStartDate(today.plusDays(1)); conflict("PACKAGE_NOT_COMPLETABLE",()->service.complete("HPG-001"));
    }
    @Test void completeRequiresPayment() {
        trainer(); registration.setPaymentStatus("FAILED"); conflict("PACKAGE_NOT_COMPLETABLE",()->service.complete("HPG-001"));
    }
    @Test void finalDayIsStillWithinTerm() {
        trainer(); registration.setEndDate(today); when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(session("SES-001","COMPLETED",true)));
        assertNotNull(service.complete("HPG-001").certificate());
    }
    @Test void anotherTrainerCannotComplete() {
        actor("HTR-002","HEAD_TRAINER"); assertThrows(AccessDeniedException.class,()->service.complete("HPG-001"));
    }
    @Test void missingManageTrainingIsForbiddenBeforeAnyMutation() {
        trainer(); when(permissions.hasPermission("HEAD_TRAINER","MANAGE_TRAINING")).thenReturn(false);
        assertThrows(AccessDeniedException.class,()->service.complete("HPG-001")); verifyNoInteractions(schedule);
    }
    @Test void ownerCannotComplete() {
        assertThrows(AccessDeniedException.class,()->service.complete("HPG-001")); verifyNoInteractions(schedule);
    }
    @Test void historicalCallerGetsConflictAfterAssignmentWasClosed() {
        trainer(); registration.setStatus("COMPLETED"); when(guard.canAccessPackage("HPG-001","HTR-001")).thenReturn(false);
        when(assignments.hasPackageHistory("HPG-001","HTR-001")).thenReturn(true);
        conflict("PACKAGE_ALREADY_ENDED",()->service.complete("HPG-001")); verifyNoInteractions(certificates);
    }
    @Test void existingCertificateIsNotOverwritten() {
        trainer(); when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(session("SES-001","COMPLETED",true)));
        when(certificates.existsById("HPG-001")).thenReturn(true);
        conflict("PACKAGE_CERTIFICATE_EXISTS",()->service.complete("HPG-001")); verify(certificates,never()).saveAndFlush(any());
    }
    @Test void issuanceFailureIsPropagatedForTransactionRollback() {
        trainer(); when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of(session("SES-001","COMPLETED",true)));
        when(certificates.saveAndFlush(any())).thenThrow(new IllegalStateException("certificate failure"));
        assertThrows(IllegalStateException.class,()->service.complete("HPG-001")); verifyNoInteractions(events);
    }
    @Test void notificationFailureIsNotSwallowed() {
        when(sessions.findForPackageForUpdate("HPG-001")).thenReturn(List.of());
        doThrow(new IllegalStateException("delivery failure")).when(events).notifyOwner(anyString(),anyString(),anyString(),anyString());
        assertThrows(IllegalStateException.class,()->service.cancel("HPG-001"));
    }
}
