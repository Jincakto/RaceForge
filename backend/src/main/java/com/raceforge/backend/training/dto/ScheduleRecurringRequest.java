package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.*;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

/** The date range comes from the registered horse package, never from client week counts. */
public class ScheduleRecurringRequest {
    @NotNull @Positive private Integer planId;
    private Integer horseId;
    @NotNull @Positive private Integer horsePackageId;
    @NotBlank @Size(max = 1000) private String activityName;
    @NotEmpty private Set<@NotNull DayOfWeek> daysOfWeek;
    private LocalTime sessionTime;

    public Integer getPlanId() { return planId; }
    public void setPlanId(Integer value) { planId = value; }
    public Integer getHorseId() { return horseId; }
    public void setHorseId(Integer value) { horseId = value; }
    public Integer getHorsePackageId() { return horsePackageId; }
    public void setHorsePackageId(Integer value) { horsePackageId = value; }
    public String getActivityName() { return activityName; }
    public void setActivityName(String value) { activityName = value; }
    public Set<DayOfWeek> getDaysOfWeek() { return daysOfWeek; }
    public void setDaysOfWeek(Set<DayOfWeek> value) { daysOfWeek = value; }
    public LocalTime getSessionTime() { return sessionTime; }
    public void setSessionTime(LocalTime value) { sessionTime = value; }
}

// Previous week-count request retained for reference; no longer used.
// package com.raceforge.backend.training.dto;
// 
// import jakarta.validation.constraints.NotBlank;
// import jakarta.validation.constraints.NotNull;
// import jakarta.validation.constraints.Min;
// import jakarta.validation.constraints.Max;
// import jakarta.validation.constraints.Size;
// import java.time.DayOfWeek;
// import java.time.LocalDate;
// import java.time.LocalTime;
// import java.util.Set;
// 
// /**
//  * Creates one or many sessions for a horse attached to the given training plan (Horse_Plan).
//  * - daysOfWeek given: one session per listed weekday, repeated for durationWeeks weeks.
//  * - daysOfWeek empty: one session on startDate, repeated weekly for durationWeeks weeks.
//  * - durationWeeks null: one week; otherwise 1..52 (technical batch limit).
//  */
// public class ScheduleRecurringRequest {
// 
//   @NotNull
//   private Integer planId;
// 
//   // Optional when the plan has exactly one horse.
//   private Integer horseId;
// 
//   @NotBlank
//   @Size(max = 1000)
//   private String activityName;
// 
//   @NotNull
//   private LocalDate startDate;
// 
//   private Set<@NotNull DayOfWeek> daysOfWeek;
// 
//   // Technical batch limit; null defaults to one week.
//   @Min(1)
//   @Max(52)
//   private Integer durationWeeks;
// 
//   // Defaults to 07:00 when not provided.
//   private LocalTime sessionTime;
// 
//   public ScheduleRecurringRequest() {
//   }
// 
//   public Integer getPlanId() {
//       return planId;
//   }
// 
//   public void setPlanId(Integer planId) {
//       this.planId = planId;
//   }
// 
//   public String getActivityName() {
//       return activityName;
//   }
// 
//   public void setActivityName(String activityName) {
//       this.activityName = activityName;
//   }
// 
//   public LocalDate getStartDate() {
//       return startDate;
//   }
// 
//   public void setStartDate(LocalDate startDate) {
//       this.startDate = startDate;
//   }
// 
//   public Set<DayOfWeek> getDaysOfWeek() {
//       return daysOfWeek;
//   }
// 
//   public void setDaysOfWeek(Set<DayOfWeek> daysOfWeek) {
//       this.daysOfWeek = daysOfWeek;
//   }
// 
//   public Integer getDurationWeeks() {
//       return durationWeeks;
//   }
// 
//   public void setDurationWeeks(Integer durationWeeks) {
//       this.durationWeeks = durationWeeks;
//   }
// 
//   public LocalTime getSessionTime() {
//       return sessionTime;
//   }
// 
//   public void setSessionTime(LocalTime sessionTime) {
//       this.sessionTime = sessionTime;
//   }
// 
//   public Integer getHorseId() {
//       return horseId;
//   }
// 
//   public void setHorseId(Integer horseId) {
//       this.horseId = horseId;
//   }
// }
// 