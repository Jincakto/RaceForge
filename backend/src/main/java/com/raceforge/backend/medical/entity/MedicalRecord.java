package com.raceforge.backend.medical.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.raceforge.backend.account.entity.User;

@Entity
@Table(name = "Medical_Record")
public class MedicalRecord {

    @Id
    @Column(name = "medical_record_id", length = 20)
    private String medicalRecordId;

    @ManyToOne
    @JoinColumn(name = "profile_id", nullable = false)
    private HealthProfile healthProfile;

    @ManyToOne
    @JoinColumn(name = "veterinarian_id", nullable = false)
    private User veterinarian;

    @ManyToOne
    @JoinColumn(name = "correction_of_id")
    private MedicalRecord correctionOf;

    @Column(name = "exam_type", nullable = false, length = 30)
    private String examType;

    @Column(name = "examined_at", nullable = false)
    private LocalDateTime examinedAt;

    @Column(name = "health_status", length = 30)
    private String healthStatus;

    @Column(name = "diagnosis", length = 1000)
    private String diagnosis;

    @Column(name = "treatment", length = 1000)
    private String treatment;

    @Column(name = "medication", length = 1000)
    private String medication;

    @Column(name = "care_recommendation", length = 1000)
    private String careRecommendation;

    @Column(name = "notes", length = 1000)
    private String notes;

    // Nội dung hệ thống sinh ra
    @Column(name = "system_note", length = 1000)
    private String systemNote;

    @Column(name = "training_note", length = 1000)
    private String trainingNote;
    
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public MedicalRecord() {
    }

    @PrePersist
    protected void onCreate() {
        if (examinedAt == null) {
            examinedAt = LocalDateTime.now();
        }

        if (status == null) {
            status = "DRAFT";
        }

        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getMedicalRecordId() {
        return medicalRecordId;
    }

    public void setMedicalRecordId(String medicalRecordId) {
        this.medicalRecordId = medicalRecordId;
    }

    public HealthProfile getHealthProfile() {
        return healthProfile;
    }

    public void setHealthProfile(HealthProfile healthProfile) {
        this.healthProfile = healthProfile;
    }

    public User getVeterinarian() {
        return veterinarian;
    }

    public void setVeterinarian(User veterinarian) {
        this.veterinarian = veterinarian;
    }

    public MedicalRecord getCorrectionOf() {
        return correctionOf;
    }

    public void setCorrectionOf(MedicalRecord correctionOf) {
        this.correctionOf = correctionOf;
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
}
