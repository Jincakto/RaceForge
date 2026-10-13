package com.raceforge.backend.account.controller;

import com.raceforge.backend.account.AccountConstants;
import com.raceforge.backend.account.dto.AuthDtos.RegistrationRequestResponse;
import com.raceforge.backend.account.entity.RegistrationRequest;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.*;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Membership in the single RaceForge club, not a client-supplied club id. */
@RestController
@RequestMapping("/api/users/me/registration-request")
public class MembershipController {
    private final UserRepository users;
    private final RoleRepository roles;
    private final RegistrationRequestRepository requests;
    private final AccountMapper mapper;
    private final AuditService audit;
    public MembershipController(UserRepository users, RoleRepository roles, RegistrationRequestRepository requests, AccountMapper mapper, AuditService audit) {
        this.users=users; this.roles=roles; this.requests=requests; this.mapper=mapper; this.audit=audit;
    }
    public record SubmitRequest(@NotNull Integer requestedRoleId) {}
    @PostMapping
    @Transactional
    public ApiResponse<RegistrationRequestResponse> submit(@AuthenticationPrincipal AuthenticatedUser actor, @Valid @RequestBody SubmitRequest body) {
        var user=users.findByIdForUpdate(actor.userId()).orElseThrow(()->new ResourceNotFoundException("User not found"));
        if (!user.isEmailVerified() || !AccountConstants.ROLE_USER.equals(user.getRole().getRoleId()) || "INACTIVE".equals(user.getStatus()))
            throw new ApiException(HttpStatus.FORBIDDEN,"MEMBERSHIP_NOT_ALLOWED","Only verified USER accounts may request membership");
        if (!AccountConstants.SELF_REGISTRATION_ROLES.contains(body.requestedRoleId()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_REQUESTED_ROLE","Role is not available for membership");
        if (requests.existsByUserUserIdAndStatus(actor.userId(),"PENDING"))
            throw new ApiException(HttpStatus.CONFLICT,"REQUEST_PENDING","A membership request is already pending");
        var role=roles.findById(body.requestedRoleId()).orElseThrow(()->new ResourceNotFoundException("Role not found"));
        user.setRequestedRole(role); user.setStatus("PENDING");
        var request=new RegistrationRequest(); request.setUser(user); request.setRequestedRole(role); request.setStatus("PENDING");request.setCreatedAt(Instant.now());
        requests.save(request);
        audit.record(actor.userId(),"MEMBERSHIP_SUBMITTED","User",actor.userId(),"SUCCESS",role.getRoleName());
        return ApiResponse.success("Membership requested",mapper.toRegistrationRequestResponse(request));
    }
}
