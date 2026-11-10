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

    // NORMAL, ABNORMAL or CRITICAL. Keep one private Supabase object path per area.
    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "evidence_image_path", length = 255)
    private String evidenceImagePath;

    public String getEvidenceImagePath() { return evidenceImagePath; }

    public void setEvidenceImagePath(String evidenceImagePath) { this.evidenceImagePath = evidenceImagePath; }

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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
