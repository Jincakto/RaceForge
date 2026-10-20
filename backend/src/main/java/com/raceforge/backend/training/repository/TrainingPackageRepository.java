package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrainingPackageRepository extends JpaRepository<TrainingPackage, String> {

    List<TrainingPackage> findByStatusOrderByPackageNameAsc(String status);
}
