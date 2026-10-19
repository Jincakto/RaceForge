package com.raceforge.backend.medical.dto;

import java.time.LocalDateTime;
import java.util.List;

public class MedicalRecordResponse {

    private @jakarta.validation.constraints.Pattern(regexp = "MED-[0-9]{3}") String medicalRecordId;

    private Integer profileId;
    private @jakarta.validation.constraints.Pattern(regexp = "(?:OWN|VET|HTR|CM|ADM|GRM)-[0-9]{3}") String veterinarianId;
    private @jakarta.validation.constraints.Pattern(regexp = "MED-[0-9]{3}") String correctionOfId;

    private String examType;
    private LocalDateTime examinedAt;

    private String healthStatus;

    private String diagnosis;
    private String treatment;
    private String medication;
    private String careRecommendation;
    private String notes;

    private String systemNote;
    private String trainingNote;

    private Boolean trainingEligible;

    private String eligibilityReason;
    public Boolean getTrainingEligible() { return trainingEligible; }
    public void setTrainingEligible(Boolean value) { trainingEligible=value; }
    public String getEligibilityReason() { return eligibilityReason; }
    public void setEligibilityReason(String value) { eligibilityReason=value; }

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

    public void setMedicalRecordId(@jakarta.validation.constraints.Pattern(regexp = "MED-[0-9]{3}") String medicalRecordId) {
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

    public void setVeterinarianId(@jakarta.validation.constraints.Pattern(regexp = "(?:OWN|VET|HTR|CM|ADM|GRM)-[0-9]{3}") String veterinarianId) {
        this.veterinarianId = veterinarianId;
    }

    public String getCorrectionOfId() {
        return correctionOfId;
    }

    public void setCorrectionOfId(@jakarta.validation.constraints.Pattern(regexp = "MED-[0-9]{3}") String correctionOfId) {
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
}
