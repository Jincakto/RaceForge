package com.raceforge.backend.medical.dto;

import java.time.LocalDateTime;
import java.util.List;

public class MedicalRecordCreateRequest {

    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.Positive
    private Integer profileId;
    private @jakarta.validation.constraints.Pattern(regexp = "(?:OWN|VET|HTR|CM|ADM|GRM)-[0-9]{3}") String veterinarianId;
    private @jakarta.validation.constraints.Pattern(regexp = "MED-[0-9]{3}") String correctionOfId;

    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Pattern(regexp="INITIAL|PERIODIC|FOLLOW_UP")
    private String examType;
    @jakarta.validation.constraints.NotNull
    private LocalDateTime examinedAt;

    private String healthStatus;

    private String diagnosis;
    private String treatment;
    private String medication;
    private String careRecommendation;
    private String notes;

    private MedicalVitalSignRequest vitalSign;

    private List<MedicalClinicalExamRequest> clinicalExams;

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

    public MedicalVitalSignRequest getVitalSign() {
        return vitalSign;
    }

    public void setVitalSign(MedicalVitalSignRequest vitalSign) {
        this.vitalSign = vitalSign;
    }

    public List<MedicalClinicalExamRequest> getClinicalExams() {
        return clinicalExams;
    }

    public void setClinicalExams(
            List<MedicalClinicalExamRequest> clinicalExams) {
        this.clinicalExams = clinicalExams;
    }
}
