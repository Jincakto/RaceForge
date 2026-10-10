package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.HorsePackage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HorsePackageRepository extends JpaRepository<HorsePackage, String> {

    List<HorsePackage> findByHorse_HorseIdOrderByRegisteredAtDesc(String horseId);

    List<HorsePackage> findByHorse_HorseIdAndStatus(String horseId, String status);
}
