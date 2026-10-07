package com.raceforge.backend.horse.dto;

import java.time.LocalDate;

public class HorseResponse {

    private String horseId;

    private String ownerId;
    private String headTrainerId;

    private String horseName;
    private LocalDate dateOfBirth;
    private String gender;
    private String breed;
    private String coatColor;

    private String sire;
    private String dam;
    private String damSire;

    private Double weight;
    private Double height;

    private String background;
    private String declaredMedicalHistory;
    private String imageUrl;

    private String healthStatus;
    private Boolean trainingLocked;
    private String status;

    // Generate getters/setters
}
