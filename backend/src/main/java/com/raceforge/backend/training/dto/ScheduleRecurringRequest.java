package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.*;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

/** The date range comes from the registered horse package, never from client week counts. */
public class ScheduleRecurringRequest {
    @NotNull private String planId;
    private String horseId;
    @NotNull private String horsePackageId;
    @NotBlank @Size(max = 1000) private String activityName;
    @NotEmpty @Size(max=6) private Set<@NotNull DayOfWeek> daysOfWeek;
    private LocalTime sessionTime;
    private LocalTime sessionEndTime;
    public LocalTime getSessionEndTime(){return sessionEndTime;}
    public void setSessionEndTime(LocalTime value){sessionEndTime=value;}

    public String getPlanId() { return planId; }
    public void setPlanId(String value) { planId = value; }
    public String getHorseId() { return horseId; }
    public void setHorseId(String value) { horseId = value; }
    public String getHorsePackageId() { return horsePackageId; }
    public void setHorsePackageId(String value) { horsePackageId = value; }
    public String getActivityName() { return activityName; }
    public void setActivityName(String value) { activityName = value; }
    public Set<DayOfWeek> getDaysOfWeek() { return daysOfWeek; }
    public void setDaysOfWeek(Set<DayOfWeek> value) { daysOfWeek = value; }
    public LocalTime getSessionTime() { return sessionTime; }
    public void setSessionTime(LocalTime value) { sessionTime = value; }
}
