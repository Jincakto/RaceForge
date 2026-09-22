package com.raceforge.backend.horse.dto;

import java.time.LocalDate;

public class HorseUpdateRequest {

  private String horseName;
  private LocalDate dateOfBirth;
  private String gender;
  private String breed;
  private String sire;
  private String dam;
  private Double weight;

  public HorseUpdateRequest() {
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
}
