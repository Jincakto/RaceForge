<<<<<<< HEAD
package com.raceforge.backend;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalClinicalExamRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.medical.repository.MedicalVitalSignRepository;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import com.raceforge.backend.notification.repository.NotificationRepository;
import com.raceforge.backend.permission.repository.PermissionAuditLogRepository;
import com.raceforge.backend.permission.repository.PermissionRepository;
import com.raceforge.backend.permission.repository.RolePermissionRepository;
import com.raceforge.backend.permission.config.PermissionDataSeeder;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.HorsePlanRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import com.raceforge.backend.training.repository.TrainingPlanRepository;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import com.raceforge.backend.training.service.TrainingSessionRules;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
		"spring.autoconfigure.exclude="
				+ "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
				+ "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
				+ "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
				+ "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
})
@AutoConfigureMockMvc
class BackendApplicationTests {
    @MockitoBean
    private com.raceforge.backend.common.id.BusinessIdGenerator businessIdGenerator;

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private UserRepository userRepository;
	@MockitoBean
	private RoleRepository roleRepository;
	@MockitoBean
	private RefreshTokenRepository refreshTokenRepository;
	@MockitoBean
	private PasswordResetTokenRepository passwordResetTokenRepository;
	@MockitoBean
	private EmailVerificationOtpRepository emailVerificationOtpRepository;
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
	private MedicalClinicalExamRepository medicalClinicalExamRepository;
	@MockitoBean
	private MedicalRecordRepository medicalRecordRepository;
	@MockitoBean
	private MedicalVitalSignRepository medicalVitalSignRepository;
	@MockitoBean
	private TrainingLockRepository trainingLockRepository;
	@MockitoBean
	private PermissionAuditLogRepository permissionAuditLogRepository;
	@MockitoBean
	private PermissionRepository permissionRepository;
	@MockitoBean
	private RolePermissionRepository rolePermissionRepository;
	@MockitoBean
	private com.raceforge.backend.permission.repository.RoleRepository permissionRoleRepository;
	@MockitoBean
	private HorsePackageRepository horsePackageRepository;
	@MockitoBean
	private HorsePlanRepository horsePlanRepository;
	@MockitoBean
	private TrainingPackageRepository trainingPackageRepository;
	@MockitoBean
	private TrainingPlanRepository trainingPlanRepository;
	@MockitoBean
	private TrainingSessionRepository trainingSessionRepository;
	@MockitoBean
	private EntityManager entityManager;
	@MockitoBean
	private PermissionDataSeeder permissionDataSeeder;
	@MockitoBean
	private TrainingSessionRules trainingSessionRules;

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
				.andExpect(content().string(containsString("Swagger UI")))
                .andExpect(content().string(containsString("./raceforge-errors.js")));
        mockMvc.perform(get("/swagger-ui/raceforge-errors.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("raceforge-error-message")));
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
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['200'].description").value("OK"))
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['200'].content").exists())
				.andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
				.andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
				.andExpect(jsonPath("$.security[0].bearerAuth").isArray())
				.andExpect(jsonPath("$.paths['/api/auth/login'].post.security").isEmpty())
				.andExpect(jsonPath("$.paths['/api/auth/register'].post.security").isEmpty())
				.andExpect(jsonPath("$.paths['/api/auth/google/set-password'].post.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/auth/staff/set-password'].post.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/admin/users'].post.responses['201']").exists())
                .andExpect(jsonPath("$.components.schemas.RegisterRequest.properties.requestedRoleId").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.GoogleAuthRequest.properties.requestedRoleId").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/registration-requests/{id}/approve']").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/users/me/external-logins/google']").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/health'].get.security").isEmpty())
				.andExpect(jsonPath("$.paths['/api/auth/logout'].post").exists())
				.andExpect(jsonPath("$.paths['/api/auth/logout'].post.security").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/users/me'].get").exists())
				.andExpect(jsonPath("$.paths['/api/users/me'].get.security").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/users/me'].get.parameters").doesNotExist())
				.andExpect(jsonPath("$.paths['/api/registration-requests']").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/registration-requests/{id}']").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/registration-requests/{id}/reject']").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/users/me/registration-request']").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.RegistrationRequestResponse").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.ApproveRequest").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.RejectRequest").doesNotExist());
		mockMvc.perform(get("/v3/api-docs.yaml"))
				.andExpect(status().isOk());
	}

	@Test
	void openApiDocumentsOnlyOneSuccessResponsePerOperation() throws Exception {
        String json = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var paths = new tools.jackson.databind.ObjectMapper().readTree(json).get("paths");
        int operationCount = 0;
        for (var path : paths.properties()) {
            for (String method : java.util.List.of("get", "post", "put", "patch", "delete", "head", "options", "trace")) {
                var operation = path.getValue().get(method);
                if (operation == null) {
                    continue;
                }
                operationCount++;
                var responses = operation.get("responses");
                org.assertj.core.api.Assertions.assertThat(responses.size())
                        .as("%s %s response count", method, path.getKey()).isEqualTo(1);
                String status = responses.properties().iterator().next().getKey();
                org.assertj.core.api.Assertions.assertThat(status)
                        .as("%s %s success status", method, path.getKey()).matches("2\\d{2}");
            }
        }
        org.assertj.core.api.Assertions.assertThat(operationCount).isGreaterThan(0);
    }

	@Test
	void documentationDoesNotExposeProtectedApis() throws Exception {
		mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data.code").value("AUTHENTICATION_REQUIRED"));
		mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/registration-requests")).andExpect(status().isUnauthorized());
		mockMvc.perform(post("/api/auth/logout")).andExpect(status().isUnauthorized());
	}

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
            "POST, /api/registration-requests/1/approve",
            "POST, /api/registration-requests/1/reject",
            "GET, /api/registration-requests",
            "GET, /api/registration-requests/1",
            "GET, /api/users/me/registration-request"
    })
    void removedAccountApisHaveNoControllerAndReturn404ForAdmin(String method, String path) throws Exception {
        var principal = new com.raceforge.backend.security.AuthenticatedUser("ADM-007", "admin@example.com", "ACTIVE", 7, "ADMIN");
        var authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                principal, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ADMIN")));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(
                        org.springframework.http.HttpMethod.valueOf(method), path)
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(authentication)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.data.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertFalse(
                        result.getHandler() instanceof org.springframework.web.method.HandlerMethod));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
            "/api/horses/14, 400", "/api/horses/hor-000, 400", "/api/horses/HOR-1000, 400",
            "/api/horses/HOR-999, 404", "/api/training-packages/14, 400", "/api/training-packages/PKG-999, 404"
    })
    void businessIdPathsValidateFormatBeforeLookingUpRecords(String path, int expected) throws Exception {
        var principal=new com.raceforge.backend.security.AuthenticatedUser("OWN-000","owner@example.com","ACTIVE",5,"HORSE_OWNER");
        var auth=new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("HORSE_OWNER")));
        mockMvc.perform(get(path).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(auth)))
                .andExpect(status().is(expected));
    }

    @Test
    void swaggerPreservesMixedIdentifierTypes() throws Exception {
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.components.schemas.HorseResponse.properties.horseId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UserResponse.properties.userId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.RoleResponse.properties.roleId.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.MedicalRecordResponse.properties.medicalRecordId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.MedicalRecordResponse.properties.profileId.type").value("string"));
    }

}
=======
// Pre-String ID test retained for reference, superseded by StringTrainingWorkflowIT and StringIdContractTest.
// package com.raceforge.backend;
// 
// import static org.hamcrest.Matchers.containsString;
// import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
// import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
// 
// import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
// import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
// import com.raceforge.backend.account.repository.RefreshTokenRepository;
// import com.raceforge.backend.account.repository.RegistrationRequestRepository;
// import com.raceforge.backend.account.repository.RoleRepository;
// import com.raceforge.backend.account.repository.UserRepository;
// import com.raceforge.backend.audit.repository.AuditLogRepository;
// import com.raceforge.backend.horse.repository.HorseRepository;
// import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
// import com.raceforge.backend.medical.repository.HealthProfileRepository;
// import com.raceforge.backend.medical.repository.MedicalClinicalExamRepository;
// import com.raceforge.backend.medical.repository.MedicalRecordRepository;
// import com.raceforge.backend.medical.repository.MedicalVitalSignRepository;
// import com.raceforge.backend.medical.repository.TrainingLockRepository;
// import com.raceforge.backend.notification.repository.NotificationRepository;
// import com.raceforge.backend.permission.repository.PermissionAuditLogRepository;
// import com.raceforge.backend.permission.repository.PermissionRepository;
// import com.raceforge.backend.permission.repository.RolePermissionRepository;
// import com.raceforge.backend.permission.config.PermissionDataSeeder;
// import com.raceforge.backend.training.repository.HorsePackageRepository;
// import com.raceforge.backend.training.repository.HorsePlanRepository;
// import com.raceforge.backend.training.repository.TrainingPackageRepository;
// import com.raceforge.backend.training.repository.TrainingPlanRepository;
// import com.raceforge.backend.training.repository.TrainingSessionRepository;
// import com.raceforge.backend.training.service.TrainingSessionRules;
// import jakarta.persistence.EntityManager;
// import org.junit.jupiter.api.Test;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.context.SpringBootTest;
// import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
// import org.springframework.test.context.bean.override.mockito.MockitoBean;
// import org.springframework.test.web.servlet.MockMvc;
// 
// @SpringBootTest(properties = {
// 		"spring.autoconfigure.exclude="
// 				+ "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
// 				+ "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
// 				+ "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
// 				+ "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
// })
// @AutoConfigureMockMvc
// class BackendApplicationTests {
// 
// 	@Autowired
// 	private MockMvc mockMvc;
// 
// 	@MockitoBean
// 	private UserRepository userRepository;
// 	@MockitoBean
// 	private RoleRepository roleRepository;
// 	@MockitoBean
// 	private RegistrationRequestRepository registrationRequestRepository;
// 	@MockitoBean
// 	private RefreshTokenRepository refreshTokenRepository;
// 	@MockitoBean
// 	private PasswordResetTokenRepository passwordResetTokenRepository;
// 	@MockitoBean
// 	private EmailVerificationOtpRepository emailVerificationOtpRepository;
// 	@MockitoBean
// 	private NotificationRepository notificationRepository;
// 	@MockitoBean
// 	private AuditLogRepository auditLogRepository;
// 	@MockitoBean
// 	private HorseRepository horseRepository;
// 	@MockitoBean
// 	private HorseRaceHistoryRepository horseRaceHistoryRepository;
// 	@MockitoBean
// 	private HealthProfileRepository healthProfileRepository;
// 	@MockitoBean
// 	private MedicalClinicalExamRepository medicalClinicalExamRepository;
// 	@MockitoBean
// 	private MedicalRecordRepository medicalRecordRepository;
// 	@MockitoBean
// 	private MedicalVitalSignRepository medicalVitalSignRepository;
// 	@MockitoBean
// 	private TrainingLockRepository trainingLockRepository;
// 	@MockitoBean
// 	private PermissionAuditLogRepository permissionAuditLogRepository;
// 	@MockitoBean
// 	private PermissionRepository permissionRepository;
// 	@MockitoBean
// 	private RolePermissionRepository rolePermissionRepository;
// 	@MockitoBean
// 	private com.raceforge.backend.permission.repository.RoleRepository permissionRoleRepository;
// 	@MockitoBean
// 	private HorsePackageRepository horsePackageRepository;
// 	@MockitoBean
// 	private HorsePlanRepository horsePlanRepository;
// 	@MockitoBean
// 	private TrainingPackageRepository trainingPackageRepository;
// 	@MockitoBean
// 	private TrainingPlanRepository trainingPlanRepository;
// 	@MockitoBean
// 	private TrainingSessionRepository trainingSessionRepository;
// 	@MockitoBean
// 	private EntityManager entityManager;
// 	@MockitoBean
// 	private PermissionDataSeeder permissionDataSeeder;
// 	@MockitoBean
// 	private TrainingSessionRules trainingSessionRules;
// 
// 	@Test
// 	void contextLoads() {
// 	}
// 
// 	@Test
// 	void swaggerUiAndAssetsArePublic() throws Exception {
// 		mockMvc.perform(get("/swagger-ui.html"))
// 				.andExpect(status().is3xxRedirection())
// 				.andExpect(redirectedUrl("/swagger-ui/index.html"));
// 		mockMvc.perform(get("/swagger-ui/index.html"))
// 				.andExpect(status().isOk())
// 				.andExpect(content().string(containsString("Swagger UI")))
//                 .andExpect(content().string(containsString("./raceforge-errors.js")));
//         mockMvc.perform(get("/swagger-ui/raceforge-errors.js"))
//                 .andExpect(status().isOk())
//                 .andExpect(content().string(containsString("raceforge-error-message")));
// 		mockMvc.perform(get("/swagger-ui/swagger-ui-bundle.js"))
// 				.andExpect(status().isOk());
// 		mockMvc.perform(get("/v3/api-docs/swagger-config"))
// 				.andExpect(status().isOk())
// 				.andExpect(jsonPath("$.url").value("/v3/api-docs"));
// 	}
// 
// 	@Test
// 	void openApiDocumentsPublicAndBearerProtectedEndpoints() throws Exception {
// 		mockMvc.perform(get("/v3/api-docs"))
// 				.andExpect(status().isOk())
// 				.andExpect(jsonPath("$.info.title").value("RaceForge API"))
//                 .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['200'].description").value("OK"))
//                 .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['200'].content").exists())
// 				.andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
// 				.andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
// 				.andExpect(jsonPath("$.security[0].bearerAuth").isArray())
// 				.andExpect(jsonPath("$.paths['/api/auth/login'].post.security").isEmpty())
// 				.andExpect(jsonPath("$.paths['/api/auth/register'].post.security").isEmpty())
// 				.andExpect(jsonPath("$.paths['/api/auth/google/set-password'].post.security").doesNotExist())
// 				.andExpect(jsonPath("$.paths['/api/users/me/external-logins/google']").doesNotExist())
// 				.andExpect(jsonPath("$.paths['/api/health'].get.security").isEmpty())
// 				.andExpect(jsonPath("$.paths['/api/auth/logout'].post").exists())
// 				.andExpect(jsonPath("$.paths['/api/auth/logout'].post.security").doesNotExist())
// 				.andExpect(jsonPath("$.paths['/api/users/me'].get").exists())
// 				.andExpect(jsonPath("$.paths['/api/users/me'].get.security").doesNotExist())
// 				.andExpect(jsonPath("$.paths['/api/users/me'].get.parameters").doesNotExist())
// 				.andExpect(jsonPath("$.paths['/api/registration-requests'].get").exists());
// 		mockMvc.perform(get("/v3/api-docs.yaml"))
// 				.andExpect(status().isOk());
// 	}
// 
// 	@Test
// 	void openApiDocumentsOnlyOneSuccessResponsePerOperation() throws Exception {
//         String json = mockMvc.perform(get("/v3/api-docs"))
//                 .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
//         var paths = new tools.jackson.databind.ObjectMapper().readTree(json).get("paths");
//         int operationCount = 0;
//         for (var path : paths.properties()) {
//             for (String method : java.util.List.of("get", "post", "put", "patch", "delete", "head", "options", "trace")) {
//                 var operation = path.getValue().get(method);
//                 if (operation == null) {
//                     continue;
//                 }
//                 operationCount++;
//                 var responses = operation.get("responses");
//                 org.assertj.core.api.Assertions.assertThat(responses.size())
//                         .as("%s %s response count", method, path.getKey()).isEqualTo(1);
//                 String status = responses.properties().iterator().next().getKey();
//                 org.assertj.core.api.Assertions.assertThat(status)
//                         .as("%s %s success status", method, path.getKey()).matches("2\\d{2}");
//             }
//         }
//         org.assertj.core.api.Assertions.assertThat(operationCount).isGreaterThan(0);
//     }
// 
// 	@Test
// 	void documentationDoesNotExposeProtectedApis() throws Exception {
// 		mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized())
//                 .andExpect(jsonPath("$.data.code").value("AUTHENTICATION_REQUIRED"));
// 		mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
// 		mockMvc.perform(get("/api/registration-requests")).andExpect(status().isUnauthorized());
// 		mockMvc.perform(post("/api/auth/logout")).andExpect(status().isUnauthorized());
// 	}
// 
// }
// 
>>>>>>> 76de6e5 (luu code)
