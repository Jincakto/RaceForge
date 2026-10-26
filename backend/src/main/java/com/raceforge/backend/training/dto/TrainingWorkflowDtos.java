package com.raceforge.backend.training.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.List;
import java.util.Set;

public final class TrainingWorkflowDtos {
 public record ProfileRequest(@NotBlank String userId,@Size(max=1000) String bio,@Size(max=1000) String qualifications){}
 public record ProfileUpdate(@Size(max=1000) String bio,@Size(max=1000) String qualifications){}
 public record ProfileStatus(@NotBlank String status){}
 public record AssignmentRequest(@NotBlank String horsePackageId,@NotBlank String trainerId){}
 public record Decision(@NotNull Boolean accepted,@Size(max=1000) String reason){}
 public record Reason(@NotBlank @Size(max=1000) String reason){}
 public record Replacement(@NotBlank String trainerId,@NotBlank @Size(max=1000) String reason){}
 public record Stage(@Min(1) int startDay,@Min(1) int endDay,@NotBlank @Size(max=500) String activityName,
                     @NotBlank String intensity,@NotEmpty @Size(max=6) Set<@NotNull DayOfWeek> daysOfWeek,@NotNull LocalTime sessionTime,@NotNull LocalTime sessionEndTime,
 @NotBlank @Size(max=150) String title, @Size(max=1000) String objective,
 @NotBlank @Size(max=50) String phaseCode){
 public Stage(int startDay,int endDay,String activityName,String intensity,Set<DayOfWeek> daysOfWeek,LocalTime sessionTime,LocalTime sessionEndTime){this(startDay,endDay,activityName,intensity,daysOfWeek,sessionTime,sessionEndTime,activityName,null,"CUSTOM");}
 }
 public record StagesRequest(@NotEmpty @Size(max=100) List<@Valid Stage> stages){}
 public record GenerateRequest(@NotNull @AssertTrue Boolean confirmed){}
}
