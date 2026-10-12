package com.raceforge.backend.medical.dto;

import java.math.BigDecimal;

public class MedicalVitalSignResponse {

    private Integer vitalSignId;
    private BigDecimal bodyTemperature;
    private Integer restingHeartRate;
    private Integer restingRespiratoryRate;

    public MedicalVitalSignResponse() {
    }

    public Integer getVitalSignId() {
        return vitalSignId;
    }

    public void setVitalSignId(Integer vitalSignId) {
        this.vitalSignId = vitalSignId;
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
}
