package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingStage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrainingStageRepository extends JpaRepository<TrainingStage,String> {
    @Query("select s from TrainingStage s where s.plan.planId=:planId and s.startDay<=:day and s.endDay>=:day")
    List<TrainingStage> findForDay(@Param("planId") String planId,@Param("day") int day);
}
