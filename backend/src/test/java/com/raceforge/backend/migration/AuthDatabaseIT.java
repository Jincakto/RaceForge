package com.raceforge.backend.migration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.account.service.EmailService;
import com.raceforge.backend.account.service.GoogleIdentity;
import com.raceforge.backend.account.service.GoogleTokenVerifier;
import com.raceforge.backend.security.JwtService;
import java.util.UUID;
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
    @Autowired PasswordEncoder passwords;
    @Autowired JwtService jwt;
    @MockitoBean EmailService emailService;
    @MockitoBean GoogleTokenVerifier google;

    @Test
    void registrationOtpAndBasicUserPermissionsPersistInSqlServer() throws Exception {
        String email = "auth-it-" + UUID.randomUUID() + "@example.com";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"fullName":"API Test","email":"%s","password":"StrongPass123!","phone":"0900123456"}
                """.formatted(email))).andExpect(status().is2xxSuccessful());
        User user = users.findByEmail(email).orElseThrow();
        assertNotNull(user.getUserId());
        assertEquals(6, user.getRole().getRoleId());
        assertEquals("0900123456", user.getPhone());
        assertTrue(passwords.matches("StrongPass123!", user.getPassword()));
        assertNotEquals("StrongPass123!", user.getPassword());
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtp(eq(email), otp.capture());
        assertNotEquals(otp.getValue(), user.getOtpHash());
        String wrong = otp.getValue().equals("000000") ? "111111" : "000000";
        verifyOtp(email, wrong, 400);
        assertEquals(1, users.findByEmail(email).orElseThrow().getOtpAttemptCount());
        verifyOtp(email, otp.getValue(), 200);
        user = users.findByEmail(email).orElseThrow();
        assertTrue(user.isEmailVerified());
        assertEquals("ACTIVE", user.getStatus());
        assertNull(user.getOtpHash());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"StrongPass123!"}
                """.formatted(email))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.userId").isNumber())
                .andExpect(jsonPath("$.data.user.role.roleId").value(6))
                .andExpect(jsonPath("$.data.user.password").doesNotExist())
                .andExpect(jsonPath("$.data.user.otpHash").doesNotExist());
        String bearer = "Bearer " + jwt.createAccessToken(users.findDetailedById(user.getUserId()).orElseThrow());
        mvc.perform(get("/api/users/me").header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(put("/api/users/me").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Updated Name\",\"phone\":\"0012345678\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.phone").value("0012345678"));
        mvc.perform(get("/api/horses").header("Authorization", bearer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/users").header("Authorization", bearer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/registration-requests").header("Authorization", bearer)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").header("Authorization", bearer)).andExpect(status().isOk());
    }

    @Test
    void googleAccountIsStoredOnUserWithDefaultRole() throws Exception {
        String subject = "google-it-" + UUID.randomUUID();
        String email = subject + "@example.com";
        when(google.verify("verified-google-token"))
                .thenReturn(new GoogleIdentity(subject, email, true, "Google Test", null));
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON)
                .content("{\"idToken\":\"verified-google-token\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.user.role.roleId").value(6));
        User user = users.findByGoogleSubject(subject).orElseThrow();
        assertEquals(email, user.getEmail());
        assertNull(user.getPassword());
        assertNotNull(user.getGoogleLinkedAt());
        assertTrue(user.isEmailVerified());
    }

    private void verifyOtp(String email, String code, int status) throws Exception {
        mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"otp\":\"%s\"}".formatted(email, code)))
                .andExpect(status().is(status));
    }
}
