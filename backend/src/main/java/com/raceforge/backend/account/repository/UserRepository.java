package com.raceforge.backend.account.repository;

import com.raceforge.backend.account.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("""
            select u from User u
            left join fetch u.role
            left join fetch u.requestedRole
            where u.userId = :userId
            """)
    Optional<User> findDetailedById(@Param("userId") String userId);

    @Query("""
            select u from User u
            left join u.role r
            where (:status is null or u.status = :status)
              and (:roleId is null or r.roleId = :roleId)
              and (:search is null or lower(u.fullName) like lower(concat('%', :search, '%'))
                   or lower(u.email) like lower(concat('%', :search, '%'))
                   or u.phone like concat('%', :search, '%'))
            """)
    Page<User> searchUsers(
            @Param("search") String search,
            @Param("status") String status,
            @Param("roleId") String roleId,
            Pageable pageable
    );

    @Query("""
            select u from User u
            join u.role r
            where r.roleId = 'ROL001' and u.status = 'ACTIVE'
            """)
    List<User> findActiveManagers();
}
