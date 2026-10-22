package com.raceforge.backend.training.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TrainingSessionResponse {

  private Integer restingHeartRate;
  public Integer getRestingHeartRate(){return restingHeartRate;}
  public void setRestingHeartRate(Integer value){restingHeartRate=value;}

  private Integer endExerciseHeartRate;
  public Integer getEndExerciseHeartRate(){return endExerciseHeartRate;}
  public void setEndExerciseHeartRate(Integer value){endExerciseHeartRate=value;}

  private Integer recoveryHeartRate2Min;
  public Integer getRecoveryHeartRate2Min(){return recoveryHeartRate2Min;}
  public void setRecoveryHeartRate2Min(Integer value){recoveryHeartRate2Min=value;}

  private LocalDateTime recoveryMeasuredAt;
  public LocalDateTime getRecoveryMeasuredAt(){return recoveryMeasuredAt;}
  public void setRecoveryMeasuredAt(LocalDateTime value){recoveryMeasuredAt=value;}

  private String restingMedicalRecordId;
  public String getRestingMedicalRecordId(){return restingMedicalRecordId;}
  public void setRestingMedicalRecordId(String value){restingMedicalRecordId=value;}

  private LocalDateTime restingMeasuredAt;
  public LocalDateTime getRestingMeasuredAt(){return restingMeasuredAt;}
  public void setRestingMeasuredAt(LocalDateTime value){restingMeasuredAt=value;}

  private String horsePackageId;
  public String getHorsePackageId(){return horsePackageId;}
  public void setHorsePackageId(String value){horsePackageId=value;}

  private Long actualDurationSeconds;
  public Long getActualDurationSeconds(){return actualDurationSeconds;}
  public void setActualDurationSeconds(Long value){actualDurationSeconds=value;}

  private Long recoveryDelaySeconds;
  public Long getRecoveryDelaySeconds(){return recoveryDelaySeconds;}
  public void setRecoveryDelaySeconds(Long value){recoveryDelaySeconds=value;}

  private Integer heartRateDrop2Min;
  public Integer getHeartRateDrop2Min(){return heartRateDrop2Min;}
  public void setHeartRateDrop2Min(Integer value){heartRateDrop2Min=value;}

  private Boolean trainingLocked;
  public Boolean getTrainingLocked(){return trainingLocked;}
  public void setTrainingLocked(Boolean value){trainingLocked=value;}

  private Boolean canStart;
  public Boolean getCanStart(){return canStart;}
  public void setCanStart(Boolean value){canStart=value;}

  private Boolean canStop;
  public Boolean getCanStop(){return canStop;}
  public void setCanStop(Boolean value){canStop=value;}

  private Boolean canComplete;
  public Boolean getCanComplete(){return canComplete;}
  public void setCanComplete(Boolean value){canComplete=value;}

  private String packageType;
  public String getPackageType(){return packageType;}
  public void setPackageType(String value){packageType=value;}
  private String roadmapVersion;
  public String getRoadmapVersion(){return roadmapVersion;}
  public void setRoadmapVersion(String value){roadmapVersion=value;}
  private String stageId;
  public String getStageId(){return stageId;}
  public void setStageId(String value){stageId=value;}
  private String phaseCode;
  public String getPhaseCode(){return phaseCode;}
  public void setPhaseCode(String value){phaseCode=value;}
  private String stageTitle;
  public String getStageTitle(){return stageTitle;}
  public void setStageTitle(String value){stageTitle=value;}
  private String objective;
  public String getObjective(){return objective;}
  public void setObjective(String value){objective=value;}
  private String activityName;
  public String getActivityName(){return activityName;}
  public void setActivityName(String value){activityName=value;}
  private String sessionId;
  private String planId;
  private String horseId;
  private LocalDateTime scheduledStart;
  private LocalDateTime scheduledEnd;
  private BigDecimal distance;
  private String intensity;
  private String surface;
  private String status;
  private LocalDateTime actualStart;
  private LocalDateTime actualEnd;
  private String evaluation;
  private String notes;
  private Integer heartRate;
  private Double avgSpeed;
  private Double maxSpeed;
  private String recordedBy;

  public Integer getHeartRate() { return heartRate; }
  public void setHeartRate(Integer value) { heartRate = value; }
  public Double getAvgSpeed() { return avgSpeed; }
  public void setAvgSpeed(Double value) { avgSpeed = value; }
  public Double getMaxSpeed() { return maxSpeed; }
  public void setMaxSpeed(Double value) { maxSpeed = value; }
  public String getRecordedBy() { return recordedBy; }
  public void setRecordedBy(String value) { recordedBy = value; }

  public TrainingSessionResponse() {
  }

  public String getSessionId() {
      return sessionId;
  }

  public void setSessionId(String sessionId) {
      this.sessionId = sessionId;
  }

  public String getPlanId() {
      return planId;
  }

  public void setPlanId(String planId) {
      this.planId = planId;
  }

  public String getHorseId() {
      return horseId;
  }

  public void setHorseId(String horseId) {
      this.horseId = horseId;
  }

  public LocalDateTime getScheduledStart() {
      return scheduledStart;
  }

  public void setScheduledStart(LocalDateTime scheduledStart) {
      this.scheduledStart = scheduledStart;
  }

  public LocalDateTime getScheduledEnd() {
      return scheduledEnd;
  }

  public void setScheduledEnd(LocalDateTime scheduledEnd) {
      this.scheduledEnd = scheduledEnd;
  }

  public BigDecimal getDistance() {
      return distance;
  }

  public void setDistance(BigDecimal distance) {
      this.distance = distance;
  }

  public String getIntensity() {
      return intensity;
  }

  public void setIntensity(String intensity) {
      this.intensity = intensity;
  }

  public String getSurface() {
      return surface;
  }

  public void setSurface(String surface) {
      this.surface = surface;
  }

  public String getStatus() {
      return status;
  }

  public void setStatus(String status) {
      this.status = status;
  }

  public LocalDateTime getActualStart() {
      return actualStart;
  }

  public void setActualStart(LocalDateTime actualStart) {
      this.actualStart = actualStart;
  }

  public LocalDateTime getActualEnd() {
      return actualEnd;
  }

  public void setActualEnd(LocalDateTime actualEnd) {
      this.actualEnd = actualEnd;
  }

  public String getEvaluation() {
      return evaluation;
  }

  public void setEvaluation(String evaluation) {
      this.evaluation = evaluation;
  }

  public String getNotes() {
      return notes;
  }

  public void setNotes(String notes) {
      this.notes = notes;
  }
}
