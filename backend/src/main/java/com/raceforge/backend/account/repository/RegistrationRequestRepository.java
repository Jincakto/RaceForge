package com.raceforge.backend.account.repository;

import com.raceforge.backend.account.entity.RegistrationRequest;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, String> {

    boolean existsByUserUserIdAndStatus(String userId, String status);

    Optional<RegistrationRequest> findFirstByUserUserIdOrderByCreatedAtDesc(String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RegistrationRequest r where r.requestId = :requestId")
    Optional<RegistrationRequest> findByIdForUpdate(@Param("requestId") String requestId);

    @Query("""
            select r from RegistrationRequest r
            join r.user u
            join r.requestedRole role
            where (:status is null or r.status = :status)
              and (:search is null or lower(u.fullName) like lower(concat('%', :search, '%'))
                   or lower(u.email) like lower(concat('%', :search, '%'))
                   or lower(role.roleName) like lower(concat('%', :search, '%')))
            """)
    Page<RegistrationRequest> searchRequests(
            @Param("search") String search,
            @Param("status") String status,
            Pageable pageable
    );
}
