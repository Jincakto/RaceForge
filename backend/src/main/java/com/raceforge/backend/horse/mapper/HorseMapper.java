package com.raceforge.backend.horse.mapper;

import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.entity.Horse;

import org.springframework.stereotype.Component;

@Component
public class HorseMapper {

    public Horse toEntity(HorseCreateRequest request) {
        Horse horse = new Horse();

        horse.setHorseName(request.getHorseName());
        horse.setDateOfBirth(request.getDateOfBirth());
        horse.setGender(request.getGender());
        horse.setBreed(request.getBreed());
        horse.setCoatColor(request.getCoatColor());

        horse.setSire(request.getSire());
        horse.setDam(request.getDam());
        horse.setDamSire(request.getDamSire());

        horse.setWeight(request.getWeight());
        horse.setHeight(request.getHeight());

        horse.setBackground(request.getBackground());
        horse.setDeclaredMedicalHistory(
                request.getDeclaredMedicalHistory());
        horse.setImageUrl(request.getImageUrl());

        return horse;
    }

    public HorseResponse toResponse(Horse horse) {
        HorseResponse response = new HorseResponse();

        response.setHorseId(horse.getHorseId());
        response.setHorseName(horse.getHorseName());
        response.setDateOfBirth(horse.getDateOfBirth());
        response.setGender(horse.getGender());
        response.setBreed(horse.getBreed());
        response.setCoatColor(horse.getCoatColor());

        response.setSire(horse.getSire());
        response.setDam(horse.getDam());
        response.setDamSire(horse.getDamSire());

        response.setWeight(horse.getWeight());
        response.setHeight(horse.getHeight());

        response.setBackground(horse.getBackground());
        response.setDeclaredMedicalHistory(
                horse.getDeclaredMedicalHistory());
        response.setImageUrl(horse.getImageUrl());

        response.setHealthStatus(horse.getHealthStatus());
        response.setTrainingLocked(horse.getTrainingLocked());
        response.setStatus(horse.getStatus());

        return response;
    }

    public void updateEntity(
            HorseUpdateRequest request,
            Horse horse) {

        horse.setHorseName(request.getHorseName());
        horse.setDateOfBirth(request.getDateOfBirth());
        horse.setGender(request.getGender());
        horse.setBreed(request.getBreed());
        horse.setCoatColor(request.getCoatColor());

        horse.setSire(request.getSire());
        horse.setDam(request.getDam());
        horse.setDamSire(request.getDamSire());

        horse.setWeight(request.getWeight());
        horse.setHeight(request.getHeight());

        horse.setBackground(request.getBackground());
        horse.setDeclaredMedicalHistory(
                request.getDeclaredMedicalHistory());
        horse.setImageUrl(request.getImageUrl());
    }
}
