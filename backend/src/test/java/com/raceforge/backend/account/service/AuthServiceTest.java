<<<<<<< HEAD
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
import com.raceforge.backend.account.dto.AuthDtos.GooglePasswordSetupRequest;
import com.raceforge.backend.account.dto.AuthDtos.LoginRequest;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.entity.EmailVerificationOtp;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.util.SecureTokenUtil;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.JwtService;
import com.raceforge.backend.security.JwtService.GooglePasswordSetupIdentity;
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
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private EmailVerificationOtpRepository emailVerificationOtpRepository;
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
        properties.getGoogle().setPasswordSetupMinutes(15);
        authService = new AuthService(
                userRepository,
                roleRepository,

                refreshTokenRepository,
                passwordResetTokenRepository,
                emailVerificationOtpRepository,
                new BCryptPasswordEncoder(),
                jwtService,
                emailService,
                googleTokenVerifier,

                auditService,
                new AccountMapper(),
                properties
        );
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmail("owner@example.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "Owner",
                "owner@example.com",
                "StrongPass123",
                null
        );

        assertThrows(ApiException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registrationUsesOwnerRoleBcryptAndStringPhoneWithOnlyOtpHashStored() {
        when(roleRepository.findById(5)).thenReturn(Optional.of(role(5, "HORSE_OWNER")));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user=invocation.getArgument(0); user.setUserId("OWN-042"); return user;
        });
        authService.register(new RegisterRequest("Owner", "owner@example.com", "StrongPass123", "0900012345"));
        ArgumentCaptor<User> saved=ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<String> otp=ArgumentCaptor.forClass(String.class);
        verify(userRepository).save(saved.capture());
        verify(emailService).sendOtp(org.mockito.ArgumentMatchers.eq("owner@example.com"),otp.capture());
        User user=saved.getValue();
        assertEquals(5,user.getRole().getRoleId());
        assertEquals("0900012345",user.getPhone());
        assertTrue(new BCryptPasswordEncoder().matches("StrongPass123",user.getPassword()));
        assertNotEquals("StrongPass123",user.getPassword());
        ArgumentCaptor<EmailVerificationOtp> verification=ArgumentCaptor.forClass(EmailVerificationOtp.class);
        verify(emailVerificationOtpRepository).save(verification.capture());
        // Keep a new shared-key entity identifiable as new until @MapsId runs on persist.
        assertNull(verification.getValue().getUserId());
        assertEquals(user, verification.getValue().getUser());
        assertNotEquals(otp.getValue(),verification.getValue().getOtpHash());
        assertEquals(SecureTokenUtil.hmacSha256Hex("test-otp-secret-at-least-32-bytes","OWN-042:"+otp.getValue()),verification.getValue().getOtpHash());
        assertEquals("UNVERIFIED",user.getStatus());
    }

    @Test
    void validOtpActivatesOwnerAndCannotBeUsedTwice() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        EmailVerificationOtp verification=verification(user);
        when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
        authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
        assertEquals("ACTIVE",user.getStatus());
        assertEquals(5,user.getRole().getRoleId());
        assertTrue(user.isEmailVerified());
        verify(emailVerificationOtpRepository).delete(verification);
        authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
    }

    @Test
    void invalidOtpCountsAttempts() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        EmailVerificationOtp verification=verification(user);
        when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
        assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"000000")));
        assertEquals(1,verification.getAttemptCount());
        assertEquals("UNVERIFIED",user.getStatus());
    }

    @Test
    void expiredOtpAndAttemptLimitRejectEvenTheCorrectCode() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        EmailVerificationOtp verification=verification(user);
        when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
        verification.setExpiresAt(Instant.now().minusSeconds(1));
        assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456")));
        verification.setExpiresAt(Instant.now().plusSeconds(60));
        verification.setAttemptCount(5);
        assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456")));
        assertEquals("UNVERIFIED",user.getStatus());
    }

    @Test
    void resendEnforcesCooldownAndReplacesPreviousOtpHash() {
        User user=unverifiedUser();
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        EmailVerificationOtp verification=verification(user);
        when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
        verification.setSentAt(Instant.now());
        assertThrows(ApiException.class,()->authService.resendOtp(new ResendOtpRequest(user.getEmail())));
        verify(emailService,never()).sendOtp(any(),any());
        verification.setSentAt(Instant.now().minusSeconds(61));
        verification.setOtpHash("invalidated-old-hash"); verification.setAttemptCount(4);
        authService.resendOtp(new ResendOtpRequest(user.getEmail()));
        assertNotEquals("invalidated-old-hash",verification.getOtpHash());
        assertEquals(0,verification.getAttemptCount());
        verify(emailService).sendOtp(any(),any());
    }

    @Test
    void googleRegistrationUsesEmailAndRequiresPasswordSetup() {
        when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("google-subject","owner@example.com",true,"Owner",null));
        when(userRepository.findByEmailForUpdate("owner@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findById(5)).thenReturn(Optional.of(role(5,"HORSE_OWNER")));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user=invocation.getArgument(0); user.setUserId("OWN-042"); return user;
        });
        when(jwtService.createGooglePasswordSetupToken(any(User.class))).thenReturn("setup-token");
        AuthService.GoogleLoginResult result=authService.googleLogin(new GoogleAuthRequest("google-token"));
        assertNull(result.session());
        assertEquals("setup-token",result.passwordSetupToken());
        assertEquals(5,result.user().getRole().getRoleId());
        assertEquals("ACTIVE",result.user().getStatus());
        assertNull(result.user().getPassword());
        verify(refreshTokenRepository,never()).save(any());
    }

    @Test
    void googleLogsIntoExistingPasswordAccountByVerifiedEmail() {
        when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("google-subject","owner@example.com",true,"Owner",null));
        User user=unverifiedUser();
        user.setStatus("ACTIVE"); user.setEmailVerified(true); user.setPassword("encoded-password");
        when(userRepository.findByEmailForUpdate("owner@example.com")).thenReturn(Optional.of(user));
        when(jwtService.createAccessToken(user)).thenReturn("access-token");
        AuthService.GoogleLoginResult result=authService.googleLogin(new GoogleAuthRequest("google-token"));
        assertNotNull(result.session());
        assertNull(result.passwordSetupToken());
        verify(refreshTokenRepository).save(any());
    }

    @Test
    void googlePasswordSetupCanOnlyRunOnce() {
        User user=unverifiedUser(); user.setStatus("ACTIVE"); user.setEmailVerified(true); user.setPassword(null);
        when(jwtService.parseGooglePasswordSetupToken("setup-token"))
                .thenReturn(new GooglePasswordSetupIdentity(user.getUserId(),user.getEmail()));
        when(userRepository.findByIdForUpdate(user.getUserId())).thenReturn(Optional.of(user));
        when(jwtService.createAccessToken(user)).thenReturn("access-token");
        AuthService.AuthSession session=authService.setGooglePassword(
                new GooglePasswordSetupRequest("setup-token","NewPassword123"));
        assertNotNull(session);
        assertTrue(new BCryptPasswordEncoder().matches("NewPassword123",user.getPassword()));
        verify(refreshTokenRepository).save(any());
        assertThrows(ApiException.class,()->authService.setGooglePassword(
                new GooglePasswordSetupRequest("setup-token","AnotherPassword123")));
    }

    @Test
    void plaintextPasswordIsNotAcceptedByLogin() {
        User user=unverifiedUser(); user.setPassword("legacy-plaintext");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(ApiException.class,()->authService.login(new LoginRequest(user.getEmail(),"legacy-plaintext")));
        verify(refreshTokenRepository,never()).save(any());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"UNVERIFIED", "INVITED", "INACTIVE"})
    void validPasswordCannotBypassAccountActivationOrLock(String status) {
        User user = unverifiedUser();
        user.setStatus(status);
        user.setPassword(new BCryptPasswordEncoder().encode("StrongPassword123"));
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(ApiException.class, () -> authService.login(new LoginRequest(user.getEmail(), "StrongPassword123")));
        verify(refreshTokenRepository, never()).save(any());
        verify(jwtService, never()).createAccessToken(any());
    }

    @Test
    void googleCannotActivateInvitedStaffOrIssuePasswordSetupToken() {
        User user = unverifiedUser();
        user.setRole(role(3, "VETERINARIAN"));
        user.setStatus("INVITED");
        when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("subject", user.getEmail(), true, "Vet", null));
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(ApiException.class, () -> authService.googleLogin(new GoogleAuthRequest("google-token")));
        assertEquals("INVITED", user.getStatus());
        verify(jwtService, never()).createGooglePasswordSetupToken(any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void googlePreservesExistingStaffRole() {
        User user = unverifiedUser();
        user.setRole(role(3, "VETERINARIAN"));
        user.setStatus("ACTIVE"); user.setEmailVerified(true); user.setPassword("encoded");
        when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("subject", user.getEmail(), true, "Vet", null));
        when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        authService.googleLogin(new GoogleAuthRequest("google-token"));
        assertEquals(3, user.getRole().getRoleId());
    }

    @Test
    void invitationCannotBeConsumedByPasswordResetEndpoint() {
        var token = new com.raceforge.backend.account.entity.PasswordResetToken();
        token.setPurpose(com.raceforge.backend.account.entity.PasswordResetToken.STAFF_INVITATION);
        token.setExpiresAt(Instant.now().plusSeconds(60));
        when(passwordResetTokenRepository.findByTokenHashForUpdate(any())).thenReturn(Optional.of(token));
        assertThrows(ApiException.class, () -> authService.resetPassword(
                new com.raceforge.backend.account.dto.AuthDtos.ResetPasswordRequest("raw", "StrongPassword123")));
        assertNull(token.getUsedAt());
    }

    private User unverifiedUser() {
        User user=new User(); user.setUserId("OWN-042"); user.setEmail("owner@example.com");
        user.setRole(role(5,"HORSE_OWNER")); user.setStatus("UNVERIFIED");
        return user;
    }

    private EmailVerificationOtp verification(User user) {
        EmailVerificationOtp verification=new EmailVerificationOtp();
        verification.setUser(user);
        verification.setOtpHash(SecureTokenUtil.hmacSha256Hex("test-otp-secret-at-least-32-bytes","OWN-042:123456"));
        verification.setExpiresAt(Instant.now().plusSeconds(60));
        verification.setSentAt(Instant.now().minusSeconds(61));
        return verification;
    }

    private Role role(int id,String name) {
        Role role=new Role(); role.setRoleId(id); role.setRoleName(name); return role;
    }
}
=======
// Pre-String ID test retained for reference, superseded by StringTrainingWorkflowIT and StringIdContractTest.
// package com.raceforge.backend.account.service;
// 
// import static org.junit.jupiter.api.Assertions.assertThrows;
// import static org.junit.jupiter.api.Assertions.assertEquals;
// import static org.junit.jupiter.api.Assertions.assertNotEquals;
// import static org.junit.jupiter.api.Assertions.assertNotNull;
// import static org.junit.jupiter.api.Assertions.assertNull;
// import static org.junit.jupiter.api.Assertions.assertTrue;
// import static org.mockito.ArgumentMatchers.any;
// import static org.mockito.Mockito.never;
// import static org.mockito.Mockito.verify;
// import static org.mockito.Mockito.when;
// import static org.mockito.Mockito.times;
// 
// import com.raceforge.backend.account.dto.AuthDtos.RegisterRequest;
// import com.raceforge.backend.account.dto.AuthDtos.VerifyEmailRequest;
// import com.raceforge.backend.account.dto.AuthDtos.ResendOtpRequest;
// import com.raceforge.backend.account.dto.AuthDtos.GoogleAuthRequest;
// import com.raceforge.backend.account.dto.AuthDtos.GooglePasswordSetupRequest;
// import com.raceforge.backend.account.dto.AuthDtos.LoginRequest;
// import com.raceforge.backend.account.entity.Role;
// import com.raceforge.backend.account.entity.User;
// import com.raceforge.backend.account.entity.EmailVerificationOtp;
// import com.raceforge.backend.account.mapper.AccountMapper;
// import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
// import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
// import com.raceforge.backend.account.repository.RefreshTokenRepository;
// import com.raceforge.backend.account.repository.RegistrationRequestRepository;
// import com.raceforge.backend.account.repository.RoleRepository;
// import com.raceforge.backend.account.repository.UserRepository;
// import com.raceforge.backend.audit.service.AuditService;
// import com.raceforge.backend.common.exception.ApiException;
// import com.raceforge.backend.common.util.SecureTokenUtil;
// import com.raceforge.backend.config.AuthProperties;
// import com.raceforge.backend.notification.service.NotificationService;
// import com.raceforge.backend.security.JwtService;
// import com.raceforge.backend.security.JwtService.GooglePasswordSetupIdentity;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith;
// import org.mockito.Mock;
// import org.mockito.junit.jupiter.MockitoExtension;
// import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
// import java.time.Instant;
// import java.util.Optional;
// import org.mockito.ArgumentCaptor;
// 
// @ExtendWith(MockitoExtension.class)
// class AuthServiceTest {
// 
//     @Mock
//     private UserRepository userRepository;
//     @Mock
//     private RoleRepository roleRepository;
//     @Mock
//     private RegistrationRequestRepository registrationRequestRepository;
//     @Mock
//     private RefreshTokenRepository refreshTokenRepository;
//     @Mock
//     private PasswordResetTokenRepository passwordResetTokenRepository;
//     @Mock
//     private EmailVerificationOtpRepository emailVerificationOtpRepository;
//     @Mock
//     private JwtService jwtService;
//     @Mock
//     private EmailService emailService;
//     @Mock
//     private GoogleTokenVerifier googleTokenVerifier;
//     @Mock
//     private NotificationService notificationService;
//     @Mock
//     private AuditService auditService;
// 
//     private AuthService authService;
// 
//     @BeforeEach
//     void setUp() {
//         AuthProperties properties = new AuthProperties();
//         properties.getOtp().setSecret("test-otp-secret-at-least-32-bytes");
//         properties.getOtp().setMinutes(5);
//         properties.getOtp().setResendSeconds(60);
//         properties.getOtp().setMaxAttempts(5);
//         properties.getRefreshToken().setDays(7);
//         properties.getPasswordReset().setMinutes(15);
//         properties.getPasswordReset().setFrontendUrl("http://localhost/reset-password");
//         properties.getGoogle().setPasswordSetupMinutes(15);
//         authService = new AuthService(
//                 userRepository,
//                 roleRepository,
//                 registrationRequestRepository,
//                 refreshTokenRepository,
//                 passwordResetTokenRepository,
//                 emailVerificationOtpRepository,
//                 new BCryptPasswordEncoder(),
//                 jwtService,
//                 emailService,
//                 googleTokenVerifier,
//                 notificationService,
//                 auditService,
//                 new AccountMapper(),
//                 properties
//         );
//     }
// 
//     @Test
//     void registerRejectsManagerRole() {
//         when(userRepository.existsByEmail("manager@example.com")).thenReturn(false);
// 
//         RegisterRequest request = new RegisterRequest(
//                 "Manager",
//                 "manager@example.com",
//                 "StrongPass123",
//                 null,
//                 1
//         );
// 
//         assertThrows(ApiException.class, () -> authService.register(request));
//         verify(userRepository, never()).save(any(User.class));
//     }
// 
//     @Test
//     void registerRejectsDuplicateEmail() {
//         when(userRepository.existsByEmail("owner@example.com")).thenReturn(true);
// 
//         RegisterRequest request = new RegisterRequest(
//                 "Owner",
//                 "owner@example.com",
//                 "StrongPass123",
//                 null,
//                 5
//         );
// 
//         assertThrows(ApiException.class, () -> authService.register(request));
//         verify(userRepository, never()).save(any(User.class));
//     }
// 
//     @Test
//     void registrationUsesUserRoleBcryptAndStringPhoneWithOnlyOtpHashStored() {
//         when(roleRepository.findById(6)).thenReturn(Optional.of(role(6, "USER")));
//         when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
//             User user=invocation.getArgument(0); user.setUserId(42); return user;
//         });
//         authService.register(new RegisterRequest("Owner", "owner@example.com", "StrongPass123", "0900012345", null));
//         ArgumentCaptor<User> saved=ArgumentCaptor.forClass(User.class);
//         ArgumentCaptor<String> otp=ArgumentCaptor.forClass(String.class);
//         verify(userRepository).save(saved.capture());
//         verify(emailService).sendOtp(org.mockito.ArgumentMatchers.eq("owner@example.com"),otp.capture());
//         User user=saved.getValue();
//         assertEquals(6,user.getRole().getRoleId());
//         assertEquals("0900012345",user.getPhone());
//         assertTrue(new BCryptPasswordEncoder().matches("StrongPass123",user.getPassword()));
//         assertNotEquals("StrongPass123",user.getPassword());
//         ArgumentCaptor<EmailVerificationOtp> verification=ArgumentCaptor.forClass(EmailVerificationOtp.class);
//         verify(emailVerificationOtpRepository).save(verification.capture());
//         // Keep a new shared-key entity identifiable as new until @MapsId runs on persist.
//         assertNull(verification.getValue().getUserId());
//         assertEquals(user, verification.getValue().getUser());
//         assertNotEquals(otp.getValue(),verification.getValue().getOtpHash());
//         assertEquals(SecureTokenUtil.hmacSha256Hex("test-otp-secret-at-least-32-bytes","42:"+otp.getValue()),verification.getValue().getOtpHash());
//         assertEquals("UNVERIFIED",user.getStatus());
//     }
// 
//     @Test
//     void validOtpActivatesBasicUserAndCannotBeUsedTwice() {
//         User user=unverifiedUser();
//         when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
//         EmailVerificationOtp verification=verification(user);
//         when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
//         authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
//         assertEquals("ACTIVE",user.getStatus());
//         assertEquals(6,user.getRole().getRoleId());
//         assertTrue(user.isEmailVerified());
//         verify(emailVerificationOtpRepository).delete(verification);
//         authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
//         verify(registrationRequestRepository,never()).save(any());
//     }
// 
//     @Test
//     void invalidOtpCountsAttempts() {
//         User user=unverifiedUser();
//         when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
//         EmailVerificationOtp verification=verification(user);
//         when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
//         assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"000000")));
//         assertEquals(1,verification.getAttemptCount());
//         assertEquals("UNVERIFIED",user.getStatus());
//     }
// 
//     @Test
//     void expiredOtpAndAttemptLimitRejectEvenTheCorrectCode() {
//         User user=unverifiedUser();
//         when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
//         EmailVerificationOtp verification=verification(user);
//         when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
//         verification.setExpiresAt(Instant.now().minusSeconds(1));
//         assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456")));
//         verification.setExpiresAt(Instant.now().plusSeconds(60));
//         verification.setAttemptCount(5);
//         assertThrows(ApiException.class,()->authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456")));
//         assertEquals("UNVERIFIED",user.getStatus());
//     }
// 
//     @Test
//     void businessRoleRequestKeepsBasicRoleUntilApprovalAndIsCreatedOnce() {
//         User user=unverifiedUser(); user.setRequestedRole(role(5,"HORSE_OWNER"));
//         when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
//         when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification(user)));
//         authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
//         authService.verifyEmail(new VerifyEmailRequest(user.getEmail(),"123456"));
//         assertEquals("PENDING",user.getStatus());
//         assertEquals(6,user.getRole().getRoleId());
//         verify(registrationRequestRepository,times(1)).save(any());
//     }
// 
//     @Test
//     void resendEnforcesCooldownAndReplacesPreviousOtpHash() {
//         User user=unverifiedUser();
//         when(userRepository.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
//         EmailVerificationOtp verification=verification(user);
//         when(emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())).thenReturn(Optional.of(verification));
//         verification.setSentAt(Instant.now());
//         assertThrows(ApiException.class,()->authService.resendOtp(new ResendOtpRequest(user.getEmail())));
//         verify(emailService,never()).sendOtp(any(),any());
//         verification.setSentAt(Instant.now().minusSeconds(61));
//         verification.setOtpHash("invalidated-old-hash"); verification.setAttemptCount(4);
//         authService.resendOtp(new ResendOtpRequest(user.getEmail()));
//         assertNotEquals("invalidated-old-hash",verification.getOtpHash());
//         assertEquals(0,verification.getAttemptCount());
//         verify(emailService).sendOtp(any(),any());
//     }
// 
//     @Test
//     void googleRegistrationUsesEmailAndRequiresPasswordSetup() {
//         when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("google-subject","owner@example.com",true,"Owner",null));
//         when(userRepository.findByEmailForUpdate("owner@example.com")).thenReturn(Optional.empty());
//         when(roleRepository.findById(6)).thenReturn(Optional.of(role(6,"USER")));
//         when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
//             User user=invocation.getArgument(0); user.setUserId(42); return user;
//         });
//         when(jwtService.createGooglePasswordSetupToken(any(User.class))).thenReturn("setup-token");
//         AuthService.GoogleLoginResult result=authService.googleLogin(new GoogleAuthRequest("google-token",null));
//         assertNull(result.session());
//         assertEquals("setup-token",result.passwordSetupToken());
//         assertEquals(6,result.user().getRole().getRoleId());
//         assertEquals("ACTIVE",result.user().getStatus());
//         assertNull(result.user().getPassword());
//         verify(refreshTokenRepository,never()).save(any());
//         verify(registrationRequestRepository,never()).save(any());
//     }
// 
//     @Test
//     void googleLogsIntoExistingPasswordAccountByVerifiedEmail() {
//         when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity("google-subject","owner@example.com",true,"Owner",null));
//         User user=unverifiedUser();
//         user.setStatus("ACTIVE"); user.setEmailVerified(true); user.setPassword("encoded-password");
//         when(userRepository.findByEmailForUpdate("owner@example.com")).thenReturn(Optional.of(user));
//         when(jwtService.createAccessToken(user)).thenReturn("access-token");
//         AuthService.GoogleLoginResult result=authService.googleLogin(new GoogleAuthRequest("google-token",null));
//         assertNotNull(result.session());
//         assertNull(result.passwordSetupToken());
//         verify(refreshTokenRepository).save(any());
//     }
// 
//     @Test
//     void googlePasswordSetupCanOnlyRunOnce() {
//         User user=unverifiedUser(); user.setStatus("ACTIVE"); user.setEmailVerified(true); user.setPassword(null);
//         when(jwtService.parseGooglePasswordSetupToken("setup-token"))
//                 .thenReturn(new GooglePasswordSetupIdentity(user.getUserId(),user.getEmail()));
//         when(userRepository.findByIdForUpdate(user.getUserId())).thenReturn(Optional.of(user));
//         when(jwtService.createAccessToken(user)).thenReturn("access-token");
//         AuthService.AuthSession session=authService.setGooglePassword(
//                 new GooglePasswordSetupRequest("setup-token","NewPassword123"));
//         assertNotNull(session);
//         assertTrue(new BCryptPasswordEncoder().matches("NewPassword123",user.getPassword()));
//         verify(refreshTokenRepository).save(any());
//         assertThrows(ApiException.class,()->authService.setGooglePassword(
//                 new GooglePasswordSetupRequest("setup-token","AnotherPassword123")));
//     }
// 
//     @Test
//     void plaintextPasswordIsNotAcceptedByLogin() {
//         User user=unverifiedUser(); user.setPassword("legacy-plaintext");
//         when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
//         assertThrows(ApiException.class,()->authService.login(new LoginRequest(user.getEmail(),"legacy-plaintext")));
//         verify(refreshTokenRepository,never()).save(any());
//     }
// 
//     private User unverifiedUser() {
//         User user=new User(); user.setUserId(42); user.setEmail("owner@example.com");
//         user.setRole(role(6,"USER")); user.setStatus("UNVERIFIED");
//         return user;
//     }
// 
//     private EmailVerificationOtp verification(User user) {
//         EmailVerificationOtp verification=new EmailVerificationOtp();
//         verification.setUser(user);
//         verification.setOtpHash(SecureTokenUtil.hmacSha256Hex("test-otp-secret-at-least-32-bytes","42:123456"));
//         verification.setExpiresAt(Instant.now().plusSeconds(60));
//         verification.setSentAt(Instant.now().minusSeconds(61));
//         return verification;
//     }
// 
//     private Role role(int id,String name) {
//         Role role=new Role(); role.setRoleId(id); role.setRoleName(name); return role;
//     }
// }
// 
>>>>>>> 76de6e5 (luu code)
