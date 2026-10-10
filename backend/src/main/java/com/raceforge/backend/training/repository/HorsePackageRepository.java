package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.HorsePackage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HorsePackageRepository extends JpaRepository<HorsePackage, String> {

    List<HorsePackage> findByHorse_HorseIdOrderByRegisteredAtDesc(String horseId);

    List<HorsePackage> findByHorse_HorseIdAndStatus(String horseId, String status);

    boolean existsByHorse_HorseIdAndStatusIn(String horseId, List<String> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT hp FROM HorsePackage hp WHERE hp.horsePackageId = :id")
    Optional<HorsePackage> findForUpdate(@Param("id") String id);
}
