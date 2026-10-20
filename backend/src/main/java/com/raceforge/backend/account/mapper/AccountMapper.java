package com.raceforge.backend.account.mapper;

import com.raceforge.backend.account.dto.AuthDtos.PageResponse;
import com.raceforge.backend.account.dto.AuthDtos.RoleResponse;
import com.raceforge.backend.account.dto.AuthDtos.UserResponse;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    public UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getUserId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getStatus(),
                user.isEmailVerified(),
                user.getAvatarUrl(),
                toRoleResponse(user.getRole())
        );
    }

    public RoleResponse toRoleResponse(Role role) {
        if (role == null) {
            return null;
        }
        return new RoleResponse(role.getRoleId(), role.getRoleName());
    }

    public <T> PageResponse<T> toPageResponse(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}
