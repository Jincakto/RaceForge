package com.raceforge.backend.horse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class HorseUpdateRequest {

    @NotBlank(message = "Horse name is required")
    @Size(max = 100)
    private String horseName;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Size(max = 20)
    private String gender;

    @Size(max = 100)
    private String breed;

    @NotBlank(message = "Coat color is required")
    @Size(max = 50)
    private String coatColor;

    @Size(max = 100)
    private String sire;

    @Size(max = 100)
    private String dam;

    @Size(max = 100)
    private String damSire;

    @NotNull(message = "Weight is required")
    @Positive(message = "Weight must be greater than 0")
    private Double weight;

    @NotNull(message = "Height is required")
    @Positive(message = "Height must be greater than 0")
    private Double height;

    @Size(max = 1000)
    private String background;

    @Size(max = 1000)
    private String declaredMedicalHistory;

    @Size(max = 500)
    private String imageUrl;

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
}
