package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Shared validation for trainer-entered stages and package templates. */
public final class TrainingStageValidator {
 private TrainingStageValidator() {}
 public static void validateStages(List<Stage> stages, int days) {
  if(stages==null||stages.isEmpty()||stages.size()>100)
   throw new BusinessRuleException("Provide 1..100 roadmap stages directly when creating or updating a plan");
  if(stages.stream().anyMatch(Objects::isNull))
   throw new BusinessRuleException("Roadmap stages must not contain null entries");
  int last=0;
  for(Stage s:stages.stream().sorted(Comparator.comparingInt(Stage::startDay)).toList()) {
   if(s.startDay()<1||s.endDay()<s.startDay()||s.endDay()>days||s.startDay()<=last
      ||s.activityName()==null||s.activityName().isBlank()||s.activityName().length()>500
      ||s.daysOfWeek()==null||s.daysOfWeek().isEmpty()||s.daysOfWeek().size()>6
      ||s.daysOfWeek().stream().anyMatch(Objects::isNull)
      ||s.sessionTime()==null||s.sessionEndTime()==null||!s.sessionEndTime().isAfter(s.sessionTime())
      ||s.intensity()==null||!Set.of("LOW","MODERATE","HIGH").contains(s.intensity()))
    throw new BusinessRuleException("Stages must be non-overlapping, within the allowed period, with valid activity, one to six weekdays, start/end time and intensity");
   last=s.endDay();
  }
 }
}
