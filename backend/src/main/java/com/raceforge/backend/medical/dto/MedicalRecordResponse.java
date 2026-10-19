package com.raceforge.backend.medical.dto;

import java.time.LocalDateTime;
import java.util.List;

public class MedicalRecordResponse {

    private String medicalRecordId;

    private Integer profileId;
    private String veterinarianId;
    private String correctionOfId;

    private String examType;
    private LocalDateTime examinedAt;

    private String healthStatus;

    // Derived after confirmation; null while the record is a draft.
    private Boolean trainingEligible;
    private String eligibilityReason;

    private String suggestedConclusion;
    private String finalConclusion;
    private String overrideReason;
    private String monitoringNote;
    private String trainingLockReason;


    private String diagnosis;
    private String treatment;
    private String medication;
    private String careRecommendation;
    private String notes;

    private String systemNote;
    private String trainingNote;

    private String status;
    private LocalDateTime confirmedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private MedicalVitalSignResponse vitalSign;

    private List<MedicalClinicalExamResponse> clinicalExams;

    public MedicalRecordResponse() {
    }

    public String getMedicalRecordId() {
        return medicalRecordId;
    }

    public void setMedicalRecordId(String medicalRecordId) {
        this.medicalRecordId = medicalRecordId;
    }

    public Integer getProfileId() {
        return profileId;
    }

    public void setProfileId(Integer profileId) {
        this.profileId = profileId;
    }

    public String getVeterinarianId() {
        return veterinarianId;
    }

    public void setVeterinarianId(String veterinarianId) {
        this.veterinarianId = veterinarianId;
    }

    public String getCorrectionOfId() {
        return correctionOfId;
    }

    public void setCorrectionOfId(String correctionOfId) {
        this.correctionOfId = correctionOfId;
    }

    public String getExamType() {
        return examType;
    }

    public void setExamType(String examType) {
        this.examType = examType;
    }

    public LocalDateTime getExaminedAt() {
        return examinedAt;
    }

    public void setExaminedAt(LocalDateTime examinedAt) {
        this.examinedAt = examinedAt;
    }

    public String getHealthStatus() {
        return healthStatus;
    }

    public void setHealthStatus(String healthStatus) {
        this.healthStatus = healthStatus;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis) {
        this.diagnosis = diagnosis;
    }

    public String getTreatment() {
        return treatment;
    }

    public void setTreatment(String treatment) {
        this.treatment = treatment;
    }

    public String getMedication() {
        return medication;
    }

    public void setMedication(String medication) {
        this.medication = medication;
    }

    public String getCareRecommendation() {
        return careRecommendation;
    }

    public void setCareRecommendation(String careRecommendation) {
        this.careRecommendation = careRecommendation;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getSystemNote() {
        return systemNote;
    }

    public void setSystemNote(String systemNote) {
        this.systemNote = systemNote;
    }

    public String getTrainingNote() {
        return trainingNote;
    }

    public void setTrainingNote(String trainingNote) {
        this.trainingNote = trainingNote;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(LocalDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public MedicalVitalSignResponse getVitalSign() {
        return vitalSign;
    }

    public void setVitalSign(MedicalVitalSignResponse vitalSign) {
        this.vitalSign = vitalSign;
    }

    public List<MedicalClinicalExamResponse> getClinicalExams() {
        return clinicalExams;
    }

    public void setClinicalExams(List<MedicalClinicalExamResponse> clinicalExams) {
        this.clinicalExams = clinicalExams;
    }

    public Boolean getTrainingEligible() {
        return trainingEligible;
    }

    public void setTrainingEligible(Boolean trainingEligible) {
        this.trainingEligible = trainingEligible;
    }

    public String getEligibilityReason() {
        return eligibilityReason;
    }

    public void setEligibilityReason(String eligibilityReason) {
        this.eligibilityReason = eligibilityReason;
    }

    public String getSuggestedConclusion() {
        return suggestedConclusion;
    }

    public void setSuggestedConclusion(String suggestedConclusion) {
        this.suggestedConclusion = suggestedConclusion;
    }

    public String getFinalConclusion() {
        return finalConclusion;
    }

    public void setFinalConclusion(String finalConclusion) {
        this.finalConclusion = finalConclusion;
    }

    public String getOverrideReason() {
        return overrideReason;
    }

    public void setOverrideReason(String overrideReason) {
        this.overrideReason = overrideReason;
    }

    public String getMonitoringNote() {
        return monitoringNote;
    }

    public void setMonitoringNote(String monitoringNote) {
        this.monitoringNote = monitoringNote;
    }

    public String getTrainingLockReason() {
        return trainingLockReason;
    }

    public void setTrainingLockReason(String trainingLockReason) {
        this.trainingLockReason = trainingLockReason;
    }


}
