package com.raceforge.backend;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RegistrationRequestRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalClinicalExamRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.medical.repository.MedicalVitalSignRepository;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import com.raceforge.backend.notification.entity.Notification;
import com.raceforge.backend.notification.repository.NotificationRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.permission.config.PermissionDataSeeder;
import com.raceforge.backend.permission.entity.Permission;
import com.raceforge.backend.permission.entity.PermissionAuditLog;
import com.raceforge.backend.permission.entity.RolePermission;
import com.raceforge.backend.permission.entity.RolePermissionId;
import com.raceforge.backend.permission.repository.PermissionRepository;
import com.raceforge.backend.permission.repository.PermissionAuditLogRepository;
import com.raceforge.backend.permission.repository.RolePermissionRepository;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.repository.TrainingPlanRepository;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import com.raceforge.backend.training.repository.HorsePlanRepository;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@SpringBootTest(properties = {
		"spring.autoconfigure.exclude="
				+ "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
				+ "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
				+ "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
				+ "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
})
@AutoConfigureMockMvc
class BackendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private UserRepository userRepository;
	@MockitoBean
	private RoleRepository roleRepository;
	@MockitoBean
	private RegistrationRequestRepository registrationRequestRepository;
	@MockitoBean
	private RefreshTokenRepository refreshTokenRepository;
	@MockitoBean
	private PasswordResetTokenRepository passwordResetTokenRepository;
	@MockitoBean
	private NotificationRepository notificationRepository;
	@MockitoBean
	private AuditLogRepository auditLogRepository;
	@MockitoBean
	private HorseRepository horseRepository;
	@MockitoBean
	private HorseRaceHistoryRepository horseRaceHistoryRepository;
	@MockitoBean
	private HealthProfileRepository healthProfileRepository;
	@MockitoBean
	private MedicalRecordRepository medicalRecordRepository;
	@MockitoBean
	private MedicalVitalSignRepository medicalVitalSignRepository;
	@MockitoBean
	private MedicalClinicalExamRepository medicalClinicalExamRepository;
	@MockitoBean
	private TrainingLockRepository trainingLockRepository;
	@MockitoBean
	private HorsePackageRepository horsePackageRepository;
	@MockitoBean
	private TrainingPackageRepository trainingPackageRepository;
	@MockitoBean
	private EntityManager entityManager;
	@MockitoBean
	private PermissionRepository permissionRepository;
	@MockitoBean
	private RolePermissionRepository rolePermissionRepository;
	@MockitoBean
	private PermissionAuditLogRepository permissionAuditLogRepository;
	@MockitoBean
	private PermissionDataSeeder permissionDataSeeder;
	@MockitoBean
	private TrainingPlanRepository trainingPlanRepository;
	@MockitoBean
	private TrainingSessionRepository trainingSessionRepository;
	@MockitoBean
	private HorsePlanRepository horsePlanRepository;

	@Test
	void contextLoads() {
	}

	@Test
	void swaggerUiAndAssetsArePublic() throws Exception {
		mockMvc.perform(get("/swagger-ui.html"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("/swagger-ui/index.html"));
		mockMvc.perform(get("/swagger-ui/index.html"))
				.andExpect(status().isOk())
				.andExpect(content().string(containsString("Swagger UI")));
		mockMvc.perform(get("/swagger-ui/swagger-ui-bundle.js"))
				.andExpect(status().isOk());
		mockMvc.perform(get("/v3/api-docs/swagger-config"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.url").value("/v3/api-docs"));
	}

	@Test
	void openApiDocumentsPublicAndBearerProtectedEndpoints() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.info.title").value("RaceForge API"))
				.andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
				.andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
				.andExpect(jsonPath("$.security[0].bearerAuth").isArray())
				.andExpect(jsonPath("$.paths['/api/auth/login'].post.security").isEmpty())
				.andExpect(jsonPath("$.paths['/api/auth/register'].post.security").isEmpty())
				.andExpect(jsonPath("$.paths['/api/health'].get.security").isEmpty())
				.andExpect(jsonPath("$.paths['/api/auth/logout'].post").exists())
				.andExpect(jsonPath("$.paths['/api/auth/logout'].post.security").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/users/me'].get").exists())
				.andExpect(jsonPath("$.paths['/api/users/me'].get.security").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/users/me'].get.parameters").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/registration-requests'].get").exists());
		mockMvc.perform(get("/v3/api-docs.yaml"))
				.andExpect(status().isOk());
	}

	@Test
	void documentationDoesNotExposeProtectedApis() throws Exception {
		mockMvc.perform(get("/api/users/me")).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/users")).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/registration-requests")).andExpect(status().isForbidden());
		mockMvc.perform(post("/api/auth/logout")).andExpect(status().isForbidden());
	}

	@Test
	void horseApisAcceptActiveBusinessUsersAndRejectBasicOrPendingUsers() throws Exception {
		mockMvc.perform(get("/api/horses").with(authentication(currentUser(5, "HORSE_OWNER", "ACTIVE"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").isArray());
		mockMvc.perform(get("/api/horses").with(authentication(currentUser(6, "USER", "ACTIVE"))))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/horses").with(authentication(currentUser(5, "HORSE_OWNER", "PENDING"))))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/horses")).andExpect(status().isForbidden());
	}

	@Test
	void medicalHistoryUsesTheMergedAuthenticationPrincipal() throws Exception {
		HealthProfile profile = new HealthProfile();
		profile.setProfileId(12);
		when(healthProfileRepository.findByHorse_HorseId(7)).thenReturn(Optional.of(profile));
		when(medicalRecordRepository.findByHealthProfile_ProfileIdOrderByExaminedAtDesc(12))
				.thenReturn(List.of());
		mockMvc.perform(get("/api/medical/horses/7/records")
				.with(authentication(currentUser(3, "VETERINARIAN", "ACTIVE"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").isEmpty());
		verify(medicalRecordRepository).findByHealthProfile_ProfileIdOrderByExaminedAtDesc(12);
	}

	@Test
	void notificationReadUsesIntegerIdsAndIsScopedToTheCurrentUser() throws Exception {
		Notification notification = new Notification();
		notification.setNotificationId(9);
		notification.setUserId(42);
		notification.setCreatedAt(Instant.now());
		when(notificationRepository.findByNotificationIdAndUserId(9, 42))
				.thenReturn(Optional.of(notification));
		when(notificationRepository.save(notification)).thenReturn(notification);
		mockMvc.perform(patch("/api/notifications/9/read")
				.with(authentication(currentUser(5, "HORSE_OWNER", "ACTIVE"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.notificationId").value(9))
				.andExpect(jsonPath("$.read").value(true));
		verify(notificationRepository).findByNotificationIdAndUserId(9, 42);
		mockMvc.perform(patch("/api/notifications/10/read")
				.with(authentication(currentUser(5, "HORSE_OWNER", "ACTIVE"))))
				.andExpect(status().isNotFound());
		verify(notificationRepository).findByNotificationIdAndUserId(10, 42);
	}

	@Test
	void permissionAdministrationRejectsNonManagersAndAnonymousUsers() throws Exception {
		mockMvc.perform(get("/api/admin/permissions/HEAD_TRAINER")
				.with(authentication(currentUser(2, "HEAD_TRAINER", "ACTIVE"))))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/admin/permissions/grant")
				.with(authentication(currentUser(5, "HORSE_OWNER", "ACTIVE")))
				.contentType("application/json")
				.content("{\"roleName\":\"HEAD_TRAINER\",\"permissionCode\":\"TRAIN\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(delete("/api/admin/permissions/revoke")
				.with(authentication(currentUser(3, "VETERINARIAN", "ACTIVE")))
				.param("roleName", "HEAD_TRAINER").param("permissionCode", "TRAIN"))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/admin/permissions/HEAD_TRAINER/audit-log"))
				.andExpect(status().isForbidden());
		verify(rolePermissionRepository, never()).save(any());
	}

	@Test
	void permissionGrantUsesCanonicalRolesAndAuthenticatedActorDespiteSpoofedActor() throws Exception {
		Role role = permissionRole();
		Permission permission = permission();
		mockMvc.perform(post("/api/admin/permissions/grant")
				.with(authentication(currentUser(1, "CLUB_MANAGER", "ACTIVE")))
				.contentType("application/json")
				.content("{\"roleName\":\"HEAD_TRAINER\",\"permissionCode\":\"TRAIN\",\"performedBy\":999}"))
				.andExpect(status().isOk());
		ArgumentCaptor<RolePermission> grant = ArgumentCaptor.forClass(RolePermission.class);
		verify(rolePermissionRepository).save(grant.capture());
		assertEquals(role, grant.getValue().getRole());
		assertEquals(new RolePermissionId(2, permission.getPermissionId()), grant.getValue().getId());
		ArgumentCaptor<PermissionAuditLog> audit = ArgumentCaptor.forClass(PermissionAuditLog.class);
		verify(permissionAuditLogRepository).save(audit.capture());
		assertEquals(42, audit.getValue().getUserId());
		assertEquals("GRANT", audit.getValue().getAction());
	}

	@Test
	void permissionRevokeDoesNotNeedAClientActor() throws Exception {
		permissionRole();
		permission();
		when(rolePermissionRepository.existsById(new RolePermissionId(2, 8))).thenReturn(true);
		mockMvc.perform(delete("/api/admin/permissions/revoke")
				.with(authentication(currentUser(1, "CLUB_MANAGER", "ACTIVE")))
				.param("roleName", "HEAD_TRAINER").param("permissionCode", "TRAIN")
				.param("performedBy", "999"))
				.andExpect(status().isOk());
		verify(rolePermissionRepository).deleteById(new RolePermissionId(2, 8));
		ArgumentCaptor<PermissionAuditLog> audit = ArgumentCaptor.forClass(PermissionAuditLog.class);
		verify(permissionAuditLogRepository).save(audit.capture());
		assertEquals(42, audit.getValue().getUserId());
		assertEquals("REVOKE", audit.getValue().getAction());
	}

	@Test
	void trainerCreatesPlanWithAuthenticatedCreatorRatherThanSuppliedId() throws Exception {
		Horse horse = new Horse();
		horse.setHorseId(7);
		when(horseRepository.findById(7)).thenReturn(Optional.of(horse));
		when(trainingPlanRepository.save(any(TrainingPlan.class))).thenAnswer(invocation -> {
			TrainingPlan plan = invocation.getArgument(0);
			plan.setPlanId(11);
			return plan;
		});
		mockMvc.perform(post("/api/horses/7/training-plans")
				.with(authentication(currentUser(2, "HEAD_TRAINER", "ACTIVE")))
				.contentType("application/json")
				.content("{\"planName\":\"Weekly conditioning\",\"trainerId\":999}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.planId").value(11))
				.andExpect(jsonPath("$.data.horseId").value(7))
				.andExpect(jsonPath("$.data.createdBy").value(42));
		verify(horsePlanRepository).save(any());
	}

	@Test
	void trainingWritesRejectHorseOwnersButSchedulesRemainReadable() throws Exception {
		var owner = currentUser(5, "HORSE_OWNER", "ACTIVE");
		mockMvc.perform(post("/api/horses/7/training-plans").with(authentication(owner))
				.contentType("application/json").content("{\"planName\":\"Weekly conditioning\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/training-sessions").with(authentication(owner))
				.contentType("application/json").content("{\"planId\":11,\"scheduledTime\":\"2026-10-15T07:00:00\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/training-sessions/recurring").with(authentication(owner))
				.contentType("application/json")
				.content("{\"planId\":11,\"activityName\":\"Conditioning\",\"startDate\":\"2026-10-15\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(patch("/api/training-sessions/13/start").with(authentication(owner)))
				.andExpect(status().isForbidden());
		mockMvc.perform(patch("/api/training-sessions/13/complete").with(authentication(owner))
				.contentType("application/json").content("{}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(put("/api/training-sessions/13/attendance").with(authentication(owner))
				.contentType("application/json").content("{\"status\":\"COMPLETED\"}"))
				.andExpect(status().isForbidden());
		when(horseRepository.existsById(7)).thenReturn(true);
		when(trainingSessionRepository.findByHorse_HorseIdOrderByScheduledStartAsc(7)).thenReturn(List.of());
		mockMvc.perform(get("/api/training-sessions/horse/7").with(authentication(owner)))
				.andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
		verify(trainingSessionRepository, never()).save(any());
	}

	@Test
	void permissionGrantAcceptsAnOmittedActorAndRemainsIdempotent() throws Exception {
		permissionRole();
		permission();
		when(rolePermissionRepository.existsById(new RolePermissionId(2, 8))).thenReturn(true);
		mockMvc.perform(post("/api/admin/permissions/grant")
				.with(authentication(currentUser(1, "CLUB_MANAGER", "ACTIVE")))
				.contentType("application/json")
				.content("{\"roleName\":\"HEAD_TRAINER\",\"permissionCode\":\"TRAIN\"}"))
				.andExpect(status().isOk());
		verify(rolePermissionRepository, never()).save(any());
		verify(permissionAuditLogRepository, never()).save(any());
	}

	@Test
	void managerPermissionCannotBeDelegatedOrRevokedFromManager() throws Exception {
		permissionRole();
		Permission manage = new Permission("MANAGE_PERMISSION", "Manager only");
		manage.setPermissionId(9);
		when(permissionRepository.findByPermissionName("MANAGE_PERMISSION")).thenReturn(Optional.of(manage));
		mockMvc.perform(post("/api/admin/permissions/grant")
				.with(authentication(currentUser(1, "CLUB_MANAGER", "ACTIVE")))
				.contentType("application/json")
				.content("{\"roleName\":\"HEAD_TRAINER\",\"permissionCode\":\"MANAGE_PERMISSION\"}"))
				.andExpect(status().isConflict());
		mockMvc.perform(delete("/api/admin/permissions/revoke")
				.with(authentication(currentUser(1, "CLUB_MANAGER", "ACTIVE")))
				.param("roleName", "CLUB_MANAGER").param("permissionCode", "MANAGE_PERMISSION"))
				.andExpect(status().isConflict());
		verify(rolePermissionRepository, never()).save(any());
		verify(rolePermissionRepository, never()).deleteById(any());
	}

	@Test
	void trainerCannotCompleteSessionWhenVeterinarianHasLockedHorse() throws Exception {
		Horse horse = new Horse();
		horse.setHorseId(7);
		horse.setTrainingLocked(true);
		TrainingSession session = new TrainingSession();
		session.setSessionId(13);
		session.setHorse(horse);
		when(trainingSessionRepository.findById(13)).thenReturn(Optional.of(session));
		when(horseRepository.findByIdForUpdate(7)).thenReturn(Optional.of(horse));
		mockMvc.perform(patch("/api/training-sessions/13/complete")
				.with(authentication(currentUser(2, "HEAD_TRAINER", "ACTIVE")))
				.contentType("application/json").content("{}"))
				.andExpect(status().isConflict());
		verify(trainingSessionRepository, never()).save(any());
	}

	private Role permissionRole() {
		Role role = new Role();
		role.setRoleId(2);
		role.setRoleName("HEAD_TRAINER");
		when(roleRepository.findByRoleName("HEAD_TRAINER")).thenReturn(Optional.of(role));
		return role;
	}

	private Permission permission() {
		Permission permission = new Permission("TRAIN", "Training");
		permission.setPermissionId(8);
		when(permissionRepository.findByPermissionName("TRAIN")).thenReturn(Optional.of(permission));
		return permission;
	}

	private UsernamePasswordAuthenticationToken currentUser(Integer roleId, String roleName, String status) {
		AuthenticatedUser user = new AuthenticatedUser(42, "test@example.com", status, roleId, roleName);
		return UsernamePasswordAuthenticationToken.authenticated(user, null,
				List.of(new SimpleGrantedAuthority(roleName)));
	}

}
