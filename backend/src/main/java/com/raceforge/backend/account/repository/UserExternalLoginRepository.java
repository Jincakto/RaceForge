package com.raceforge.backend.account.repository;

import com.raceforge.backend.account.entity.UserExternalLogin;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserExternalLoginRepository extends JpaRepository<UserExternalLogin, String> {

    Optional<UserExternalLogin> findByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByUserUserIdAndProvider(String userId, String provider);
}
