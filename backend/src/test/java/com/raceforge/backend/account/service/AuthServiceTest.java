package com.raceforge.backend.account.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.raceforge.backend.account.dto.AuthDtos.RegisterRequest;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RegistrationRequestRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserExternalLoginRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private EmailVerificationOtpRepository otpRepository;
    @Mock
    private RegistrationRequestRepository registrationRequestRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private UserExternalLoginRepository externalLoginRepository;
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
                otpRepository,
                registrationRequestRepository,
                refreshTokenRepository,
                passwordResetTokenRepository,
                externalLoginRepository,
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
                "ROL001"
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
                "ROL005"
        );

        assertThrows(ApiException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }
}
