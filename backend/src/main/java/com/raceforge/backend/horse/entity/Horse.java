package com.raceforge.backend.horse.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "Horse")
public class Horse {

    @Id
    @Column(name = "horse_id", length = 20)
    private String horseId;

    /*
    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne
    @JoinColumn(name = "head_trainer_id")
    private User headTrainer;
    */

    @Column(name = "horse_name", nullable = false)
    private String horseName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "gender")
    private String gender;

    @Column(name = "breed")
    private String breed;

    @Column(name = "coat_color")
    private String coatColor;

    @Column(name = "sire")
    private String sire;

    @Column(name = "dam")
    private String dam;

    @Column(name = "dam_sire")
    private String damSire;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "height")
    private Double height;

    @Column(name = "background")
    private String background;

    @Column(name = "declared_medical_history")
    private String declaredMedicalHistory;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "health_status")
    private String healthStatus;

    @Column(name = "training_locked", nullable = false)
    private Boolean trainingLocked = false;

    @Column(name = "status", nullable = false)
    private String status;

    public Horse() {
    }

    public String getHorseId() {
        return horseId;
    }

    public void setHorseId(String horseId) {
        this.horseId = horseId;
    }

    public String getHorseName() {
        return horseName;
    }

    public void setHorseName(String horseName) {
        this.horseName = horseName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getBreed() {
        return breed;
    }

    public void setBreed(String breed) {
        this.breed = breed;
    }

    public String getCoatColor() {
        return coatColor;
    }

    public void setCoatColor(String coatColor) {
        this.coatColor = coatColor;
    }

    public String getSire() {
        return sire;
    }

    public void setSire(String sire) {
        this.sire = sire;
    }

    public String getDam() {
        return dam;
    }

    public void setDam(String dam) {
        this.dam = dam;
    }

    public String getDamSire() {
        return damSire;
    }

    public void setDamSire(String damSire) {
        this.damSire = damSire;
    }

    public Double getWeight() {
        return weight;
    }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public Double getHeight() {
        return height;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public String getBackground() {
        return background;
    }

    public void setBackground(String background) {
        this.background = background;
    }

    public String getDeclaredMedicalHistory() {
        return declaredMedicalHistory;
    }

    public void setDeclaredMedicalHistory(String declaredMedicalHistory) {
        this.declaredMedicalHistory = declaredMedicalHistory;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getHealthStatus() {
        return healthStatus;
    }

    public void setHealthStatus(String healthStatus) {
        this.healthStatus = healthStatus;
    }

    public Boolean getTrainingLocked() {
        return trainingLocked;
    }

    public void setTrainingLocked(Boolean trainingLocked) {
        this.trainingLocked = trainingLocked;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
