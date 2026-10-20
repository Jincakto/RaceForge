package com.raceforge.backend.account.service;

import static com.raceforge.backend.account.AccountConstants.STATUS_ACTIVE;
import static com.raceforge.backend.account.AccountConstants.STATUS_INACTIVE;
import static com.raceforge.backend.account.AccountConstants.STATUS_PENDING;
import static com.raceforge.backend.account.AccountConstants.STATUS_REJECTED;
import static com.raceforge.backend.account.AccountConstants.STATUS_UNVERIFIED;

import com.raceforge.backend.account.dto.AuthDtos.AuthResponse;
import com.raceforge.backend.account.dto.AuthDtos.ForgotPasswordRequest;
import com.raceforge.backend.account.dto.AuthDtos.GoogleAuthRequest;
import com.raceforge.backend.account.dto.AuthDtos.GoogleAuthResponse;
import com.raceforge.backend.account.dto.AuthDtos.GooglePasswordSetupRequest;
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
import com.raceforge.backend.common.exception.InvalidOtpException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.common.util.EmailNormalizer;
import com.raceforge.backend.common.util.SecureTokenUtil;
import com.raceforge.backend.config.AuthProperties;

import com.raceforge.backend.security.JwtService;
import com.raceforge.backend.security.JwtService.GooglePasswordSetupIdentity;
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

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationOtpRepository emailVerificationOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final GoogleTokenVerifier googleTokenVerifier;

    private final AuditService auditService;
    private final AccountMapper mapper;
    private final AuthProperties properties;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,

            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            EmailVerificationOtpRepository emailVerificationOtpRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            EmailService emailService,
            GoogleTokenVerifier googleTokenVerifier,

            AuditService auditService,
            AccountMapper mapper,
            AuthProperties properties
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;

        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailVerificationOtpRepository = emailVerificationOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.googleTokenVerifier = googleTokenVerifier;

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
<<<<<<< HEAD
=======
        Role requestedRole = null; // Public registration always creates an owner.
>>>>>>> 76de6e5 (luu code)

        User user = new User();
        user.setRole(defaultRole());
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone());
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

        EmailVerificationOtp verification = emailVerificationOtpRepository
                .findByUserIdForUpdate(user.getUserId())
                .orElseThrow(InvalidOtpException::new);
        Instant now = Instant.now();
        if (!verification.getExpiresAt().isAfter(now)
                || verification.getAttemptCount() >= properties.getOtp().getMaxAttempts()) {
            throw new InvalidOtpException();
        }

        String expectedHash = SecureTokenUtil.hmacSha256Hex(properties.getOtp().getSecret(), user.getUserId() + ":" + request.otp());
        if (!SecureTokenUtil.constantTimeEquals(verification.getOtpHash(), expectedHash)) {
            verification.setAttemptCount(verification.getAttemptCount() + 1);
            throw new InvalidOtpException();
        }

        emailVerificationOtpRepository.delete(verification);
        user.setEmailVerified(true);
        user.setStatus(STATUS_ACTIVE);
<<<<<<< HEAD
        return new MessageResponse("Email verified. You can log in to your horse owner account.");
    }
=======
        user.setRequestedRole(null);

        if (user.getRequestedRole() != null
                && !registrationRequestRepository.existsByUserUserIdAndStatus(user.getUserId(), REQUEST_PENDING)) {
            createRegistrationRequest(user, user.getRequestedRole());
            notifyManagersForRegistration(user);
        }
        return new MessageResponse(user.getRequestedRole() == null
                ? "Email verified. You can log in to your owner account."
                : "Email verified. Registration request is pending manager review.");
    }

    @Transactional(noRollbackFor = InvalidOtpException.class)
    public AuthSession verifyAndSignIn(VerifyEmailRequest request) {
        User user=userRepository.findByEmailForUpdate(EmailNormalizer.normalize(request.email()))
                .orElseThrow(InvalidOtpException::new);
        // Never issue a session by replaying an OTP against an already-verified email.
        if(!STATUS_UNVERIFIED.equals(user.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"EMAIL_ALREADY_VERIFIED","Email is already verified; use login");
        verifyEmail(request);
        ensureLoginAllowed(user);
        return createSession(user);
    }

>>>>>>> 76de6e5 (luu code)
    @Transactional
    public MessageResponse resendOtp(ResendOtpRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        User user = userRepository.findByEmailForUpdate(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (!STATUS_UNVERIFIED.equals(user.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_VERIFIED", "Email is already verified");
        }
        EmailVerificationOtp verification = emailVerificationOtpRepository
                .findByUserIdForUpdate(user.getUserId())
                .orElse(null);
        if (verification != null
                && verification.getSentAt().plusSeconds(properties.getOtp().getResendSeconds()).isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_LIMIT", "Please wait before requesting another OTP");
        }
        createAndSendOtp(user, verification);
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
    public GoogleLoginResult googleLogin(GoogleAuthRequest request) {
        GoogleIdentity identity = googleTokenVerifier.verify(request.idToken());
        if (!identity.emailVerified()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "GOOGLE_EMAIL_NOT_VERIFIED", "Google email is not verified");
        }
        String email = EmailNormalizer.normalize(identity.email());
        User user = userRepository.findByEmailForUpdate(email)
                .orElseGet(() -> createGoogleRegistration(identity, email));
        if (STATUS_UNVERIFIED.equals(user.getStatus())) {
            completeEmailVerification(user);
        }
        ensureLoginAllowed(user);
        if (user.getPassword() == null) {
            return new GoogleLoginResult(null, jwtService.createGooglePasswordSetupToken(user), user);
        }
        return new GoogleLoginResult(createSession(user), null, user);
    }

    @Transactional
    public AuthSession setGooglePassword(GooglePasswordSetupRequest request) {
        GooglePasswordSetupIdentity identity;
        try {
            identity = jwtService.parseGooglePasswordSetupToken(request.passwordSetupToken());
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD_SETUP_TOKEN", "Invalid or expired password setup token");
        }
        User user = userRepository.findByIdForUpdate(identity.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD_SETUP_TOKEN", "Invalid or expired password setup token"));
        if (!EmailNormalizer.normalize(identity.email()).equals(user.getEmail())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD_SETUP_TOKEN", "Invalid or expired password setup token");
        }
        if (user.getPassword() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "PASSWORD_ALREADY_SET", "Password has already been set");
        }
        ensureLoginAllowed(user);
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        auditService.record(user.getUserId(), "GOOGLE_PASSWORD_SET", "User", user.getUserId(), "SUCCESS", null);
        return createSession(user);
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
    public MessageResponse logout(String currentUserId, String refreshToken) {
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
        if (!PasswordResetToken.PASSWORD_RESET.equals(token.getPurpose()) || token.getUsedAt() != null || !token.getExpiresAt().isAfter(now)) {
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

    public GoogleAuthResponse toGoogleAuthResponse(GoogleLoginResult result) {
        AuthSession session = result.session();
        return new GoogleAuthResponse(
                session == null,
                result.passwordSetupToken(),
                session == null ? null : session.accessToken(),
                session == null ? null : "Bearer",
                session == null ? 0 : jwtService.accessTokenDuration().toSeconds(),
                mapper.toUserResponse(result.user())
        );
    }

<<<<<<< HEAD
    private User createGoogleRegistration(GoogleIdentity identity, String email) {

=======
    private User createGoogleRegistration(GoogleAuthRequest request, GoogleIdentity identity, String email) {
        Role requestedRole = null; // Public sign-in never provisions staff roles.
>>>>>>> 76de6e5 (luu code)
        User user = new User();
        user.setRole(defaultRole());
        user.setEmail(email);
        user.setFullName(identity.name() == null || identity.name().isBlank() ? email : identity.name());
        user.setAvatarUrl(identity.picture());
        user.setEmailVerified(true);
        user.setStatus(STATUS_ACTIVE);
        userRepository.save(user);

        auditService.record(user.getUserId(), "GOOGLE_REGISTER", "User", user.getUserId(), "SUCCESS", null);
        return user;
    }

    private void createAndSendOtp(User user) {
        createAndSendOtp(user, null);
    }

    private void createAndSendOtp(User user, EmailVerificationOtp verification) {
        String otp = SecureTokenUtil.randomOtp();
        Instant now = Instant.now();
        EmailVerificationOtp target = verification == null ? new EmailVerificationOtp() : verification;
        target.setUser(user);
        target.setOtpHash(SecureTokenUtil.hmacSha256Hex(properties.getOtp().getSecret(), user.getUserId() + ":" + otp));
        target.setExpiresAt(now.plusSeconds(properties.getOtp().getMinutes() * 60));
        target.setSentAt(now);
        target.setAttemptCount(0);
        emailVerificationOtpRepository.save(target);
        emailService.sendOtp(user.getEmail(), otp);
    }

    private void completeEmailVerification(User user) {
        emailVerificationOtpRepository.findByUserIdForUpdate(user.getUserId())
                .ifPresent(emailVerificationOtpRepository::delete);
        user.setEmailVerified(true);
        user.setStatus(STATUS_ACTIVE);
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

<<<<<<< HEAD
    private Role defaultRole() {
        return roleRepository.findById(com.raceforge.backend.account.AccountConstants.ROLE_HORSE_OWNER)
                .orElseThrow(() -> new ResourceNotFoundException("HORSE_OWNER role not found"));
=======
    private Role selfRegistrationRole(String requestedRoleId) {
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
        return roleRepository.findById(com.raceforge.backend.account.AccountConstants.ROLE_HORSE_OWNER)
                .orElseThrow(() -> new ResourceNotFoundException("Default owner role not found"));
>>>>>>> 76de6e5 (luu code)
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

    public record GoogleLoginResult(AuthSession session, String passwordSetupToken, User user) {
    }
}
