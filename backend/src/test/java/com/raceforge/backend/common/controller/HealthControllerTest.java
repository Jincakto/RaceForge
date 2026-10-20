package com.raceforge.backend.common.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.raceforge.backend.config.CorsConfig;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.security.JwtService;
import com.raceforge.backend.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = HealthController.class)
@Import({SecurityConfig.class, CorsConfig.class})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.service").value("RaceForge Backend"));
    }

    @Test
    void otherApiEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/protected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void authenticatedUnknownApiReceives404() throws Exception {
        mockMvc.perform(get("/api/missing").with(
                org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("tester")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.data.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void invalidTokenReceives401() throws Exception {
        org.mockito.Mockito.when(jwtService.parse("invalid"))
                .thenThrow(new io.jsonwebtoken.MalformedJwtException("Invalid token"));
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void databaseFailureDuringAuthenticationIsNotReportedAsInvalidToken() throws Exception {
        org.mockito.Mockito.when(jwtService.parse("valid"))
                .thenReturn(new com.raceforge.backend.security.AuthenticatedUser("CM-001", "test@example.com", "ACTIVE", 1, "CLUB_MANAGER"));
        org.mockito.Mockito.when(userRepository.findDetailedById("CM-001"))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("Database unavailable"));
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer valid"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.data.code").value("DATABASE_UNAVAILABLE"))
                .andExpect(jsonPath("$.data.errorId").isNotEmpty());
    }
}
