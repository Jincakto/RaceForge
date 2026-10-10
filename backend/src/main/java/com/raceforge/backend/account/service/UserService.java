package com.raceforge.backend.account.service;

import static com.raceforge.backend.account.AccountConstants.ROLE_MANAGER;
import static com.raceforge.backend.account.AccountConstants.STATUS_ACTIVE;
import static com.raceforge.backend.account.AccountConstants.STATUS_INACTIVE;

import com.raceforge.backend.account.dto.AuthDtos.PageResponse;
import com.raceforge.backend.account.dto.AuthDtos.RegistrationRequestResponse;
import com.raceforge.backend.account.dto.AuthDtos.UserResponse;
import com.raceforge.backend.account.dto.UserDtos.ChangePasswordRequest;
import com.raceforge.backend.account.dto.UserDtos.UpdateMeRequest;
import com.raceforge.backend.account.dto.UserDtos.UpdateStatusRequest;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.entity.UserExternalLogin;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RegistrationRequestRepository;
import com.raceforge.backend.account.repository.UserExternalLoginRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.common.util.EmailNormalizer;
import com.raceforge.backend.common.util.IdGenerator;
import com.raceforge.backend.notification.service.NotificationService;
import java.time.Instant;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserExternalLoginRepository externalLoginRepository;
    private final PasswordEncoder passwordEncoder;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final AccountMapper mapper;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public UserService(
            UserRepository userRepository,
            RegistrationRequestRepository registrationRequestRepository,
            RefreshTokenRepository refreshTokenRepository,
            UserExternalLoginRepository externalLoginRepository,
            PasswordEncoder passwordEncoder,
            GoogleTokenVerifier googleTokenVerifier,
            AccountMapper mapper,
            AuditService auditService,
            NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.registrationRequestRepository = registrationRequestRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.externalLoginRepository = externalLoginRepository;
        this.passwordEncoder = passwordEncoder;
        this.googleTokenVerifier = googleTokenVerifier;
        this.mapper = mapper;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public UserResponse me(String userId) {
        return mapper.toUserResponse(findUser(userId));
    }

    @Transactional
    public UserResponse updateMe(String userId, UpdateMeRequest request) {
        User user = findUser(userId);
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone());
        user.setAvatarUrl(request.avatarUrl());
        return mapper.toUserResponse(user);
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = findUser(userId);
        if (user.getPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CURRENT_PASSWORD", "Current password is invalid");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        refreshTokenRepository.revokeAllForUser(userId, Instant.now());
        auditService.record(userId, "PASSWORD_CHANGED", "User", userId, "SUCCESS", null);
    }

    @Transactional(readOnly = true)
    public RegistrationRequestResponse myRegistrationRequest(String userId) {
        return registrationRequestRepository.findFirstByUserUserIdOrderByCreatedAtDesc(userId)
                .map(mapper::toRegistrationRequestResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Registration request not found"));
    }

    @Transactional
    public void linkGoogle(String userId, String idToken) {
        User user = findUser(userId);
        GoogleIdentity identity = googleTokenVerifier.verify(idToken);
        if (!identity.emailVerified() || !EmailNormalizer.normalize(identity.email()).equals(user.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT, "GOOGLE_EMAIL_MISMATCH", "Google account email must match your RaceForge email");
        }
        if (externalLoginRepository.existsByProviderAndProviderUserId("GOOGLE", identity.subject())) {
            throw new ApiException(HttpStatus.CONFLICT, "GOOGLE_ALREADY_LINKED", "Google account is already linked");
        }
        if (externalLoginRepository.existsByUserUserIdAndProvider(userId, "GOOGLE")) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_ALREADY_HAS_GOOGLE", "User already has a Google login");
        }
        UserExternalLogin login = new UserExternalLogin();
        login.setExternalLoginId(IdGenerator.uuid());
        login.setUser(user);
        login.setProvider("GOOGLE");
        login.setProviderUserId(identity.subject());
        login.setCreatedAt(Instant.now());
        externalLoginRepository.save(login);
        auditService.record(userId, "GOOGLE_LINKED", "User", userId, "SUCCESS", null);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(String search, String status, String roleId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "userId"));
        return mapper.toPageResponse(userRepository.searchUsers(blankToNull(search), blankToNull(status), blankToNull(roleId), pageable)
                .map(mapper::toUserResponse));
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(String id) {
        return mapper.toUserResponse(findUser(id));
    }

    @Transactional
    public UserResponse updateStatus(String managerId, String id, UpdateStatusRequest request) {
        if (managerId.equals(id)) {
            throw new ApiException(HttpStatus.CONFLICT, "CANNOT_UPDATE_SELF_STATUS", "Manager cannot update own status");
        }
        User user = findUser(id);
        if (user.getRole() != null && ROLE_MANAGER.equals(user.getRole().getRoleId())) {
            throw new ApiException(HttpStatus.CONFLICT, "CANNOT_UPDATE_MANAGER_STATUS", "Manager accounts cannot be updated here");
        }
        if (!STATUS_ACTIVE.equals(user.getStatus()) && !STATUS_INACTIVE.equals(user.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_NOT_APPROVED", "Only approved accounts can be locked or unlocked");
        }
        String nextStatus = request.status();
        if (!STATUS_ACTIVE.equals(nextStatus) && !STATUS_INACTIVE.equals(nextStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Status must be ACTIVE or INACTIVE");
        }
        user.setStatus(nextStatus);
        if (STATUS_INACTIVE.equals(nextStatus)) {
            refreshTokenRepository.revokeAllForUser(id, Instant.now());
        }
        notificationService.notify(id, "ACCOUNT_STATUS", "Account status updated", "Your account status is now " + nextStatus + ".");
        auditService.record(managerId, "USER_STATUS_UPDATED", "User", id, "SUCCESS", nextStatus);
        return mapper.toUserResponse(user);
    }

    private User findUser(String id) {
        return userRepository.findDetailedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
