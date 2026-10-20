package com.raceforge.backend.account.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.account.service.AuthService;
import com.raceforge.backend.account.service.StaffAccountService;
import com.raceforge.backend.security.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {AdminUserController.class, AuthController.class})
@Import({SecurityConfig.class, com.raceforge.backend.config.AuthProperties.class})
class AccountSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtService jwt;
    @MockitoBean UserRepository users;
    @MockitoBean StaffAccountService staff;
    @MockitoBean AuthService auth;
    private static final String BODY = "{\"fullName\":\"Staff\",\"email\":\"staff@example.com\",\"roleId\":3}";

    @Test void anonymousCannotCreateStaff() throws Exception {
        mvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(staff);
    }

    @ParameterizedTest @ValueSource(strings = {"CLUB_MANAGER", "HORSE_OWNER", "HEAD_TRAINER", "VETERINARIAN", "GROOM", "USER"})
    void otherRolesCannotCreateOrResendStaff(String role) throws Exception {
        authenticate(role, "ACTIVE");
        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer token").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/users/42/invitation").header("Authorization", "Bearer token"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(staff);
    }

    @Test void activeAdminCanCreateStaff() throws Exception {
        authenticate("ADMIN", "ACTIVE");
        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer token").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated());
        verify(staff).create(eq("USR-542"), any());
    }

    @Test void pendingAdminHasNoAdminAuthority() throws Exception {
        authenticate("ADMIN", "PENDING");
        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer token").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
        verifyNoInteractions(staff);
    }

    @Test void removedApprovalEndpointReturnsNotFoundForAdmin() throws Exception {
        authenticate("ADMIN", "ACTIVE");
        mvc.perform(post("/api/registration-requests/1/approve").header("Authorization", "Bearer token"))
                .andExpect(status().isNotFound());
    }

    @Test void invitationPasswordSetupIsPublic() throws Exception {
        mvc.perform(post("/api/auth/staff/set-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"invitation\",\"newPassword\":\"StrongPassword123\"}"))
                .andExpect(status().isOk());
        verify(staff).setPassword(any());
    }

    @Test void publicRegistrationDoesNotAcceptRoleSelectionInItsContract() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Owner\",\"email\":\"owner@example.com\",\"password\":\"StrongPass123\",\"requestedRoleId\":7,\"roleId\":7}"))
                .andExpect(status().isOk());
        verify(auth).register(new com.raceforge.backend.account.dto.AuthDtos.RegisterRequest("Owner", "owner@example.com", "StrongPass123", null));
    }

    private void authenticate(String name, String status) {
        Role role = new Role(); role.setRoleId("ADMIN".equals(name) ? "ROL-007" : "ROL-001"); role.setRoleName(name);
        User user = new User(); user.setUserId("USR-542"); user.setEmail("user@example.com"); user.setRole(role); user.setStatus(status);
        when(jwt.parse("token")).thenReturn(new AuthenticatedUser("USR-542", user.getEmail(), status, role.getRoleId(), name));
        when(users.findDetailedById("USR-542")).thenReturn(Optional.of(user));
    }
}
