package com.raceforge.backend.training.repository;
import com.raceforge.backend.training.entity.PackageStageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PackageStageTemplateRepository extends JpaRepository<PackageStageTemplate,String>{List<PackageStageTemplate> findByRoadmapIdOrderByStageOrderAsc(String roadmapId);}
