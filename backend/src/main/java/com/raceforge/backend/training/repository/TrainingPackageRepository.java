package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrainingPackageRepository extends JpaRepository<TrainingPackage, String> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from TrainingPackage p where p.packageId = :id")
    java.util.Optional<TrainingPackage> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") String id);

    List<TrainingPackage> findByStatusOrderByPackageNameAsc(String status);

}
