package com.raceforge.backend.medical.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "Medical_Vital_Sign")
public class MedicalVitalSign {

    @Id
    @Column(name = "vital_sign_id", length = 20)
    private String vitalSignId;

    @OneToOne
    @JoinColumn(
            name = "medical_record_id",
            nullable = false,
            unique = true
    )
    private MedicalRecord medicalRecord;

    @Column(name = "body_temperature", precision = 4, scale = 1)
    private Double bodyTemperature;

    @Column(name = "resting_heart_rate")
    private Integer restingHeartRate;

    @Column(name = "resting_respiratory_rate")
    private Integer restingRespiratoryRate;

    public MedicalVitalSign() {
    }

    public String getVitalSignId() {
        return vitalSignId;
    }

    public void setVitalSignId(String vitalSignId) {
        this.vitalSignId = vitalSignId;
    }

    public MedicalRecord getMedicalRecord() {
        return medicalRecord;
    }

    public void setMedicalRecord(MedicalRecord medicalRecord) {
        this.medicalRecord = medicalRecord;
    }

    public Double getBodyTemperature() {
        return bodyTemperature;
    }

    public void setBodyTemperature(Double bodyTemperature) {
        this.bodyTemperature = bodyTemperature;
    }

    public Integer getRestingHeartRate() {
        return restingHeartRate;
    }

    public void setRestingHeartRate(Integer restingHeartRate) {
        this.restingHeartRate = restingHeartRate;
    }

    public Integer getRestingRespiratoryRate() {
        return restingRespiratoryRate;
    }

    public void setRestingRespiratoryRate(Integer restingRespiratoryRate) {
        this.restingRespiratoryRate = restingRespiratoryRate;
    }
}
