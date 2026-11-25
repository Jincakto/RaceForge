package com.raceforge.backend.notification.controller;

import com.raceforge.backend.notification.repository.NotificationRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class NotificationReadAllTest {
    @Test void bulkReadUsesOnlyAuthenticatedUserAndServerCutoff() {
        var repository = mock(NotificationRepository.class);
        when(repository.markAllRead(eq("OWN-001"), any())).thenReturn(5);
        when(repository.countByUserIdAndReadFalse("OWN-001")).thenReturn(1L);
        var controller = new NotificationController(repository);
        Instant before = Instant.now();
        var response = controller.markAllRead(new AuthenticatedUser("OWN-001", "owner@test.invalid", "ACTIVE", 6, "HORSE_OWNER"));
        Instant after = Instant.now();
        var cutoff = ArgumentCaptor.forClass(Instant.class);
        verify(repository).markAllRead(eq("OWN-001"), cutoff.capture());
        assertTrue(response.success());
        assertEquals(5, response.data().updatedCount());
        assertEquals(1L, response.data().unreadCount(), "A new unread arrival must not be forced to zero");
        assertFalse(cutoff.getValue().isBefore(before));
        assertFalse(cutoff.getValue().isAfter(after));
        assertEquals(cutoff.getValue(), response.data().readThrough());
        verify(repository).countByUserIdAndReadFalse("OWN-001");
        verifyNoMoreInteractions(repository);
    }

    @Test void retryWhenNothingIsUnreadIsSuccessful() {
        var repository = mock(NotificationRepository.class);
        var response = new NotificationController(repository).markAllRead(
                new AuthenticatedUser("VET-001", "vet@test.invalid", "ACTIVE", 4, "VETERINARIAN"));
        assertTrue(response.success()); assertEquals(0, response.data().updatedCount());
    }
}
