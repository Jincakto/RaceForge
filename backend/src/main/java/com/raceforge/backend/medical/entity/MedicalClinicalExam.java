package com.raceforge.backend.medical.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "Medical_Clinical_Exam")
public class MedicalClinicalExam {

    @Id
    @Column(name = "clinical_exam_id", length = 20)
    private String clinicalExamId;

    @ManyToOne
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;

    @Column(name = "examination_area", nullable = false, length = 50)
    private String examinationArea;

    @Column(name = "condition_status", nullable = false, length = 20)
    private String conditionStatus;

    @Column(name = "abnormality_type", length = 100)
    private String abnormalityType;

    @Column(name = "severity", length = 20)
    private String severity;

    @Column(name = "notes", length = 500)
    private String notes;

    public MedicalClinicalExam() {
    }

    public String getClinicalExamId() {
        return clinicalExamId;
    }

    public void setClinicalExamId(String clinicalExamId) {
        this.clinicalExamId = clinicalExamId;
    }

    public MedicalRecord getMedicalRecord() {
        return medicalRecord;
    }

    public void setMedicalRecord(MedicalRecord medicalRecord) {
        this.medicalRecord = medicalRecord;
    }

    public String getExaminationArea() {
        return examinationArea;
    }

    public void setExaminationArea(String examinationArea) {
        this.examinationArea = examinationArea;
    }

    public String getConditionStatus() {
        return conditionStatus;
    }

    public void setConditionStatus(String conditionStatus) {
        this.conditionStatus = conditionStatus;
    }

    public String getAbnormalityType() {
        return abnormalityType;
    }

    public void setAbnormalityType(String abnormalityType) {
        this.abnormalityType = abnormalityType;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
