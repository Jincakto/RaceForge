package com.raceforge.backend.audit.controller;

import com.raceforge.backend.audit.service.AuditLogQueryService;
import com.raceforge.backend.common.response.ApiResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/audit-logs")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminAuditLogController {
    private final AuditLogQueryService audit;

    public AdminAuditLogController(AuditLogQueryService audit) {
        this.audit = audit;
    }

    @GetMapping
    public ApiResponse<AuditLogQueryService.AuditPage> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String horseId,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || page > 100_000 || size < 1 || size > 100 ||
                (from != null && to != null && from.isAfter(to))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid audit filters or page size");
        }
        return ApiResponse.success("Stored system audit events",
                audit.search(q, actorId, action, entityType, entityId, horseId, result, from, to, page, size));
    }
}
