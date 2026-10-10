package com.raceforge.backend.account.repository;

import com.raceforge.backend.account.entity.EmailVerificationOtp;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, String> {

    Optional<EmailVerificationOtp> findFirstByUserUserIdOrderByCreatedAtDesc(String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerificationOtp> findFirstByUserUserIdAndUsedAtIsNullOrderByCreatedAtDesc(String userId);

    @Modifying
    @Query("""
            update EmailVerificationOtp o
            set o.usedAt = :now
            where o.user.userId = :userId and o.usedAt is null
            """)
    int invalidateUnusedForUser(@Param("userId") String userId, @Param("now") Instant now);
}
