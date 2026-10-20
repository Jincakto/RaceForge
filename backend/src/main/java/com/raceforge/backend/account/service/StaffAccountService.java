package com.raceforge.backend.account.service;

import static com.raceforge.backend.account.AccountConstants.*;

import com.raceforge.backend.account.dto.AuthDtos.MessageResponse;
import com.raceforge.backend.account.dto.AuthDtos.ResetPasswordRequest;
import com.raceforge.backend.account.dto.AuthDtos.UserResponse;
import com.raceforge.backend.account.dto.UserDtos.CreateStaffRequest;
import com.raceforge.backend.account.entity.PasswordResetToken;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.common.util.EmailNormalizer;
import com.raceforge.backend.common.util.SecureTokenUtil;
import com.raceforge.backend.config.AuthProperties;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffAccountService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwords;
    private final EmailService email;
    private final AuthProperties properties;
    private final AccountMapper mapper;
    private final AuditService audit;

    public StaffAccountService(UserRepository users, RoleRepository roles, PasswordResetTokenRepository tokens,
            PasswordEncoder passwords, EmailService email, AuthProperties properties, AccountMapper mapper, AuditService audit) {
        this.users = users;
        this.roles = roles;
        this.tokens = tokens;
        this.passwords = passwords;
        this.email = email;
        this.properties = properties;
        this.mapper = mapper;
        this.audit = audit;
    }

    @Transactional
    public UserResponse create(String adminId, CreateStaffRequest request) {
        requireAdmin(adminId);
        if (request.roleId() == null || !STAFF_ROLES.contains(request.roleId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STAFF_ROLE", "Only staff roles may be assigned here");
        }
        String address = EmailNormalizer.normalize(request.email());
        if (users.existsByEmail(address)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email already exists");
        }
        User user = new User();
        user.setEmail(address);
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone());
        user.setRole(roles.findById(request.roleId()).orElseThrow(() -> new ResourceNotFoundException("Role not found")));
        user.setStatus(STATUS_INVITED);
        user.setEmailVerified(false);
        users.saveAndFlush(user);
        invite(user);
        audit.record(adminId, "STAFF_CREATED", "User", user.getUserId(), "SUCCESS", user.getRole().getRoleName());
        return mapper.toUserResponse(user);
    }

    @Transactional
    public MessageResponse resend(String adminId, String userId) {
        requireAdmin(adminId);
        User user = users.findByIdForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!STATUS_INVITED.equals(user.getStatus()) || user.getRole() == null || !STAFF_ROLES.contains(user.getRole().getRoleId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_NOT_INVITED", "Only invited staff accounts can receive a new invitation");
        }
        invite(user);
        audit.record(adminId, "STAFF_INVITATION_RESENT", "User", userId, "SUCCESS", null);
        return new MessageResponse("A new invitation has been sent. Previous invitation links are invalid.");
    }

    @Transactional
    public MessageResponse setPassword(ResetPasswordRequest request) {
        PasswordResetToken token = tokens.findByTokenHashForUpdate(SecureTokenUtil.sha256Hex(request.token()))
                .orElseThrow(this::invalidInvitation);
        Instant now = Instant.now();
        if (!PasswordResetToken.STAFF_INVITATION.equals(token.getPurpose()) || token.getUsedAt() != null
                || !token.getExpiresAt().isAfter(now)) throw invalidInvitation();
        User user = users.findByIdForUpdate(token.getUser().getUserId()).orElseThrow(this::invalidInvitation);
        if (!STATUS_INVITED.equals(user.getStatus()) || user.getPassword() != null
                || user.getRole() == null || !STAFF_ROLES.contains(user.getRole().getRoleId())) throw invalidInvitation();
        user.setPassword(passwords.encode(request.newPassword()));
        user.setEmailVerified(true);
        user.setStatus(STATUS_ACTIVE);
        token.setUsedAt(now);
        tokens.markAllUnusedForUserUsed(user.getUserId(), now);
        audit.record(user.getUserId(), "STAFF_ACCOUNT_ACTIVATED", "User", user.getUserId(), "SUCCESS", null);
        return new MessageResponse("Password set. Your staff account is active; you can now log in.");
    }

    private void invite(User user) {
        Instant now = Instant.now();
        tokens.markAllUnusedForUserUsed(user.getUserId(), now);
        String raw = SecureTokenUtil.randomToken(32);
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setPurpose(PasswordResetToken.STAFF_INVITATION);
        token.setTokenHash(SecureTokenUtil.sha256Hex(raw));
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusSeconds(properties.getPasswordReset().getMinutes() * 60));
        tokens.save(token);
        String base = properties.getPasswordReset().getFrontendUrl();
        email.sendStaffInvitation(user.getEmail(), base + (base.contains("?") ? "&" : "?")
                + "invitation=true&token=" + URLEncoder.encode(raw, StandardCharsets.UTF_8));
    }

    private void requireAdmin(String id) {
        User admin = users.findDetailedById(id).orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Admin required"));
        if (!STATUS_ACTIVE.equals(admin.getStatus()) || admin.getRole() == null || !ROLE_ADMIN.equals(admin.getRole().getRoleId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Only an active admin can create staff accounts");
        }
    }

    private ApiException invalidInvitation() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITATION", "Invalid, expired or already used invitation");
    }
}
