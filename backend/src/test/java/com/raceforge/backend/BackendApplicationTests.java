package com.raceforge.backend;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RegistrationRequestRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
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
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
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

	private UsernamePasswordAuthenticationToken currentUser(Integer roleId, String roleName, String status) {
		AuthenticatedUser user = new AuthenticatedUser(42, "test@example.com", status, roleId, roleName);
		return UsernamePasswordAuthenticationToken.authenticated(user, null,
				List.of(new SimpleGrantedAuthority(roleName)));
	}

}
