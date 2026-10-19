package com.raceforge.backend.horse.repository;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Trainer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrainerRepository extends JpaRepository<Trainer, Integer> {

    Optional<Trainer> findByUser_UserId(String userId);

    @Query("""
            select u from User u join u.role r
            where r.roleName = 'HEAD_TRAINER'
              and u.status = 'ACTIVE'
              and u.emailVerified = true
            """)
    Page<User> findEligibleUsers(Pageable pageable);

    @Query("""
            select t from Horse h join h.trainers t
            where h.horseId = :horseId
            """)
    List<Trainer> findAssignedToHorse(@Param("horseId") String horseId);

    @Query("""
            select case when count(t) > 0 then true else false end
            from Horse h join h.trainers t
            where h.horseId = :horseId and t.user.userId = :userId
            """)
    boolean isAssigned(@Param("horseId") String horseId,
                       @Param("userId") String userId);
}
