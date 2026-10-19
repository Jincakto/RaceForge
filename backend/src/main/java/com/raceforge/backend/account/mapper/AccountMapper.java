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
    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    private String profileId(User user) {
        if (user.getRole() == null) return null;
        if ("HEAD_TRAINER".equals(user.getRole().getRoleName())) {
            var ids=jdbc.queryForList("SELECT CONVERT(varchar(20),trainer_id) FROM dbo.Trainer WHERE user_id=?", String.class,user.getUserId());
            return ids.isEmpty()?null:ids.get(0);
        }
        return user.getRoleProfiles().stream().filter(p -> p.getRoleName().equals(user.getRole().getRoleName()))
                .map(com.raceforge.backend.account.entity.AccountRoleProfile::getProfileId).findFirst().orElse(null);
    }

    public UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getUserId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getStatus(),
                user.isEmailVerified(),
                user.getAvatarUrl(),
                toRoleResponse(user.getRole()),
                profileId(user)
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
