package com.raceforge.backend.horse.dto;

import java.time.LocalDate;

public class HorseResponse {

  private Long horseId;
  private String horseName;
  private LocalDate dateOfBirth;
  private String gender;
  private String breed;
  private String sire;
  private String dam;
  private Double weight;

  private String healthStatus;
  private Boolean trainingLocked;
  private String status;

  public HorseResponse() {
  }

  
}
