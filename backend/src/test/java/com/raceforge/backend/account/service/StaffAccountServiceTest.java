package com.raceforge.backend.account.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.raceforge.backend.account.dto.AuthDtos.ResetPasswordRequest;
import com.raceforge.backend.account.dto.UserDtos.CreateStaffRequest;
import com.raceforge.backend.account.entity.*;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.*;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.util.SecureTokenUtil;
import com.raceforge.backend.config.AuthProperties;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class StaffAccountServiceTest {
    UserRepository users = mock(UserRepository.class);
    RoleRepository roles = mock(RoleRepository.class);
    PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
    EmailService email = mock(EmailService.class);
    AuditService audit = mock(AuditService.class);
    BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    StaffAccountService service;

    @BeforeEach void setup() {
        AuthProperties properties = new AuthProperties();
        properties.getPasswordReset().setMinutes(15);
        properties.getPasswordReset().setFrontendUrl("http://localhost:5173/reset-password");
        service = new StaffAccountService(users, roles, tokens, passwords, email, properties, new AccountMapper(), audit);
    }

    @ParameterizedTest @ValueSource(ints = {1, 2, 3, 4})
    void adminCreatesInvitedStaffWithoutPasswordAndStoresOnlyTokenHash(int roleId) {
        when(users.findDetailedById("USR-707")).thenReturn(Optional.of(user(7, "ADMIN", "ACTIVE")));
        when(roles.findById(String.format("ROL-%03d",roleId))).thenReturn(Optional.of(role(roleId, "STAFF")));
        when(users.saveAndFlush(any())).thenAnswer(i -> { User user = i.getArgument(0); user.setUserId("USR-542"); return user; });
        var result = service.create("USR-707", new CreateStaffRequest(" Staff ", "STAFF@example.com", "0900123456", String.format("ROL-%03d",roleId)));
        assertEquals("staff@example.com", result.email());
        assertEquals("Staff", result.fullName());
        assertEquals("INVITED", result.status());
        assertFalse(result.emailVerified());
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(saved.capture());
        assertNull(saved.getValue().getPassword());
        ArgumentCaptor<PasswordResetToken> token = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokens).save(token.capture());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(email).sendStaffInvitation(eq("staff@example.com"), link.capture());
        String raw = link.getValue().split("token=")[1];
        assertEquals(SecureTokenUtil.sha256Hex(raw), token.getValue().getTokenHash());
        assertEquals(PasswordResetToken.STAFF_INVITATION, token.getValue().getPurpose());
        assertTrue(token.getValue().getExpiresAt().isAfter(Instant.now()));
    }

    @ParameterizedTest @ValueSource(ints = {1, 2, 3, 4, 5, 6})
    void nonAdminCannotCreateStaff(int roleId) {
        when(users.findDetailedById("USR-707")).thenReturn(Optional.of(user(roleId, "OTHER", "ACTIVE")));
        assertThrows(ApiException.class, () -> service.create("USR-707", new CreateStaffRequest("Staff", "s@example.com", null, "ROL-003")));
        verify(users, never()).saveAndFlush(any());
        verifyNoInteractions(tokens, email);
    }

    @ParameterizedTest @ValueSource(ints = {5, 6, 7, 999})
    void adminCannotAssignOwnerGenericOrAdminRoles(int roleId) {
        when(users.findDetailedById("USR-707")).thenReturn(Optional.of(user(7, "ADMIN", "ACTIVE")));
        assertThrows(ApiException.class, () -> service.create("USR-707", new CreateStaffRequest("Staff", "s@example.com", null, String.format("ROL-%03d",roleId))));
        verifyNoInteractions(tokens, email);
    }

    @Test void duplicateEmailRejectedBeforeInvitation() {
        when(users.findDetailedById("USR-707")).thenReturn(Optional.of(user(7, "ADMIN", "ACTIVE")));
        when(users.existsByEmail("s@example.com")).thenReturn(true);
        assertThrows(ApiException.class, () -> service.create("USR-707", new CreateStaffRequest("Staff", "s@example.com", null, "ROL-003")));
        verifyNoInteractions(tokens, email);
    }

    @Test void inactiveAdminCannotCreateStaff() {
        when(users.findDetailedById("USR-707")).thenReturn(Optional.of(user(7, "ADMIN", "INACTIVE")));
        assertThrows(ApiException.class, () -> service.create("USR-707", new CreateStaffRequest("Staff", "s@example.com", null, "ROL-003")));
        verify(users, never()).saveAndFlush(any());
    }

    @Test void invitationActivatesStaffAndCannotBeUsedTwice() {
        User staff = user(3, "VETERINARIAN", "INVITED");
        PasswordResetToken token = invitation(staff);
        when(tokens.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(token));
        when(users.findByIdForUpdate("USR-542")).thenReturn(Optional.of(staff));
        service.setPassword(new ResetPasswordRequest("raw", "NewPassword123"));
        assertEquals("ACTIVE", staff.getStatus());
        assertTrue(staff.isEmailVerified());
        assertTrue(passwords.matches("NewPassword123", staff.getPassword()));
        assertNotNull(token.getUsedAt());
        assertThrows(ApiException.class, () -> service.setPassword(new ResetPasswordRequest("raw", "AnotherPassword123")));
    }

    @Test void expiredAndWrongPurposeTokensCannotActivateStaff() {
        User staff = user(3, "VETERINARIAN", "INVITED");
        PasswordResetToken token = invitation(staff);
        when(tokens.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(token));
        token.setExpiresAt(Instant.now().minusSeconds(1));
        assertThrows(ApiException.class, () -> service.setPassword(new ResetPasswordRequest("raw", "NewPassword123")));
        token.setExpiresAt(Instant.now().plusSeconds(60));
        token.setPurpose(PasswordResetToken.PASSWORD_RESET);
        assertThrows(ApiException.class, () -> service.setPassword(new ResetPasswordRequest("raw", "NewPassword123")));
        assertNull(staff.getPassword());
        assertEquals("INVITED", staff.getStatus());
    }

    @Test void resendInvalidatesOldTokens() {
        when(users.findDetailedById("USR-707")).thenReturn(Optional.of(user(7, "ADMIN", "ACTIVE")));
        when(users.findByIdForUpdate("USR-542")).thenReturn(Optional.of(user(3, "VETERINARIAN", "INVITED")));
        service.resend("USR-707", "USR-542");
        var order = inOrder(tokens, email);
        order.verify(tokens).markAllUnusedForUserUsed(eq("USR-542"), any());
        order.verify(tokens).save(any());
        order.verify(email).sendStaffInvitation(any(), any());
    }

    private PasswordResetToken invitation(User user) {
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user); token.setPurpose(PasswordResetToken.STAFF_INVITATION);
        token.setExpiresAt(Instant.now().plusSeconds(60)); return token;
    }
    private User user(int roleId, String name, String status) {
        User user = new User(); user.setUserId("USR-542"); user.setEmail("s@example.com"); user.setFullName("Staff");
        user.setRole(role(roleId, name)); user.setStatus(status); return user;
    }
    private Role role(int id, String name) {
        Role role = new Role(); role.setRoleId(String.format("ROL-%03d",id)); role.setRoleName(name); return role;
    }
}
