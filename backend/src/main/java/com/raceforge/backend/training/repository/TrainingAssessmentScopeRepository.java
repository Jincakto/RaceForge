package com.raceforge.backend.training.repository;

import com.raceforge.backend.horse.entity.HorseAssignment;
import com.raceforge.backend.training.entity.TrainerAssignment;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** Read-only batched scope queries over existing assignment entities. */
public interface TrainingAssessmentScopeRepository extends Repository<TrainerAssignment, String> {
    interface CurrentTrainerPackage {
        String getHorseId();
        String getHorsePackageId();
    }

    @Query("""
            select a.horse.horseId as horseId, a.horsePackage.horsePackageId as horsePackageId
            from TrainerAssignment a
            where a.kind = 'TRAINER' and a.status = 'ACCEPTED' and a.endedAt is null
              and a.assignee.userId = :userId and a.horse.horseId in :horseIds
            """)
    List<CurrentTrainerPackage> findCurrentTrainerPackages(@Param("userId") String userId,
                                                          @Param("horseIds") Collection<String> horseIds);

    /**
     * Select newest assignments before inspecting status/user eligibility. Every
     * newest-time tie is returned so the service can deny ambiguous responsibility.
     */
    @Query("""
            select a from HorseAssignment a
            join fetch a.horse h
            join fetch a.assignee u
            join fetch u.role
            where a.kind = 'VET' and h.horseId in :horseIds
              and not exists (
                select newer.id from HorseAssignment newer
                where newer.kind = 'VET' and newer.horse.horseId = h.horseId
                  and newer.createdAt > a.createdAt
              )
            """)
    List<HorseAssignment> findLatestVetAssignments(@Param("horseIds") Collection<String> horseIds);
}