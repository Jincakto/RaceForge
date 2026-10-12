package com.raceforge.backend.account.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import com.raceforge.backend.account.dto.AuthDtos.RegisterRequest;
import com.raceforge.backend.account.dto.AuthDtos.VerifyEmailRequest;
import com.raceforge.backend.account.dto.AuthDtos.ResendOtpRequest;
import com.raceforge.backend.account.dto.AuthDtos.GoogleAuthRequest;
import com.raceforge.backend.account.dto.AuthDtos.LoginRequest;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RegistrationRequestRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.util.SecureTokenUtil;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.time.Instant;
import java.util.Optional;
import org.mockito.ArgumentCaptor;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private RegistrationRequestRepository registrationRequestRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private JwtService jwtService;
    @Mock
    private EmailService emailService;
    @Mock
    private GoogleTokenVerifier googleTokenVerifier;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AuditService auditService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        AuthProperties properties = new AuthProperties();
        properties.getOtp().setSecret("test-otp-secret-at-least-32-bytes");
        properties.getOtp().setMinutes(5);
        properties.getOtp().setResendSeconds(60);
        properties.getOtp().setMaxAttempts(5);
        properties.getRefreshToken().setDays(7);
        properties.getPasswordReset().setMinutes(15);
        properties.getPasswordReset().setFrontendUrl("http://localhost/reset-password");
        authService = new AuthService(
                userRepository,
                roleRepository,
                registrationRequestRepository,
                refreshTokenRepository,
                passwordResetTokenRepository,
                new BCryptPasswordEncoder(),
                jwtService,
                emailService,
                googleTokenVerifier,
                notificationService,
                auditService,
                new AccountMapper(),
                properties
        );
    }

    @Test
    void registerRejectsManagerRole() {
        when(userRepository.existsByEmail("manager@example.com")).thenReturn(false);

        RegisterRequest request = new RegisterRequest(
                "Manager",
                "manager@example.com",
                "StrongPass123",
                null,
                1
        );

        assertThrows(ApiException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmail("owner@example.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "Owner",
                "owner@example.com",
                "StrongPass123",
                null,
                5
        );

        assertThrows(ApiException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registrationUsesUserRoleBcryptAndStringPhoneWithOnlyOtpHashStored() {
        when(roleRepository.findById(6)).thenReturn(Optional.of(role(6, "USER")));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user=invocation.getArgument(0); user.setUserId(42); return user;
        });
        authService.register(new RegisterRequest("Owner", "owner@example.com", "StrongPass123", "0900012345", null));
        ArgumentCaptor<User> saved=ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<String> otp=ArgumentCaptor.forClass(String.class);
        verify(userRepository).save(saved.capture());
        verify(emailService).sendOtp(org.mockito.ArgumentMatchers.eq("owner@example.com"),otp.capture());
        User user=saved.getValue();
        assertEquals(6,user.getRole().getRoleId());
        assertEquals("0900012345",user.getPhone());
        assertTrue(new BCryptPasswordEncoder().matches("StrongPass123",user.getPassword()));
        assertNotEquals("StrongPass123",user.getPassword());
        assertNotEquals(otp.getValue(),user.getOtpHash());
        assertEquals(SecureTokenUtil.hmacSha256Hex("test-otp-secret-at-least-32-bytes","42:"+otp.getValue()),user.getOtpHash());
        assertEquals("UNVERIFIED",user.getStatus());
    }

    @Test
    void validOtpActivatesBasicUserAndCannotBeUsedTwice() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
        assertEquals("ACTIVE",user.getStatus());
        assertEquals(6,user.getRole().getRoleId());
        assertTrue(user.isEmailVerified());
        assertNull(user.getOtpHash());
        authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
        verify(registrationRequestRepository,never()).save(any());
    }

    @Test
    void invalidOtpCountsAttempts() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"000000")));
        assertEquals(1,user.getOtpAttemptCount());
        assertEquals("UNVERIFIED",user.getStatus());
    }

    @Test
    void expiredOtpAndAttemptLimitRejectEvenTheCorrectCode() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        user.setOtpExpiresAt(Instant.now().minusSeconds(1));
        assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456")));
        user.setOtpExpiresAt(Instant.now().plusSeconds(60));
        user.setOtpAttemptCount(5);
        assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456")));
        assertEquals("UNVERIFIED",user.getStatus());
    }

    @Test
    void businessRoleRequestKeepsBasicRoleUntilApprovalAndIsCreatedOnce() {
        User user=unverifiedUser(); user.setRequestedRole(role(5,"HORSE_OWNER"));
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
        authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
        assertEquals("PENDING",user.getStatus());
        assertEquals(6,user.getRole().getRoleId());
        verify(registrationRequestRepository,times(1)).save(any());
    }

    @Test
    void resendEnforcesCooldownAndReplacesPreviousOtpHash() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        user.setOtpSentAt(Instant.now());
        assertThrows(ApiException.class,()->authService.resendOtp(new ResendOtpRequest(user.getEmail())));
        verify(emailService,never()).sendOtp(any(),any());
        user.setOtpSentAt(Instant.now().minusSeconds(61));
        user.setOtpHash("invalidated-old-hash"); user.setOtpAttemptCount(4);
        authService.resendOtp(new ResendOtpRequest(user.getEmail()));
        assertNotEquals("invalidated-old-hash",user.getOtpHash());
        assertEquals(0,user.getOtpAttemptCount());
        verify(emailService).sendOtp(any(),any());
    }

    @Test
    void googleRegistrationStoresSubjectInUserAndUsesDefaultRole() {
        when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("google-subject","owner@example.com",true,"Owner",null));
        when(roleRepository.findById(6)).thenReturn(Optional.of(role(6,"USER")));
        AuthService.AuthSession session=authService.googleLogin(new GoogleAuthRequest("google-token",null));
        assertEquals("google-subject",session.user().getGoogleSubject());
        assertEquals(6,session.user().getRole().getRoleId());
        assertEquals("ACTIVE",session.user().getStatus());
        assertNull(session.user().getPassword());
        assertNotNull(session.user().getGoogleLinkedAt());
        verify(registrationRequestRepository,never()).save(any());
    }

    @Test
    void googleDoesNotLinkAnExistingEmailWithoutAuthenticatedLinkFlow() {
        when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("google-subject","owner@example.com",true,"Owner",null));
        when(userRepository.existsByEmail("owner@example.com")).thenReturn(true);
        assertThrows(ApiException.class,()->authService.googleLogin(new GoogleAuthRequest("google-token",null)));
        verify(userRepository,never()).save(any(User.class));
    }

    @Test
    void plaintextPasswordIsNotAcceptedByLogin() {
        User user=unverifiedUser(); user.setPassword("legacy-plaintext");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(ApiException.class,()->authService.login(new LoginRequest(user.getEmail(),"legacy-plaintext")));
        verify(refreshTokenRepository,never()).save(any());
    }

    private User unverifiedUser() {
        User user=new User(); user.setUserId(42); user.setEmail("owner@example.com");
        user.setRole(role(6,"USER")); user.setStatus("UNVERIFIED");
        user.setOtpHash(SecureTokenUtil.hmacSha256Hex("test-otp-secret-at-least-32-bytes","42:123456"));
        user.setOtpExpiresAt(Instant.now().plusSeconds(60));
        return user;
    }

    private Role role(int id,String name) {
        Role role=new Role(); role.setRoleId(id); role.setRoleName(name); return role;
    }
}
