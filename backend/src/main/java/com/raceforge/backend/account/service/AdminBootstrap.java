package com.raceforge.backend.account.service;

import com.raceforge.backend.account.AccountConstants;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.common.util.EmailNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Explicit opt-in initial admin creation; never promotes an existing account or resets its password. */
@Component
@ConditionalOnProperty(name = "raceforge.bootstrap-admin.enabled", havingValue = "true")
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwords;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, RoleRepository roles, PasswordEncoder passwords,
            @Value("${raceforge.bootstrap-admin.email:}") String email,
            @Value("${raceforge.bootstrap-admin.password:}") String password) {
        this.users = users;
        this.roles = roles;
        this.passwords = passwords;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (email.isBlank() || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || password.length() < 12 || password.length() > 100) {
            throw new IllegalStateException("Bootstrap requires a valid email and a password of 12-100 characters");
        }
        String normalized = EmailNormalizer.normalize(email);
        User existing = users.findByEmail(normalized).orElse(null);
        if (existing != null) {
            if (existing.getRole() == null || !AccountConstants.ROLE_ADMIN.equals(existing.getRole().getRoleId())) {
                throw new IllegalStateException("Bootstrap email belongs to an existing non-admin account");
            }
            return;
        }
        User admin = new User();
        admin.setEmail(normalized);
        admin.setFullName("System Administrator");
        admin.setPassword(passwords.encode(password));
        admin.setRole(roles.findById(AccountConstants.ROLE_ADMIN).orElseThrow());
        admin.setStatus(AccountConstants.STATUS_ACTIVE);
        admin.setEmailVerified(true);
        users.saveAndFlush(admin);
    }
}
