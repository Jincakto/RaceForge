package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.HorsePackage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HorsePackageRepository extends JpaRepository<HorsePackage, Integer> {

    List<HorsePackage> findByHorse_HorseIdOrderByRegisteredAtDesc(String horseId);

    List<HorsePackage> findByHorse_HorseIdAndStatus(String horseId, String status);

    boolean existsByHorse_HorseIdAndStatusIn(String horseId, List<String> statuses);

    boolean existsByTrainingPackage_PackageId(String packageId);

    /**
     * Used while confirming a Training Lock. Horse itself must already be
     * locked by the caller, and these package rows are locked as well.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT hp FROM HorsePackage hp WHERE hp.horse.horseId = :horseId AND hp.status = :status")
    List<HorsePackage> findByHorseIdAndStatusForUpdate(
            @Param("horseId") String horseId, @Param("status") String status);

    @Query("SELECT hp FROM HorsePackage hp WHERE hp.horse.horseId = :horseId ORDER BY hp.registeredAt DESC")
    List<HorsePackage> findByHorseIdOrderByRegisteredAtDesc(@Param("horseId") String horseId);

    /** endDate is inclusive; a package expires only on the following day. */
    @Query("SELECT hp.horsePackageId FROM HorsePackage hp "
            + "WHERE hp.status = 'ACTIVE' AND hp.endDate < :today "
            + "ORDER BY hp.horsePackageId")
    List<Integer> findExpiredActiveRegistrationIds(@Param("today") LocalDate today);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT hp FROM HorsePackage hp WHERE hp.horsePackageId = :id")
    Optional<HorsePackage> findForUpdate(@Param("id") Integer id);
}
