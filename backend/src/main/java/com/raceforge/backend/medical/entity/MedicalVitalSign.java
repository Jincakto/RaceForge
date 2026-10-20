package com.raceforge.backend.medical.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "Medical_Vital_Sign")
public class MedicalVitalSign extends com.raceforge.backend.common.id.BusinessEntity {

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
    private BigDecimal bodyTemperature;

    @Column(name = "resting_heart_rate")
    private Integer restingHeartRate;

    @Column(name = "resting_respiratory_rate")
    private Integer restingRespiratoryRate;

    // Optional actual measured weight at this examination (kilograms).
    @Column(name = "weight", precision = 7, scale = 2)
    private BigDecimal weight;

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

    public BigDecimal getBodyTemperature() {
        return bodyTemperature;
    }

    public void setBodyTemperature(BigDecimal bodyTemperature) {
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
<<<<<<< HEAD

    public BigDecimal getWeight() {
        return weight;
    }

    public void setWeight(BigDecimal weight) {
        this.weight = weight;
    }
=======
    @Column(name="weight",precision=7,scale=2)
    private java.math.BigDecimal weight;
    public java.math.BigDecimal getWeight(){return weight;}
    public void setWeight(java.math.BigDecimal value){weight=value;}

>>>>>>> 76de6e5 (luu code)
}
