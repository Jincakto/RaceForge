/**
 * JPA entities for Horse, HorseOwnership, Stall, and StallAssignment data.
 */
package com.raceforge.backend.horse.entity;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "horse")
public class Horse{
  
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "horse_id")
  private Long horseId;

  @Column(name = "horse_name", nullable = false)
  private String horseName;

  @Column(name = "date_of_birth")
  private LocalDate dateOfBirth;

  @Column(name = "gender")
  private String gender;

  @Column(name = "breed")
  private String breed;

  @Column(name = "sire")
  private String sire;

  @Column(name = "dam")
  private String dam;

  @Column(name = "weight")
  private Double weight;

  @Column(name = "health_status")
  private String healthStatus;

  @Column(name = "training_locked", nullable = false)
  private Boolean trainingLocked = false;

  @Column(name = "status", nullable = false)
  private String status;

  public Horse() {
  }

  public Long getHorseId() {
      return horseId;
  }

  // @ManyToOne
  // @JoinColumn(name = "club_id")
  // private Club club;

  // @ManyToOne
  // @JoinColumn(name = "owner_id")
  // private User owner;

  // @ManyToOne
  // @JoinColumn(name = "head_trainer_id")
  // private User headTrainer;
  
  public void setHorseId(Long horseId) {
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

  public Double getWeight() {
      return weight;
  }

  public void setWeight(Double weight) {
      this.weight = weight;
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
