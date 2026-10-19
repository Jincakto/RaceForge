package com.raceforge.backend.horse.dto;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;

public class HorseResponse {

    private String horseId;

    private String ownerId;
<<<<<<< HEAD

    // Assigned HEAD_TRAINER user IDs (not Trainer table primary keys).
    private List<String> trainerIds = List.of();
=======
>>>>>>> 76de6e5 (luu code)

    private String horseName;
    private LocalDate dateOfBirth;
    private String gender;
    private String breed;
    private String coatColor;

    private String sire;
    private String dam;

    private BigDecimal height;

    private String declaredMedicalHistory;
    private String imageUrl;
    private String registrationNumber;
    private String documentType;
    private String documentUrl;

    private String healthStatus;
    private Boolean trainingLocked;
    private String status;
    private String admissionStatus;
    private String admissionNote;
    public String getAdmissionStatus() {
        return admissionStatus;
    }

<<<<<<< HEAD
    public void setAdmissionStatus(String admissionStatus) {
        this.admissionStatus = admissionStatus;
    }

    public String getAdmissionNote() {
        return admissionNote;
    }

    public void setAdmissionNote(String admissionNote) {
        this.admissionNote = admissionNote;
    }

    public List<String> getTrainerIds() {
        return trainerIds;
    }

    public void setTrainerIds(List<String> trainerIds) {
        this.trainerIds = trainerIds;
    }

    public String getHorseId() {
        return horseId;
=======
    public String getHorseId() {
    return horseId;
>>>>>>> 76de6e5 (luu code)
    }
    
    public void setHorseId(String horseId) {
        this.horseId = horseId;
    }
    
    public String getOwnerId() {
        return ownerId;
    }
    
    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }
    
<<<<<<< HEAD
=======
    
    
>>>>>>> 76de6e5 (luu code)
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


    private String documentType;
    public String getDocumentType(){return documentType;}
    public void setDocumentType(String value){documentType=value;}


    private String documentUrl;
    public String getDocumentUrl(){return documentUrl;}
    public void setDocumentUrl(String value){documentUrl=value;}

>>>>>>> 76de6e5 (luu code)
}
