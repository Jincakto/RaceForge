package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseAssignment;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.permission.service.PermissionService;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.repository.TrainingAssessmentScopeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrainingAssessmentAccessServiceTest {
    private final TrainingWorkflowGuard guard = mock(TrainingWorkflowGuard.class);
    private final TrainingReadAccess reads = mock(TrainingReadAccess.class);
    private final PermissionService permissions = mock(PermissionService.class);
    private final HorseAssignmentRepository assignments = mock(HorseAssignmentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final TrainingAssessmentScopeRepository scope = mock(TrainingAssessmentScopeRepository.class);
    private final TrainingAssessmentAccessService access = new TrainingAssessmentAccessService(
            guard, reads, permissions, assignments, users, scope);
    private final AuthenticatedUser trainer = actor("HTR-1", "HEAD_TRAINER", "ACTIVE");

    @Test
    void actorUsesExistingWorkflowAuthentication() {
        when(guard.actor()).thenReturn(trainer);
        assertSame(trainer, access.actor());
        verify(guard).actor();
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLUB_MANAGER", "VETERINARIAN"})
    void templateAllowsActiveClinicalAndManagerRoles(String role) {
        when(guard.actor()).thenReturn(actor("U", role, "ACTIVE"));
        assertDoesNotThrow(access::requireTemplate);
        verifyNoInteractions(reads, permissions, assignments, users);
    }

    @ParameterizedTest
    @ValueSource(strings = {"VIEW_TRAINING", "MANAGE_TRAINING"})
    void templateAllowsTrainerWithEitherTrainingPermission(String permission) {
        when(guard.actor()).thenReturn(trainer);
        when(reads.activeProfile("HTR-1")).thenReturn(true);
        when(permissions.hasPermission("HEAD_TRAINER", permission)).thenReturn(true);
        assertDoesNotThrow(access::requireTemplate);
    }

    @Test
    void templateRejectsTrainerWithoutPermission() {
        when(guard.actor()).thenReturn(trainer);
        when(reads.activeProfile("HTR-1")).thenReturn(true);
        assertThrows(AccessDeniedException.class, access::requireTemplate);
    }

    @Test
    void templateRejectsInactiveTrainerProfile() {
        when(guard.actor()).thenReturn(trainer);
        assertThrows(AccessDeniedException.class, access::requireTemplate);
    }

    @ParameterizedTest
    @ValueSource(strings = {"HORSE_OWNER", "ADMIN", "GROOM", "USER"})
    void templateDoesNotOpenToUnapprovedRoles(String role) {
        when(guard.actor()).thenReturn(actor("U", role, "ACTIVE"));
        assertThrows(AccessDeniedException.class, access::requireTemplate);
    }

    @Test
    void trainerReadsCurrentPackageOrOwnRecordedHistoryOnly() {
        readableTrainer();
        when(reads.currentPackages("HTR-1", "HOR-A")).thenReturn(Set.of("HPG-A"));
        List<TrainingSession> rows = List.of(
                session("current", "HOR-A", "HPG-A", "SCHEDULED", null),
                session("other", "HOR-A", "HPG-B", "SCHEDULED", null),
                session("recorded", "HOR-A", "HPG-B", "COMPLETED", "HTR-1"),
                session("missed", "HOR-A", "HPG-B", "MISSED", "HTR-1"),
                session("unfinished", "HOR-A", "HPG-B", "SCHEDULED", "HTR-1"),
                session("other-recorder", "HOR-A", "HPG-B", "COMPLETED", "HTR-2"));
        assertEquals(Set.of("current", "recorded", "missed"), access.readableSessionIds(trainer, rows));
        verify(reads, times(1)).currentPackages("HTR-1", "HOR-A");
        verify(reads, times(1)).activeProfile("HTR-1");
        verify(permissions, times(1)).hasPermission("HEAD_TRAINER", "VIEW_TRAINING");
    }

    @Test
    void trainerScopeUsesOneBatchForDistinctHorses() {
        readableTrainer();
        TrainingAssessmentScopeRepository.CurrentTrainerPackage packageRow = packageScope("HOR-A", "HPG-A");
        when(scope.findCurrentTrainerPackages("HTR-1", Set.of("HOR-A", "HOR-B")))
                .thenReturn(List.of(packageRow));
        List<TrainingSession> rows = List.of(
                session("a1", "HOR-A", "HPG-A", "SCHEDULED", null),
                session("a2", "HOR-A", "HPG-A", "COMPLETED", null),
                session("b1", "HOR-B", "HPG-A", "SCHEDULED", null),
                session("b2", "HOR-B", "HPG-B", "COMPLETED", "HTR-1"));
        assertEquals(Set.of("a1", "a2", "b2"), access.readableSessionIds(trainer, rows));
        verify(scope, times(1)).findCurrentTrainerPackages("HTR-1", Set.of("HOR-A", "HOR-B"));
        verify(reads, never()).currentPackages(anyString(), anyString());
        verify(reads, times(1)).activeProfile("HTR-1");
        verify(permissions, times(1)).hasPermission("HEAD_TRAINER", "VIEW_TRAINING");
    }
    @Test
    void historicalRecorderStillRequiresReadPermissionAndActiveProfile() {
        TrainingSession history = session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1");
        assertFalse(access.canRead(trainer, history));
        when(permissions.hasPermission("HEAD_TRAINER", "VIEW_TRAINING")).thenReturn(true);
        assertFalse(access.canRead(trainer, history));
        when(reads.activeProfile("HTR-1")).thenReturn(true);
        when(reads.currentPackages("HTR-1", "HOR-A")).thenReturn(Set.of());
        assertTrue(access.canRead(trainer, history));
    }

    @Test
    void managersCanReadSingleClubSessionsWithoutTrainerPermission() {
        TrainingSession row = session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1");
        assertTrue(access.canRead(actor("CM-1", "CLUB_MANAGER", "ACTIVE"), row));
        verifyNoInteractions(reads, permissions, assignments, users);
    }

    @Test
    void vetScopeUsesOneLatestAssignmentBatchForDistinctHorses() {
        HorseAssignment a = assignment(user("VET-1", "VETERINARIAN", "ACTIVE"), "ASSIGNED");
        a.setHorse(horse("HOR-A"));
        HorseAssignment b = assignment(user("VET-2", "VETERINARIAN", "ACTIVE"), "ACCEPTED");
        b.setHorse(horse("HOR-B"));
        when(scope.findLatestVetAssignments(Set.of("HOR-A", "HOR-B"))).thenReturn(List.of(a, b));
        List<TrainingSession> rows = List.of(
                session("a1", "HOR-A", "HPG-A", "COMPLETED", "HTR-1"),
                session("a2", "HOR-A", "HPG-A", "COMPLETED", "HTR-1"),
                session("b1", "HOR-B", "HPG-B", "COMPLETED", "HTR-1"));
        assertEquals(Set.of("a1", "a2"), access.readableSessionIds(actor("VET-1", "VETERINARIAN", "ACTIVE"), rows));
        verify(scope, times(1)).findLatestVetAssignments(Set.of("HOR-A", "HOR-B"));
        verifyNoInteractions(assignments);
    }

    @Test
    void ambiguousNewestVetTimestampDeniesThatHorseWithoutAHistoricalFallback() {
        HorseAssignment a = assignment(user("VET-1", "VETERINARIAN", "ACTIVE"), "ACCEPTED");
        a.setHorse(horse("HOR-A"));
        HorseAssignment tied = assignment(user("VET-2", "VETERINARIAN", "ACTIVE"), "ASSIGNED");
        tied.setHorse(horse("HOR-A"));
        when(scope.findLatestVetAssignments(Set.of("HOR-A", "HOR-B"))).thenReturn(List.of(a, tied));
        List<TrainingSession> rows = List.of(
                session("a1", "HOR-A", "HPG-A", "COMPLETED", "HTR-1"),
                session("b1", "HOR-B", "HPG-B", "COMPLETED", "HTR-1"));
        assertTrue(access.readableSessionIds(actor("VET-1", "VETERINARIAN", "ACTIVE"), rows).isEmpty());
        verifyNoInteractions(assignments);
    }

    @Test
    void inactiveOrTerminalLatestVetDoesNotGrantBatchAccess() {
        HorseAssignment inactive = assignment(user("VET-1", "VETERINARIAN", "SUSPENDED"), "ACCEPTED");
        inactive.setHorse(horse("HOR-A"));
        HorseAssignment terminal = assignment(user("VET-1", "VETERINARIAN", "ACTIVE"), "REASSIGNED");
        terminal.setHorse(horse("HOR-B"));
        when(scope.findLatestVetAssignments(Set.of("HOR-A", "HOR-B"))).thenReturn(List.of(inactive, terminal));
        List<TrainingSession> rows = List.of(
                session("a1", "HOR-A", "HPG-A", "COMPLETED", "HTR-1"),
                session("b1", "HOR-B", "HPG-B", "COMPLETED", "HTR-1"));
        assertTrue(access.readableSessionIds(actor("VET-1", "VETERINARIAN", "ACTIVE"), rows).isEmpty());
        verifyNoInteractions(assignments);
    }

    @Test
    void batchQueryCountDoesNotGrowWithTrainerHorseCount() {
        readableTrainer();
        java.util.ArrayList<TrainingSession> rows = new java.util.ArrayList<>();
        java.util.Set<String> horseIds = new java.util.LinkedHashSet<>();
        java.util.ArrayList<TrainingAssessmentScopeRepository.CurrentTrainerPackage> packages = new java.util.ArrayList<>();
        for (int number = 0; number < 25; number++) {
            String horseId = "HOR-" + number;
            String packageId = "HPG-" + number;
            horseIds.add(horseId);
            packages.add(packageScope(horseId, packageId));
            rows.add(session("s-" + number, horseId, packageId, "SCHEDULED", null));
        }
        when(scope.findCurrentTrainerPackages("HTR-1", horseIds)).thenReturn(packages);
        assertEquals(25, access.readableSessionIds(trainer, rows).size());
        verify(scope, only()).findCurrentTrainerPackages("HTR-1", horseIds);
        verify(reads, never()).currentPackages(anyString(), anyString());
        verify(reads, times(1)).activeProfile("HTR-1");
    }
    @Test
    void batchQueryCountDoesNotGrowWithVetHorseCount() {
        User vet = user("VET-1", "VETERINARIAN", "ACTIVE");
        java.util.ArrayList<TrainingSession> rows = new java.util.ArrayList<>();
        java.util.Set<String> horseIds = new java.util.LinkedHashSet<>();
        java.util.ArrayList<HorseAssignment> latest = new java.util.ArrayList<>();
        for (int number = 0; number < 25; number++) {
            String horseId = "HOR-" + number;
            horseIds.add(horseId);
            HorseAssignment assignment = assignment(vet, "ACCEPTED");
            assignment.setHorse(horse(horseId));
            latest.add(assignment);
            rows.add(session("s-" + number, horseId, "HPG-" + number, "COMPLETED", "HTR-1"));
        }
        when(scope.findLatestVetAssignments(horseIds)).thenReturn(latest);
        assertEquals(25, access.readableSessionIds(actor("VET-1", "VETERINARIAN", "ACTIVE"), rows).size());
        verify(scope, only()).findLatestVetAssignments(horseIds);
        verifyNoInteractions(assignments, reads, permissions);
    }
    @ParameterizedTest
    @ValueSource(strings = {"ASSIGNED", "ACCEPTED", "COMPLETED"})
    void t22AndT23LatestOpenVetCanRead(String status) {
        User vet = user("VET-1", "VETERINARIAN", "ACTIVE");
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET"))
                .thenReturn(Optional.of(assignment(vet, status)));
        assertEquals(Optional.of(vet), access.currentVet("HOR-A", false));
    }

    @Test
    void t23AssignedVetCannotExamineUntilAccepted() {
        User vet = user("VET-1", "VETERINARIAN", "ACTIVE");
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET"))
                .thenReturn(Optional.of(assignment(vet, "ASSIGNED")));
        assertTrue(access.currentVet("HOR-A", true).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCEPTED", "COMPLETED"})
    void latestAcceptedOrLegacyCompletedCanExamine(String status) {
        User vet = user("VET-1", "VETERINARIAN", "ACTIVE");
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET"))
                .thenReturn(Optional.of(assignment(vet, status)));
        assertEquals(Optional.of(vet), access.currentVet("HOR-A", true));
    }

    @ParameterizedTest
    @ValueSource(strings = {"REASSIGNED", "DECLINED", "CANCELLED"})
    void latestTerminalAssignmentDoesNotFallBackToHistoricalVet(String status) {
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET"))
                .thenReturn(Optional.of(assignment(user("VET-1", "VETERINARIAN", "ACTIVE"), status)));
        assertTrue(access.currentVet("HOR-A", false).isEmpty());
        verify(assignments, only()).findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET");
    }

    @Test
    void vetMustBeActiveAndStillHaveVeterinarianRole() {
        User vet = user("VET-1", "VETERINARIAN", "SUSPENDED");
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET"))
                .thenReturn(Optional.of(assignment(vet, "ACCEPTED")));
        assertTrue(access.currentVet("HOR-A", false).isEmpty());
        vet.setStatus("ACTIVE");
        vet.getRole().setRoleName("GROOM");
        assertTrue(access.currentVet("HOR-A", false).isEmpty());
        vet.setRole(null);
        assertTrue(access.currentVet("HOR-A", false).isEmpty());
    }

    @Test
    void missingVetIsNotAnException() {
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET"))
                .thenReturn(Optional.empty());
        assertTrue(access.currentVet("HOR-A", false).isEmpty());
        assertTrue(access.currentVet(null, false).isEmpty());
        assertTrue(access.currentVet(" ", false).isEmpty());
    }

    @Test
    void t22OldVetLosesReadAccessAfterReplacement() {
        when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc("HOR-A", "VET"))
                .thenReturn(Optional.of(assignment(user("VET-2", "VETERINARIAN", "ACTIVE"), "ASSIGNED")));
        assertFalse(access.canRead(actor("VET-1", "VETERINARIAN", "ACTIVE"),
                session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1")));
    }

    @Test
    void t41OtherRolesAndInactiveActorsCannotRead() {
        TrainingSession row = session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1");
        for (String role : List.of("HORSE_OWNER", "ADMIN", "GROOM", "USER")) {
            assertFalse(access.canRead(actor("U", role, "ACTIVE"), row));
        }
        assertFalse(access.canRead(actor("CM-1", "CLUB_MANAGER", "SUSPENDED"), row));
        assertFalse(access.canRead(null, row));
        assertFalse(access.canRead(trainer, null));
    }

    @Test
    void requireReadRejectsKnownSessionOutsideScope() {
        when(guard.actor()).thenReturn(actor("OWN-1", "HORSE_OWNER", "ACTIVE"));
        assertThrows(AccessDeniedException.class, () -> access.requireRead(
                session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1")));
    }

    @Test
    void writeUsesManagePermissionAndCurrentAssignmentGuard() {
        when(guard.actor()).thenReturn(trainer);
        when(permissions.hasPermission("HEAD_TRAINER", "MANAGE_TRAINING")).thenReturn(true);
        TrainingSession row = session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1");
        assertDoesNotThrow(() -> access.requireWrite(row));
        verify(guard).authorizePlan(row.getPlan());
    }

    @Test
    void recorderHistoryDoesNotGrantManualNotificationWrite() {
        when(guard.actor()).thenReturn(trainer);
        when(permissions.hasPermission("HEAD_TRAINER", "MANAGE_TRAINING")).thenReturn(true);
        TrainingSession row = session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1");
        doThrow(new AccessDeniedException("Current assignment required")).when(guard).authorizePlan(row.getPlan());
        assertThrows(AccessDeniedException.class, () -> access.requireWrite(row));
    }

    @Test
    void missingManagePermissionCannotWriteEvenAsRecorder() {
        when(guard.actor()).thenReturn(trainer);
        TrainingSession row = session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1");
        assertThrows(AccessDeniedException.class, () -> access.requireWrite(row));
        verify(guard, never()).authorizePlan(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLUB_MANAGER", "VETERINARIAN", "HORSE_OWNER"})
    void nonTrainersCannotUseManualNotificationMutation(String role) {
        when(guard.actor()).thenReturn(actor("U", role, "ACTIVE"));
        assertThrows(AccessDeniedException.class, () -> access.requireWrite(
                session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1")));
        verify(guard, never()).authorizePlan(any());
    }

    @Test
    void activeManagersAreFilteredAndDeduplicated() {
        User manager = user("CM-1", "CLUB_MANAGER", "ACTIVE");
        when(users.findActiveManagers()).thenReturn(List.of(manager, manager,
                user("CM-2", "CLUB_MANAGER", "SUSPENDED"), user("OWN-1", "HORSE_OWNER", "ACTIVE")));
        assertEquals(List.of(manager), access.activeManagers());
        verify(users).findActiveManagers();
    }

    @Test
    void readableSessionIdsAreImmutableAndHandleEmptyLists() {
        assertTrue(access.readableSessionIds(trainer, List.of()).isEmpty());
        Set<String> ids = access.readableSessionIds(actor("CM-1", "CLUB_MANAGER", "ACTIVE"),
                List.of(session("s", "HOR-A", "HPG-A", "COMPLETED", "HTR-1")));
        assertThrows(UnsupportedOperationException.class, () -> ids.add("another"));
    }

    private TrainingAssessmentScopeRepository.CurrentTrainerPackage packageScope(String horseId, String packageId) {
        TrainingAssessmentScopeRepository.CurrentTrainerPackage row =
                mock(TrainingAssessmentScopeRepository.CurrentTrainerPackage.class);
        when(row.getHorseId()).thenReturn(horseId);
        when(row.getHorsePackageId()).thenReturn(packageId);
        return row;
    }

    private Horse horse(String horseId) {
        Horse horse = new Horse();
        horse.setHorseId(horseId);
        return horse;
    }
    private void readableTrainer() {
        when(permissions.hasPermission("HEAD_TRAINER", "VIEW_TRAINING")).thenReturn(true);
        when(reads.activeProfile("HTR-1")).thenReturn(true);
    }

    private AuthenticatedUser actor(String id, String role, String status) {
        return new AuthenticatedUser(id, id + "@example.invalid", status, 1, role);
    }

    private User user(String id, String roleName, String status) {
        Role role = new Role();
        role.setRoleName(roleName);
        User user = new User();
        user.setUserId(id);
        user.setRole(role);
        user.setStatus(status);
        return user;
    }

    private HorseAssignment assignment(User vet, String status) {
        HorseAssignment assignment = new HorseAssignment();
        assignment.setId("ASG-1");
        assignment.setKind("VET");
        assignment.setAssignee(vet);
        assignment.setStatus(status);
        return assignment;
    }

    private TrainingSession session(String id, String horseId, String packageId, String status, String recorder) {
        Horse horse = new Horse();
        horse.setHorseId(horseId);
        TrainingPlan plan = new TrainingPlan();
        plan.setHorsePackageId(packageId);
        TrainingSession session = new TrainingSession();
        session.setSessionId(id);
        session.setHorse(horse);
        session.setPlan(plan);
        session.setStatus(status);
        session.setRecordedBy(recorder);
        return session;
    }
}