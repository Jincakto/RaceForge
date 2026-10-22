package com.raceforge.backend.account.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AdminBootstrapTest {
    UserRepository users = mock(UserRepository.class);
    RoleRepository roles = mock(RoleRepository.class);
    BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    @Test void createsAdminWithHashedPassword() {
        Role role = new Role(); role.setRoleId(7); role.setRoleName("ADMIN");
        when(roles.findById(7)).thenReturn(Optional.of(role));
        new AdminBootstrap(users, roles, passwords, "admin@example.com", "StrongPassword123").run();
        var saved = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(saved.capture());
        assertEquals(7, saved.getValue().getRole().getRoleId());
        assertEquals("ACTIVE", saved.getValue().getStatus());
        assertTrue(passwords.matches("StrongPassword123", saved.getValue().getPassword()));
    }

    @Test void cannotPromoteExistingOwner() {
        Role role = new Role(); role.setRoleId(5);
        User user = new User(); user.setRole(role);
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(user));
        assertThrows(IllegalStateException.class,
                () -> new AdminBootstrap(users, roles, passwords, "admin@example.com", "StrongPassword123").run());
        assertEquals(5, user.getRole().getRoleId());
        verify(users, never()).saveAndFlush(any());
    }

    @Test void repeatedBootstrapDoesNotResetExistingAdmin() {
        Role role = new Role(); role.setRoleId(7);
        User user = new User(); user.setRole(role); user.setPassword("existing-hash");
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(user));
        new AdminBootstrap(users, roles, passwords, "admin@example.com", "StrongPassword123").run();
        assertEquals("existing-hash", user.getPassword());
        verify(users, never()).saveAndFlush(any());
    }
}
