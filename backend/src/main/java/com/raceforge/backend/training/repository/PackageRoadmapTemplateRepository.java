package com.raceforge.backend.training.repository;
import com.raceforge.backend.training.entity.PackageRoadmapTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface PackageRoadmapTemplateRepository extends JpaRepository<PackageRoadmapTemplate,String>{Optional<PackageRoadmapTemplate> findByPackageId(String packageId);}
