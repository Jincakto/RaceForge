package com.raceforge.backend.training.dto;

import java.time.LocalDateTime;

public class TrainingSessionResponse {

  private Integer sessionId;
  private Integer planId;
  private Integer horseId;
  private LocalDateTime scheduledStart;
  private LocalDateTime scheduledEnd;
  private Double distance;
  private String intensity;
  private String surface;
  private String status;
  private LocalDateTime actualStart;
  private LocalDateTime actualEnd;
  private String evaluation;
  private String notes;

  public TrainingSessionResponse() {
  }

  public Integer getSessionId() {
      return sessionId;
  }

  public void setSessionId(Integer sessionId) {
      this.sessionId = sessionId;
  }

  public Integer getPlanId() {
      return planId;
  }

  public void setPlanId(Integer planId) {
      this.planId = planId;
  }

  public Integer getHorseId() {
      return horseId;
  }

  public void setHorseId(Integer horseId) {
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

  public Double getDistance() {
      return distance;
  }

  public void setDistance(Double distance) {
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
