package com.raceforge.backend.account.repository;

import com.raceforge.backend.account.entity.EmailVerificationOtp;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from EmailVerificationOtp o where o.userId = :userId")
    Optional<EmailVerificationOtp> findByUserIdForUpdate(@Param("userId") Integer userId);
}
