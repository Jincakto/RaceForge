package com.raceforge.backend.horse.entity;

import com.raceforge.backend.account.entity.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "Horse")
public class Horse extends com.raceforge.backend.common.id.BusinessEntity {

    @Id
<<<<<<< HEAD
    @Column(name = "horse_id", length = 20, nullable = false, updatable = false)
=======
    @Column(name = "horse_id", length = 20)
>>>>>>> 76de6e5 (luu code)
    private String horseId;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

<<<<<<< HEAD
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "Horse_Trainer",
            joinColumns = @JoinColumn(name = "horse_id"),
            inverseJoinColumns = @JoinColumn(name = "trainer_id")
    )
    private Set<Trainer> trainers = new LinkedHashSet<>();
=======
    @Transient // Deprecated compatibility accessor; authoritative assignment is through Horse_Package.
    private User headTrainer;
>>>>>>> 76de6e5 (luu code)

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

<<<<<<< HEAD
    @Column(name = "height")
    private BigDecimal height;

=======


    @Column(name = "height")
    private BigDecimal height;


>>>>>>> 76de6e5 (luu code)
    @Column(name = "declared_medical_history")
    private String declaredMedicalHistory;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "document_type", length = 50)
    private String documentType;

    @Column(name = "document_url", length = 500)
    private String documentUrl;

    @Column(name = "health_status")
    private String healthStatus;

    @Column(name = "training_locked", nullable = false)
    private Boolean trainingLocked = false;

    @Column(name = "status", nullable = false)
    private String status;

<<<<<<< HEAD
    @OneToOne(mappedBy = "horse", cascade = CascadeType.ALL, orphanRemoval = true,
              fetch = FetchType.LAZY)
    private HorseAdmission admission;

    public HorseAdmission getAdmission() { return admission; }

    public void setAdmission(HorseAdmission admission) {
        this.admission = admission;
        if (admission != null) admission.setHorse(this);
    }

    private HorseAdmission ensureAdmission() {
        if (admission == null) {
            HorseAdmission created = new HorseAdmission();
            setAdmission(created);
        }
        return admission;
    }

    // Convenience accessors used by existing HorseMapper/HorseService.
    // The only persistent admission status is Horse_Admission.status.
    public String getAdmissionStatus() {
        return admission == null ? "NOT_SUBMITTED" : admission.getStatus();
    }

    public void setAdmissionStatus(String status) {
        ensureAdmission().setStatus(status);
    }

    public String getAdmissionNote() {
        return admission == null ? null : admission.getDecisionReason();
    }

    public void setAdmissionNote(String note) {
        ensureAdmission().setDecisionReason(note);
    }


=======


    @OneToOne(mappedBy="horse",cascade=CascadeType.ALL,orphanRemoval=true,fetch=FetchType.LAZY)
    private HorseAdmission admission;
    public HorseAdmission admission(){if(admission==null){admission=new HorseAdmission();admission.setHorse(this);}return admission;}
    public String getAdmissionStatus(){return admission==null?"NOT_SUBMITTED":admission.getStatus();}
    public void setAdmissionStatus(String value){admission().setStatus(value);}
    public String getAdmissionNote(){return admission==null?null:admission.getDecisionReason();}
    public void setAdmissionNote(String value){admission().setDecisionReason(value);}
>>>>>>> 76de6e5 (luu code)
    public String getHorseId() {
        return horseId;
    }

    public void setHorseId(String horseId) {
        this.horseId = horseId;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public Set<Trainer> getTrainers() {
        return trainers;
    }

    public void setTrainers(Set<Trainer> trainers) {
        this.trainers = trainers;
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
    @Column(name="registration_number",length=100)
    private String registrationNumber;
    public String getRegistrationNumber(){return registrationNumber;}
    public void setRegistrationNumber(String value){registrationNumber=value;}

    @Column(name="document_type",length=50)
    private String documentType;
    public String getDocumentType(){return documentType;}
    public void setDocumentType(String value){documentType=value;}

    @org.hibernate.annotations.Nationalized @Column(name="document_url",length=500)
    private String documentUrl;
    public String getDocumentUrl(){return documentUrl;}
    public void setDocumentUrl(String value){documentUrl=value;}

}
