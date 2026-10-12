package com.raceforge.backend.permission.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.permission.entity.Permission;
import com.raceforge.backend.permission.entity.RolePermission;
import com.raceforge.backend.permission.entity.RolePermissionId;
import com.raceforge.backend.permission.repository.PermissionRepository;
import com.raceforge.backend.permission.repository.RolePermissionRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PermissionDataSeederTest {
    @Mock private RoleRepository roleRepository;
    @Mock private PermissionRepository permissionRepository;
    @Mock private RolePermissionRepository grantRepository;
    @InjectMocks private PermissionDataSeeder seeder;

    @Test
    void seedsManagerPermissionWithoutChangingCanonicalRoleIds() {
        Role manager = manager();
        when(permissionRepository.findByPermissionName("MANAGE_PERMISSION")).thenReturn(Optional.empty());
        when(permissionRepository.save(any(Permission.class))).thenAnswer(invocation -> {
            Permission permission = invocation.getArgument(0);
            permission.setPermissionId(8);
            return permission;
        });

        seeder.run();

        ArgumentCaptor<RolePermission> grant = ArgumentCaptor.forClass(RolePermission.class);
        verify(grantRepository).save(grant.capture());
        assertSame(manager, grant.getValue().getRole());
        assertEquals(new RolePermissionId(1, 8), grant.getValue().getId());
        verify(roleRepository, never()).save(any());
    }

    @Test
    void alreadySeededPermissionIsNotInsertedAgain() {
        manager();
        Permission permission = new Permission("MANAGE_PERMISSION", "Manager only");
        permission.setPermissionId(8);
        when(permissionRepository.findByPermissionName("MANAGE_PERMISSION")).thenReturn(Optional.of(permission));
        when(grantRepository.existsById(new RolePermissionId(1, 8))).thenReturn(true);

        seeder.run();

        verify(roleRepository, never()).save(any());
        verify(permissionRepository, never()).save(any());
        verify(grantRepository, never()).save(any());
    }

    @Test
    void missingCanonicalRoleRequiresMigrationRatherThanInventingRoleIds() {
        when(roleRepository.findByRoleName("CLUB_MANAGER")).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> seeder.run());

        verify(roleRepository, never()).save(any());
        verifyNoInteractions(permissionRepository, grantRepository);
    }

    private Role manager() {
        Role manager = new Role();
        manager.setRoleId(1);
        manager.setRoleName("CLUB_MANAGER");
        when(roleRepository.findByRoleName("CLUB_MANAGER")).thenReturn(Optional.of(manager));
        return manager;
    }
}
