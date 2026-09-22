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

  
}
