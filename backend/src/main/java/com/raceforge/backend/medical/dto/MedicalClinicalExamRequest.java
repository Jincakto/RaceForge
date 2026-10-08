package com.raceforge.backend.medical.dto;

public class MedicalClinicalExamRequest {

    private String examinationArea;
    private String conditionStatus;
    private String abnormalityType;
    private String severity;
    private String notes;

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
