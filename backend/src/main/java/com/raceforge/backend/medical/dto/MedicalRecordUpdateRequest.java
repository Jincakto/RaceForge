package com.raceforge.backend.medical.dto;

import java.time.LocalDateTime;
import java.util.List;

public class MedicalRecordUpdateRequest {

    private LocalDateTime examinedAt;
    private String healthStatus;
    private String finalConclusion;
    private String overrideReason;
    private String monitoringNote;
    private String trainingLockReason;
    private String diagnosis;
    private String treatment;
    private String medication;
    private String careRecommendation;
    private String notes;
    @jakarta.validation.Valid
    private MedicalVitalSignRequest vitalSign;
    private List<MedicalClinicalExamRequest> clinicalExams;

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

    public MedicalVitalSignRequest getVitalSign() {
        return vitalSign;
    }

    public void setVitalSign(MedicalVitalSignRequest vitalSign) {
        this.vitalSign = vitalSign;
    }

    public List<MedicalClinicalExamRequest> getClinicalExams() {
        return clinicalExams;
    }

    public void setClinicalExams(List<MedicalClinicalExamRequest> clinicalExams) {
        this.clinicalExams = clinicalExams;
    }
<<<<<<< HEAD
=======
  

    private Boolean trainingEligible;
    private java.math.BigDecimal idealWeight;
    private Integer bodyConditionScore;
    public Boolean getTrainingEligible(){return trainingEligible;}public void setTrainingEligible(Boolean value){trainingEligible=value;}
    public java.math.BigDecimal getIdealWeight(){return idealWeight;}public void setIdealWeight(java.math.BigDecimal value){idealWeight=value;}
    public Integer getBodyConditionScore(){return bodyConditionScore;}public void setBodyConditionScore(Integer value){bodyConditionScore=value;}


    @jakarta.validation.constraints.Size(max=1000)
    private String eligibilityReason;
    public String getEligibilityReason(){return eligibilityReason;}
    public void setEligibilityReason(String value){eligibilityReason=value;}


    @jakarta.validation.constraints.Size(max=30)
    private String suggestedConclusion;
    public String getSuggestedConclusion(){return suggestedConclusion;}
    public void setSuggestedConclusion(String value){suggestedConclusion=value;}


    @jakarta.validation.constraints.Size(max=30)
    private String finalConclusion;
    public String getFinalConclusion(){return finalConclusion;}
    public void setFinalConclusion(String value){finalConclusion=value;}


    @jakarta.validation.constraints.Size(max=1000)
    private String overrideReason;
    public String getOverrideReason(){return overrideReason;}
    public void setOverrideReason(String value){overrideReason=value;}


    @jakarta.validation.constraints.Size(max=1000)
    private String monitoringNote;
    public String getMonitoringNote(){return monitoringNote;}
    public void setMonitoringNote(String value){monitoringNote=value;}


    @jakarta.validation.constraints.Size(max=1000)
    private String trainingLockReason;
    public String getTrainingLockReason(){return trainingLockReason;}
    public void setTrainingLockReason(String value){trainingLockReason=value;}

>>>>>>> 76de6e5 (luu code)
}
