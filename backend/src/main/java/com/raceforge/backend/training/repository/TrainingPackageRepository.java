package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.Query;

public interface TrainingPackageRepository extends JpaRepository<TrainingPackage, String> {

    List<TrainingPackage> findByStatusOrderByPackageNameAsc(String status);

    @Query(value = "SELECT NEXT VALUE FOR dbo.Training_Package_Id_Sequence", nativeQuery = true)
    Long nextPackageNumber();
}
