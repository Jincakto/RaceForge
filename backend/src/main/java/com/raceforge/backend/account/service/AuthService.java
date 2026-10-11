package com.raceforge.backend.account.service;

import static com.raceforge.backend.account.AccountConstants.REQUEST_PENDING;
import static com.raceforge.backend.account.AccountConstants.ROLE_MANAGER;
import static com.raceforge.backend.account.AccountConstants.ROLE_USER;
import static com.raceforge.backend.account.AccountConstants.SELF_REGISTRATION_ROLES;
import static com.raceforge.backend.account.AccountConstants.STATUS_ACTIVE;
import static com.raceforge.backend.account.AccountConstants.STATUS_INACTIVE;
import static com.raceforge.backend.account.AccountConstants.STATUS_PENDING;
import static com.raceforge.backend.account.AccountConstants.STATUS_REJECTED;
import static com.raceforge.backend.account.AccountConstants.STATUS_UNVERIFIED;

import com.raceforge.backend.account.dto.AuthDtos.AuthResponse;
import com.raceforge.backend.account.dto.AuthDtos.ForgotPasswordRequest;
import com.raceforge.backend.account.dto.AuthDtos.GoogleAuthRequest;
import com.raceforge.backend.account.dto.AuthDtos.LoginRequest;
import com.raceforge.backend.account.dto.AuthDtos.MessageResponse;
import com.raceforge.backend.account.dto.AuthDtos.RefreshRequest;
import com.raceforge.backend.account.dto.AuthDtos.RegisterRequest;
import com.raceforge.backend.account.dto.AuthDtos.ResetPasswordRequest;
import com.raceforge.backend.account.dto.AuthDtos.ResendOtpRequest;
import com.raceforge.backend.account.dto.AuthDtos.UserResponse;
import com.raceforge.backend.account.dto.AuthDtos.VerifyEmailRequest;
import com.raceforge.backend.account.entity.PasswordResetToken;
import com.raceforge.backend.account.entity.RefreshToken;
import com.raceforge.backend.account.entity.RegistrationRequest;
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
import com.raceforge.backend.common.exception.InvalidOtpException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.common.util.EmailNormalizer;
import com.raceforge.backend.common.util.SecureTokenUtil;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.JwtService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final AccountMapper mapper;
    private final AuthProperties properties;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            RegistrationRequestRepository registrationRequestRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            EmailService emailService,
            GoogleTokenVerifier googleTokenVerifier,
            NotificationService notificationService,
            AuditService auditService,
            AccountMapper mapper,
            AuthProperties properties
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.registrationRequestRepository = registrationRequestRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.mapper = mapper;
        this.properties = properties;
    }

    @Transactional
    public MessageResponse register(RegisterRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email already exists");
        }
        Role requestedRole = selfRegistrationRole(request.requestedRoleId());

        User user = new User();
        user.setRole(defaultRole());
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone());
        user.setRequestedRole(requestedRole);
        user.setStatus(STATUS_UNVERIFIED);
        user.setEmailVerified(false);
        userRepository.save(user);

        createAndSendOtp(user);
        return new MessageResponse("Registration created. Please verify email with OTP.");
    }

    @Transactional(noRollbackFor = InvalidOtpException.class)
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        User user = userRepository.findByEmailForUpdate(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Invalid or expired OTP"));
        if (!STATUS_UNVERIFIED.equals(user.getStatus())) {
            return new MessageResponse("Email is already verified.");
        }

        Instant now = Instant.now();
        if (user.getOtpHash() == null || user.getOtpExpiresAt() == null
                || !user.getOtpExpiresAt().isAfter(now)
                || user.getOtpAttemptCount() >= properties.getOtp().getMaxAttempts()) {
            throw new InvalidOtpException();
        }

        String expectedHash = SecureTokenUtil.hmacSha256Hex(properties.getOtp().getSecret(), user.getUserId() + ":" + request.otp());
        if (!SecureTokenUtil.constantTimeEquals(user.getOtpHash(), expectedHash)) {
            user.setOtpAttemptCount(user.getOtpAttemptCount() + 1);
            throw new InvalidOtpException();
        }

        user.setOtpHash(null);
        user.setOtpExpiresAt(null);
        user.setEmailVerified(true);
        user.setStatus(user.getRequestedRole() == null ? STATUS_ACTIVE : STATUS_PENDING);

        if (user.getRequestedRole() != null
                && !registrationRequestRepository.existsByUserUserIdAndStatus(user.getUserId(), REQUEST_PENDING)) {
            createRegistrationRequest(user, user.getRequestedRole());
            notifyManagersForRegistration(user);
        }
        return new MessageResponse(user.getRequestedRole() == null
                ? "Email verified. You can log in to your USER account."
                : "Email verified. Registration request is pending manager review.");
    }

    @Transactional
    public MessageResponse resendOtp(ResendOtpRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        User user = userRepository.findByEmailForUpdate(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (!STATUS_UNVERIFIED.equals(user.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_VERIFIED", "Email is already verified");
        }
        if (user.getOtpSentAt() != null
                && user.getOtpSentAt().plusSeconds(properties.getOtp().getResendSeconds()).isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_LIMIT", "Please wait before requesting another OTP");
        }
        createAndSendOtp(user);
        return new MessageResponse("A new OTP has been sent.");
    }

    @Transactional
    public AuthSession login(LoginRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials"));
        if (user.getPassword() == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
        }
        ensureLoginAllowed(user);
        return createSession(user);
    }

    @Transactional
    public AuthSession googleLogin(GoogleAuthRequest request) {
        GoogleIdentity identity = googleTokenVerifier.verify(request.idToken());
        if (!identity.emailVerified()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "GOOGLE_EMAIL_NOT_VERIFIED", "Google email is not verified");
        }
        String email = EmailNormalizer.normalize(identity.email());
        return userRepository.findByGoogleSubject(identity.subject())
                .map(user -> {
                    ensureLoginAllowed(user);
                    return createSession(user);
                })
                .orElseGet(() -> createGoogleRegistration(request, identity, email));
    }

    @Transactional
    public AuthSession refresh(RefreshRequest request, String cookieToken) {
        String rawToken = request.refreshToken() != null && !request.refreshToken().isBlank()
                ? request.refreshToken()
                : cookieToken;
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_REQUIRED", "Refresh token is required");
        }
        String hash = SecureTokenUtil.sha256Hex(rawToken);
        RefreshToken token = refreshTokenRepository.findByTokenHashForUpdate(hash)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid refresh token"));
        Instant now = Instant.now();
        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
        }
        User user = token.getUser();
        ensureLoginAllowed(user);
        token.setRevokedAt(now);
        return createSession(user);
    }

    @Transactional
    public MessageResponse logout(Integer currentUserId, String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.findByTokenHash(SecureTokenUtil.sha256Hex(refreshToken)).ifPresent(token -> {
                if (token.getUser().getUserId().equals(currentUserId) && token.getRevokedAt() == null) {
                    token.setRevokedAt(Instant.now());
                }
            });
        }
        return new MessageResponse("Logged out.");
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getPassword() == null) {
                return;
            }
            String token = SecureTokenUtil.randomToken(32);
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setTokenHash(SecureTokenUtil.sha256Hex(token));
            resetToken.setExpiresAt(Instant.now().plusSeconds(properties.getPasswordReset().getMinutes() * 60));
            resetToken.setCreatedAt(Instant.now());
            passwordResetTokenRepository.save(resetToken);
            String link = properties.getPasswordReset().getFrontendUrl()
                    + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
            emailService.sendPasswordReset(user.getEmail(), link);
        });
        return new MessageResponse("If the email exists, password reset instructions have been sent.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String hash = SecureTokenUtil.sha256Hex(request.token());
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHashForUpdate(hash)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN", "Invalid reset token"));
        Instant now = Instant.now();
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN", "Invalid reset token");
        }
        User user = token.getUser();
        if (user.getPassword() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "GOOGLE_ONLY_ACCOUNT", "This account uses Google login");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        token.setUsedAt(now);
        passwordResetTokenRepository.markAllUnusedForUserUsed(user.getUserId(), now);
        refreshTokenRepository.revokeAllForUser(user.getUserId(), now);
        auditService.record(user.getUserId(), "PASSWORD_RESET", "User", user.getUserId(), "SUCCESS", null);
        return new MessageResponse("Password has been reset.");
    }

    public AuthResponse toAuthResponse(AuthSession session) {
        UserResponse user = mapper.toUserResponse(session.user());
        return new AuthResponse(session.accessToken(), "Bearer", jwtService.accessTokenDuration().toSeconds(), user);
    }

    private AuthSession createGoogleRegistration(GoogleAuthRequest request, GoogleIdentity identity, String email) {
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "GOOGLE_EMAIL_NOT_LINKED", "Please log in and link Google from your profile");
        }
        Role requestedRole = selfRegistrationRole(request.requestedRoleId());
        User user = new User();
        user.setRole(defaultRole());
        user.setEmail(email);
        user.setFullName(identity.name() == null || identity.name().isBlank() ? email : identity.name());
        user.setAvatarUrl(identity.picture());
        user.setEmailVerified(true);
        user.setStatus(requestedRole == null ? STATUS_ACTIVE : STATUS_PENDING);
        user.setRequestedRole(requestedRole);
        user.setGoogleSubject(identity.subject());
        user.setGoogleLinkedAt(Instant.now());
        userRepository.save(user);

        if (requestedRole != null) {
            createRegistrationRequest(user, requestedRole);
            notifyManagersForRegistration(user);
        }
        auditService.record(user.getUserId(), "GOOGLE_REGISTER", "User", user.getUserId(), "SUCCESS", null);
        return createSession(user);
    }

    private void createAndSendOtp(User user) {
        String otp = SecureTokenUtil.randomOtp();
        Instant now = Instant.now();
        user.setOtpHash(SecureTokenUtil.hmacSha256Hex(properties.getOtp().getSecret(), user.getUserId() + ":" + otp));
        user.setOtpExpiresAt(now.plusSeconds(properties.getOtp().getMinutes() * 60));
        user.setOtpSentAt(now);
        user.setOtpAttemptCount(0);
        emailService.sendOtp(user.getEmail(), otp);
    }

    private RegistrationRequest createRegistrationRequest(User user, Role requestedRole) {
        RegistrationRequest request = new RegistrationRequest();
        request.setUser(user);
        request.setRequestedRole(requestedRole);
        request.setStatus(REQUEST_PENDING);
        request.setCreatedAt(Instant.now());
        return registrationRequestRepository.save(request);
    }

    private void notifyManagersForRegistration(User user) {
        userRepository.findActiveManagers().forEach(manager ->
                notificationService.notify(
                        manager.getUserId(),
                        "REGISTRATION_REQUEST",
                        "New registration request",
                        user.getFullName() + " is waiting for approval."
                )
        );
    }

    private AuthSession createSession(User user) {
        String refreshToken = SecureTokenUtil.randomToken(32);
        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(SecureTokenUtil.sha256Hex(refreshToken));
        entity.setExpiresAt(Instant.now().plusSeconds(properties.getRefreshToken().getDays() * 24 * 60 * 60));
        entity.setCreatedAt(Instant.now());
        refreshTokenRepository.save(entity);
        return new AuthSession(jwtService.createAccessToken(user), refreshToken, user);
    }

    private Role selfRegistrationRole(Integer requestedRoleId) {
        if (requestedRoleId == null || ROLE_USER.equals(requestedRoleId)) {
            return null;
        }
        if (ROLE_MANAGER.equals(requestedRoleId) || !SELF_REGISTRATION_ROLES.contains(requestedRoleId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUESTED_ROLE", "Requested role is not allowed for public registration");
        }
        return roleRepository.findById(requestedRoleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
    }

    private Role defaultRole() {
        return roleRepository.findById(ROLE_USER)
                .orElseThrow(() -> new ResourceNotFoundException("Default USER role not found"));
    }

    private void ensureLoginAllowed(User user) {
        if (STATUS_UNVERIFIED.equals(user.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", "Please verify email before logging in");
        }
        if (STATUS_INACTIVE.equals(user.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
        }
        if (!STATUS_ACTIVE.equals(user.getStatus())
                && !STATUS_PENDING.equals(user.getStatus())
                && !STATUS_REJECTED.equals(user.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "LOGIN_NOT_ALLOWED", "Login is not allowed for this account");
        }
    }

    public record AuthSession(String accessToken, String refreshToken, User user) {
    }
}
