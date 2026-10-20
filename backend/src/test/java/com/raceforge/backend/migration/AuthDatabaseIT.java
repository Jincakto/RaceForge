<<<<<<< HEAD
package com.raceforge.backend.migration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.entity.EmailVerificationOtp;
import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.account.service.EmailService;
import com.raceforge.backend.account.service.GoogleIdentity;
import com.raceforge.backend.account.service.GoogleTokenVerifier;
import com.raceforge.backend.security.JwtService;
import java.util.UUID;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Opt-in API tests against a disposable SQL Server clone, never the real database. */
@SpringBootTest
@AutoConfigureMockMvc
class AuthDatabaseIT {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = System.getenv("RACEFORGE_MIGRATION_TEST_URL");
        if (url == null || !url.contains("databaseName=RaceForge_IdMigrationTest_"))
            throw new IllegalStateException("A disposable migration-test clone is required");
        registry.add("spring.datasource.url", () -> url);
    }

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired com.raceforge.backend.account.repository.RoleRepository roles;
    @Autowired EmailVerificationOtpRepository emailOtps;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean EmailService emailService;
    @MockitoBean GoogleTokenVerifier google;

    @Test
    void registrationOtpAndOwnerPermissionsPersistInSqlServer() throws Exception {
        String email = "auth-it-" + UUID.randomUUID() + "@example.com";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"fullName":"API Test","email":"%s","password":"StrongPass123!","phone":"0900123456","roleId":7,"requestedRoleId":3}
                """.formatted(email))).andExpect(status().is2xxSuccessful());
        User user = users.findByEmail(email).orElseThrow();
        assertNotNull(user.getUserId());
        assertEquals(5, user.getRole().getRoleId());
        assertEquals("0900123456", user.getPhone());
        assertTrue(passwords.matches("StrongPass123!", user.getPassword()));
        assertNotEquals("StrongPass123!", user.getPassword());
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtp(eq(email), otp.capture());
        EmailVerificationOtp verification = emailOtps.findById(user.getUserId()).orElseThrow();
        assertNotEquals(otp.getValue(), verification.getOtpHash());
        String wrong = otp.getValue().equals("000000") ? "111111" : "000000";
        verifyOtp(email, wrong, 400);
        assertEquals(1, emailOtps.findById(user.getUserId()).orElseThrow().getAttemptCount());
        verifyOtp(email, otp.getValue(), 200);
        user = users.findByEmail(email).orElseThrow();
        assertTrue(user.isEmailVerified());
        assertEquals("ACTIVE", user.getStatus());
        assertTrue(emailOtps.findById(user.getUserId()).isEmpty());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"StrongPass123!"}
                """.formatted(email))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.userId").isString())
                .andExpect(jsonPath("$.data.user.role.roleId").value(5))
                .andExpect(jsonPath("$.data.user.password").doesNotExist())
                .andExpect(jsonPath("$.data.user.otpHash").doesNotExist());
        String bearer = "Bearer " + jwt.createAccessToken(users.findDetailedById(user.getUserId()).orElseThrow());
        mvc.perform(get("/api/users/me").header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(put("/api/users/me").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Updated Name\",\"phone\":\"0012345678\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.phone").value("0012345678"));
        mvc.perform(get("/api/horses").header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(get("/api/users").header("Authorization", bearer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/registration-requests").header("Authorization", bearer)).andExpect(status().isNotFound());
        mvc.perform(post("/api/auth/logout").header("Authorization", bearer)).andExpect(status().isOk());
    }

    @Test
    void googleAccountUsesEmailAndRequiresPasswordSetup() throws Exception {
        String subject = "google-it-" + UUID.randomUUID();
        String email = subject + "@example.com";
        when(google.verify("verified-google-token"))
                .thenReturn(new GoogleIdentity(subject, email, true, "Google Test", null));
        String body = mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON)
                .content("{\"idToken\":\"verified-google-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordSetupRequired").value(true))
                .andExpect(jsonPath("$.data.accessToken").isEmpty())
                .andExpect(jsonPath("$.data.user.role.roleId").value(5))
                .andReturn().getResponse().getContentAsString();
        String setupToken = objectMapper.readTree(body).get("data").get("passwordSetupToken").asText();
        User user = users.findByEmail(email).orElseThrow();
        assertEquals(email, user.getEmail());
        assertNull(user.getPassword());
        assertTrue(user.isEmailVerified());
        mvc.perform(post("/api/auth/google/set-password").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "passwordSetupToken", setupToken,
                        "newPassword", "GooglePassword123!"
                ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
        assertTrue(passwords.matches("GooglePassword123!", users.findByEmail(email).orElseThrow().getPassword()));
    }

    @Test
    void adminInvitationActivatesStaffAndIsSingleUseInSqlServer() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User admin = new User();
        admin.setEmail("admin-" + suffix + "@example.com");
        admin.setFullName("Test Admin"); admin.setStatus("ACTIVE"); admin.setEmailVerified(true);
        admin.setRole(roles.findById(7).orElseThrow());
        users.saveAndFlush(admin);
        String email = "staff-" + suffix + "@example.com";
        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + jwt.createAccessToken(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("fullName", "Test Vet", "email", email, "roleId", 3))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.status").value("INVITED"));
        User staff = users.findByEmail(email).orElseThrow();
        assertNull(staff.getPassword());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendStaffInvitation(eq(email), link.capture());
        String token = link.getValue().split("token=")[1];
        mvc.perform(post("/api/admin/users/" + staff.getUserId() + "/invitation")
                .header("Authorization", "Bearer " + jwt.createAccessToken(admin))).andExpect(status().isOk());
        mvc.perform(post("/api/auth/staff/set-password").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("token", token, "newPassword", "StaffPassword123!"))))
                .andExpect(status().isBadRequest());
        verify(emailService, times(2)).sendStaffInvitation(eq(email), link.capture());
        token = link.getValue().split("token=")[1];
        String body = objectMapper.writeValueAsString(Map.of("token", token, "newPassword", "StaffPassword123!"));
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/staff/set-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/staff/set-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        staff = users.findByEmail(email).orElseThrow();
        assertEquals("ACTIVE", staff.getStatus());
        assertEquals(3, staff.getRole().getRoleId());
        assertTrue(staff.isEmailVerified());
        assertTrue(passwords.matches("StaffPassword123!", staff.getPassword()));
    }

    @Test
    void emailFailureRollsBackInvitedAccountInSqlServer() throws Exception {
        User admin = new User();
        admin.setEmail("rollback-admin-" + UUID.randomUUID() + "@example.com");
        admin.setFullName("Test Admin"); admin.setStatus("ACTIVE"); admin.setEmailVerified(true);
        admin.setRole(roles.findById(7).orElseThrow()); users.saveAndFlush(admin);
        String email = "rollback-staff-" + UUID.randomUUID() + "@example.com";
        doThrow(new org.springframework.mail.MailSendException("Simulated delivery failure"))
                .when(emailService).sendStaffInvitation(eq(email), anyString());
        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + jwt.createAccessToken(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("fullName", "Test Vet", "email", email, "roleId", 3))))
                .andExpect(status().isServiceUnavailable());
        assertFalse(users.existsByEmail(email));
    }

    private void verifyOtp(String email, String code, int status) throws Exception {
        mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"otp\":\"%s\"}".formatted(email, code)))
                .andExpect(status().is(status));
    }
}
=======
// Pre-String ID test retained for reference, superseded by StringTrainingWorkflowIT and StringIdContractTest.
// package com.raceforge.backend.migration;
// 
// import static org.junit.jupiter.api.Assertions.*;
// import static org.mockito.ArgumentMatchers.*;
// import static org.mockito.Mockito.*;
// import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
// 
// import com.raceforge.backend.account.entity.User;
// import com.raceforge.backend.account.entity.EmailVerificationOtp;
// import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
// import com.raceforge.backend.account.repository.UserRepository;
// import com.raceforge.backend.account.service.EmailService;
// import com.raceforge.backend.account.service.GoogleIdentity;
// import com.raceforge.backend.account.service.GoogleTokenVerifier;
// import com.raceforge.backend.security.JwtService;
// import java.util.UUID;
// import java.util.Map;
// import tools.jackson.databind.ObjectMapper;
// import org.junit.jupiter.api.Test;
// import org.mockito.ArgumentCaptor;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.context.SpringBootTest;
// import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
// import org.springframework.http.MediaType;
// import org.springframework.security.crypto.password.PasswordEncoder;
// import org.springframework.test.context.DynamicPropertyRegistry;
// import org.springframework.test.context.DynamicPropertySource;
// import org.springframework.test.context.bean.override.mockito.MockitoBean;
// import org.springframework.test.web.servlet.MockMvc;
// 
// /** Opt-in API tests against a disposable SQL Server clone, never the real database. */
// @SpringBootTest
// @AutoConfigureMockMvc
// class AuthDatabaseIT {
//     @DynamicPropertySource
//     static void database(DynamicPropertyRegistry registry) {
//         String url = System.getenv("RACEFORGE_MIGRATION_TEST_URL");
//         if (url == null || !url.contains("databaseName=RaceForge_IdMigrationTest_"))
//             throw new IllegalStateException("A disposable migration-test clone is required");
//         registry.add("spring.datasource.url", () -> url);
//     }
// 
//     @Autowired MockMvc mvc;
//     @Autowired UserRepository users;
//     @Autowired EmailVerificationOtpRepository emailOtps;
//     @Autowired PasswordEncoder passwords;
//     @Autowired JwtService jwt;
//     @Autowired ObjectMapper objectMapper;
//     @MockitoBean EmailService emailService;
//     @MockitoBean GoogleTokenVerifier google;
// 
//     @Test
//     void registrationOtpAndBasicUserPermissionsPersistInSqlServer() throws Exception {
//         String email = "auth-it-" + UUID.randomUUID() + "@example.com";
//         mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
//                 {"fullName":"API Test","email":"%s","password":"StrongPass123!","phone":"0900123456"}
//                 """.formatted(email))).andExpect(status().is2xxSuccessful());
//         User user = users.findByEmail(email).orElseThrow();
//         assertNotNull(user.getUserId());
//         assertEquals(6, user.getRole().getRoleId());
//         assertEquals("0900123456", user.getPhone());
//         assertTrue(passwords.matches("StrongPass123!", user.getPassword()));
//         assertNotEquals("StrongPass123!", user.getPassword());
//         ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
//         verify(emailService).sendOtp(eq(email), otp.capture());
//         EmailVerificationOtp verification = emailOtps.findById(user.getUserId()).orElseThrow();
//         assertNotEquals(otp.getValue(), verification.getOtpHash());
//         String wrong = otp.getValue().equals("000000") ? "111111" : "000000";
//         verifyOtp(email, wrong, 400);
//         assertEquals(1, emailOtps.findById(user.getUserId()).orElseThrow().getAttemptCount());
//         verifyOtp(email, otp.getValue(), 200);
//         user = users.findByEmail(email).orElseThrow();
//         assertTrue(user.isEmailVerified());
//         assertEquals("ACTIVE", user.getStatus());
//         assertTrue(emailOtps.findById(user.getUserId()).isEmpty());
//         mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
//                 {"email":"%s","password":"StrongPass123!"}
//                 """.formatted(email))).andExpect(status().isOk())
//                 .andExpect(jsonPath("$.data.user.userId").isNumber())
//                 .andExpect(jsonPath("$.data.user.role.roleId").value(6))
//                 .andExpect(jsonPath("$.data.user.password").doesNotExist())
//                 .andExpect(jsonPath("$.data.user.otpHash").doesNotExist());
//         String bearer = "Bearer " + jwt.createAccessToken(users.findDetailedById(user.getUserId()).orElseThrow());
//         mvc.perform(get("/api/users/me").header("Authorization", bearer)).andExpect(status().isOk());
//         mvc.perform(put("/api/users/me").header("Authorization", bearer)
//                 .contentType(MediaType.APPLICATION_JSON)
//                 .content("{\"fullName\":\"Updated Name\",\"phone\":\"0012345678\"}"))
//                 .andExpect(status().isOk()).andExpect(jsonPath("$.data.phone").value("0012345678"));
//         mvc.perform(get("/api/horses").header("Authorization", bearer)).andExpect(status().isForbidden());
//         mvc.perform(get("/api/users").header("Authorization", bearer)).andExpect(status().isForbidden());
//         mvc.perform(get("/api/registration-requests").header("Authorization", bearer)).andExpect(status().isForbidden());
//         mvc.perform(post("/api/auth/logout").header("Authorization", bearer)).andExpect(status().isOk());
//     }
// 
//     @Test
//     void googleAccountUsesEmailAndRequiresPasswordSetup() throws Exception {
//         String subject = "google-it-" + UUID.randomUUID();
//         String email = subject + "@example.com";
//         when(google.verify("verified-google-token"))
//                 .thenReturn(new GoogleIdentity(subject, email, true, "Google Test", null));
//         String body = mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON)
//                 .content("{\"idToken\":\"verified-google-token\"}"))
//                 .andExpect(status().isOk())
//                 .andExpect(jsonPath("$.data.passwordSetupRequired").value(true))
//                 .andExpect(jsonPath("$.data.accessToken").isEmpty())
//                 .andExpect(jsonPath("$.data.user.role.roleId").value(6))
//                 .andReturn().getResponse().getContentAsString();
//         String setupToken = objectMapper.readTree(body).get("data").get("passwordSetupToken").asText();
//         User user = users.findByEmail(email).orElseThrow();
//         assertEquals(email, user.getEmail());
//         assertNull(user.getPassword());
//         assertTrue(user.isEmailVerified());
//         mvc.perform(post("/api/auth/google/set-password").contentType(MediaType.APPLICATION_JSON)
//                 .content(objectMapper.writeValueAsString(Map.of(
//                         "passwordSetupToken", setupToken,
//                         "newPassword", "GooglePassword123!"
//                 ))))
//                 .andExpect(status().isOk())
//                 .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
//         assertTrue(passwords.matches("GooglePassword123!", users.findByEmail(email).orElseThrow().getPassword()));
//     }
// 
//     private void verifyOtp(String email, String code, int status) throws Exception {
//         mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
//                 .content("{\"email\":\"%s\",\"otp\":\"%s\"}".formatted(email, code)))
//                 .andExpect(status().is(status));
//     }
// }
// 
>>>>>>> 76de6e5 (luu code)
