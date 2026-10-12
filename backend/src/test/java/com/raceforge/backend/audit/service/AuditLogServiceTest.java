package com.raceforge.backend.audit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.raceforge.backend.audit.entity.AuditLog;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class AuditLogServiceTest {
    private final AuditLogRepository repository = mock(AuditLogRepository.class);
    private final AuditLogService service = new AuditLogService(repository);

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void horseEventsCaptureTheAuthenticatedActorAndCreationTime() {
        AuthenticatedUser user = new AuthenticatedUser(42, "owner@example.com", "ACTIVE", 5, "HORSE_OWNER");
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(user, null, List.of()));
        when(repository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AuditLog log = service.record(null, 7, "HORSE", 7, "HORSE_UPDATED", "SUCCESS", null);
        assertEquals(42, log.getUserId());
        assertEquals(7, log.getHorseId());
        assertEquals("HORSE_UPDATED", log.getAction());
        assertNotNull(log.getCreatedAt());
    }

    @Test
    void explicitActorIsPreservedForMedicalAndPackageEvents() {
        when(repository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AuditLog log = service.record(12, 7, "MEDICAL_RECORD", 9, "MEDICAL_RECORD_CONFIRMED", "SUCCESS", null);
        assertEquals(12, log.getUserId());
        assertEquals(9, log.getEntityId());
        assertNotNull(log.getCreatedAt());
    }
}
