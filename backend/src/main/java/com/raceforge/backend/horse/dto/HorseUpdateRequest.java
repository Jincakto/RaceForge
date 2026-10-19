package com.raceforge.backend.horse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class HorseUpdateRequest {

    @NotBlank(message = "Horse name is required")
    @Size(max = 100)
    private String horseName;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required")
    @Size(max = 20)
    private String gender;

    @NotBlank(message = "Breed is required")
    @Size(max = 100)
    private String breed;

    @NotBlank(message = "Coat color is required")
    @Size(max = 50)
    private String coatColor;

    @Size(max = 100)
    private String sire;

    @Size(max = 100)
    private String dam;


<<<<<<< HEAD
    @Positive(message = "Height must be greater than 0")
    private BigDecimal height;

=======

    @NotNull(message = "Height is required")
    @Positive(message = "Height must be greater than 0")
    private BigDecimal height;


>>>>>>> 76de6e5 (luu code)
    @Size(max = 1000)
    private String declaredMedicalHistory;

    @NotBlank(message = "Image URL is required")
    @Size(max = 500)
    private String imageUrl;

    @Size(max = 100, message = "Registration number must not exceed 100 characters")
    private String registrationNumber;

    @NotBlank(message = "Document type is required")
    @Size(max = 50, message = "Document type must not exceed 50 characters")
    private String documentType;

    @NotBlank(message = "Document URL is required")
    @Size(max = 500, message = "Document URL must not exceed 500 characters")
    private String documentUrl;

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

<<<<<<< HEAD
=======




>>>>>>> 76de6e5 (luu code)
    public BigDecimal getHeight() {
        return height;
    }

    public void setHeight(BigDecimal height) {
        this.height = height;
    }

<<<<<<< HEAD
=======


>>>>>>> 76de6e5 (luu code)
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
<<<<<<< HEAD
    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getDocumentType() {
        return documentType;
    }

    public void setDocumentType(String documentType) {
        this.documentType = documentType;
    }

    public String getDocumentUrl() {
        return documentUrl;
    }

    public void setDocumentUrl(String documentUrl) {
        this.documentUrl = documentUrl;
    }
=======
    @jakarta.validation.constraints.Size(max=100)
    private String registrationNumber;
    public String getRegistrationNumber(){return registrationNumber;}
    public void setRegistrationNumber(String value){registrationNumber=value;}

    @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=50)
    private String documentType;
    public String getDocumentType(){return documentType;}
    public void setDocumentType(String value){documentType=value;}

    @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=500)
    private String documentUrl;
    public String getDocumentUrl(){return documentUrl;}
    public void setDocumentUrl(String value){documentUrl=value;}

>>>>>>> 76de6e5 (luu code)
}
