package com.raceforge.backend.account.service;

import static com.raceforge.backend.account.AccountConstants.REQUEST_APPROVED;
import static com.raceforge.backend.account.AccountConstants.REQUEST_PENDING;
import static com.raceforge.backend.account.AccountConstants.REQUEST_REJECTED;
import static com.raceforge.backend.account.AccountConstants.STATUS_ACTIVE;
import static com.raceforge.backend.account.AccountConstants.STATUS_PENDING;
import static com.raceforge.backend.account.AccountConstants.STATUS_REJECTED;

import com.raceforge.backend.account.dto.AuthDtos.PageResponse;
import com.raceforge.backend.account.dto.AuthDtos.RegistrationRequestResponse;
import com.raceforge.backend.account.entity.RegistrationRequest;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.mapper.AccountMapper;
import com.raceforge.backend.account.repository.RegistrationRequestRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.notification.service.NotificationService;
import java.time.Instant;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationRequestService {

    private final RegistrationRequestRepository registrationRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final AccountMapper mapper;

    public RegistrationRequestService(
            RegistrationRequestRepository registrationRequestRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            AuditService auditService,
            AccountMapper mapper
    ) {
        this.registrationRequestRepository = registrationRequestRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<RegistrationRequestResponse> list(String search, String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return mapper.toPageResponse(registrationRequestRepository
                .searchRequests(blankToNull(search), blankToNull(status), pageable)
                .map(mapper::toRegistrationRequestResponse));
    }

    @Transactional(readOnly = true)
    public RegistrationRequestResponse get(String id) {
        return mapper.toRegistrationRequestResponse(registrationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registration request not found")));
    }

    @Transactional
    public RegistrationRequestResponse approve(String requestId, String managerId, String note) {
        RegistrationRequest request = pendingRequestForUpdate(requestId);
        User user = request.getUser();
        if (!STATUS_PENDING.equals(user.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_NOT_PENDING", "User is not pending approval");
        }
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        request.setStatus(REQUEST_APPROVED);
        request.setReviewedBy(manager);
        request.setReviewedAt(Instant.now());
        request.setReviewNote(note);
        user.setRole(request.getRequestedRole());
        user.setStatus(STATUS_ACTIVE);
        notificationService.notify(user.getUserId(), "REGISTRATION_APPROVED", "Registration approved", "Your RaceForge account has been approved.");
        auditService.record(managerId, "REGISTRATION_APPROVED", "User", user.getUserId(), "SUCCESS", note);
        return mapper.toRegistrationRequestResponse(request);
    }

    @Transactional
    public RegistrationRequestResponse reject(String requestId, String managerId, String reason) {
        RegistrationRequest request = pendingRequestForUpdate(requestId);
        User user = request.getUser();
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        request.setStatus(REQUEST_REJECTED);
        request.setReviewedBy(manager);
        request.setReviewedAt(Instant.now());
        request.setReviewNote(reason);
        user.setStatus(STATUS_REJECTED);
        notificationService.notify(user.getUserId(), "REGISTRATION_REJECTED", "Registration rejected", reason);
        auditService.record(managerId, "REGISTRATION_REJECTED", "User", user.getUserId(), "SUCCESS", reason);
        return mapper.toRegistrationRequestResponse(request);
    }

    private RegistrationRequest pendingRequestForUpdate(String requestId) {
        RegistrationRequest request = registrationRequestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration request not found"));
        if (!REQUEST_PENDING.equals(request.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "REGISTRATION_ALREADY_REVIEWED", "Registration request was already reviewed");
        }
        return request;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
