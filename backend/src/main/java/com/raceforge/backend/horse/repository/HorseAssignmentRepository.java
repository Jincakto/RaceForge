package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.HorseAssignment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface HorseAssignmentRepository extends JpaRepository<HorseAssignment, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from HorseAssignment a where a.id = :id")
    Optional<HorseAssignment> findByIdForUpdate(@Param("id") Integer id);

    List<HorseAssignment> findByHorse_HorseIdAndKindAndStatusIn(
            String horseId, String kind, List<String> statuses);

    List<HorseAssignment> findByHorse_HorseIdAndKindOrderByCreatedAtDesc(
            String horseId, String kind);

    List<HorseAssignment> findByKindAndStatusOrderByCreatedAtDesc(String kind, String status);

    List<HorseAssignment> findByAssignee_UserIdAndKindOrderByCreatedAtDesc(Integer userId, String kind);

    List<HorseAssignment> findByAssignee_UserIdAndKindAndStatusInOrderByCreatedAtDesc(
            Integer userId, String kind, List<String> statuses);

    boolean existsByHorse_HorseIdAndAssignee_UserIdAndKindAndStatusIn(
            String horseId, Integer userId, String kind, List<String> statuses);

    Optional<HorseAssignment> findFirstByHorse_HorseIdAndAssignee_UserIdAndKindAndStatusOrderByCreatedAtDesc(
            String horseId, Integer userId, String kind, String status);
}
