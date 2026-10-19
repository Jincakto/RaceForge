package com.raceforge.backend.medical.dto;

import java.math.BigDecimal;

public class MedicalVitalSignRequest {

    private BigDecimal bodyTemperature;
    private Integer restingHeartRate;
    private Integer restingRespiratoryRate;
    private BigDecimal weight;

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
    @jakarta.validation.constraints.DecimalMin("0.01") @jakarta.validation.constraints.Digits(integer=5,fraction=2)
    private java.math.BigDecimal weight;
    public java.math.BigDecimal getWeight(){return weight;}
    public void setWeight(java.math.BigDecimal value){weight=value;}
>>>>>>> 76de6e5 (luu code)

}
