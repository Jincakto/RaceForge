package com.raceforge.backend.horse.mapper;

import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import java.util.Comparator;
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
<<<<<<< HEAD
        horse.setHeight(request.getHeight());
        horse.setDeclaredMedicalHistory(request.getDeclaredMedicalHistory());
        horse.setImageUrl(request.getImageUrl());
        horse.setRegistrationNumber(request.getRegistrationNumber());
        horse.setDocumentType(request.getDocumentType());
        horse.setDocumentUrl(request.getDocumentUrl());
=======

        horse.setHeight(request.getHeight());

        horse.setDeclaredMedicalHistory(
                request.getDeclaredMedicalHistory()
        );
        horse.setImageUrl(request.getImageUrl());
        horse.setRegistrationNumber(request.getRegistrationNumber());horse.setDocumentType(request.getDocumentType());horse.setDocumentUrl(request.getDocumentUrl());

>>>>>>> 76de6e5 (luu code)
        return horse;
    }

    public HorseResponse toResponse(Horse horse) {
        HorseResponse response = new HorseResponse();
        response.setHorseId(horse.getHorseId());
        response.setTrainerIds(horse.getTrainers().stream()
                .map(trainer -> trainer.getUser().getUserId())
                .sorted()
                .toList());
        if (horse.getOwner() != null) {
            response.setOwnerId(horse.getOwner().getUserId());
        }
<<<<<<< HEAD
=======


>>>>>>> 76de6e5 (luu code)
        response.setHorseName(horse.getHorseName());
        response.setDateOfBirth(horse.getDateOfBirth());
        response.setGender(horse.getGender());
        response.setBreed(horse.getBreed());
        response.setCoatColor(horse.getCoatColor());
        response.setSire(horse.getSire());
        response.setDam(horse.getDam());
<<<<<<< HEAD
        response.setHeight(horse.getHeight());
        response.setDeclaredMedicalHistory(horse.getDeclaredMedicalHistory());
        response.setImageUrl(horse.getImageUrl());
        response.setRegistrationNumber(horse.getRegistrationNumber());
        response.setDocumentType(horse.getDocumentType());
        response.setDocumentUrl(horse.getDocumentUrl());
=======

        response.setHeight(horse.getHeight());

        response.setDeclaredMedicalHistory(
                horse.getDeclaredMedicalHistory()
        );
        response.setImageUrl(horse.getImageUrl());
        response.setRegistrationNumber(horse.getRegistrationNumber());response.setDocumentType(horse.getDocumentType());response.setDocumentUrl(horse.getDocumentUrl());

>>>>>>> 76de6e5 (luu code)
        response.setHealthStatus(horse.getHealthStatus());
        response.setTrainingLocked(horse.getTrainingLocked());
        response.setStatus(horse.getStatus());
        response.setAdmissionStatus(horse.getAdmissionStatus());
        response.setAdmissionNote(horse.getAdmissionNote());
        return response;
    }

    public void updateEntity(Horse horse, HorseUpdateRequest request) {
        horse.setHorseName(request.getHorseName());
        horse.setDateOfBirth(request.getDateOfBirth());
        horse.setGender(request.getGender());
        horse.setBreed(request.getBreed());
        horse.setCoatColor(request.getCoatColor());
        horse.setSire(request.getSire());
        horse.setDam(request.getDam());
<<<<<<< HEAD
        horse.setHeight(request.getHeight());
        horse.setDeclaredMedicalHistory(request.getDeclaredMedicalHistory());
        horse.setImageUrl(request.getImageUrl());
        horse.setRegistrationNumber(request.getRegistrationNumber());
        horse.setDocumentType(request.getDocumentType());
        horse.setDocumentUrl(request.getDocumentUrl());
=======

        horse.setHeight(request.getHeight());

        horse.setDeclaredMedicalHistory(
                request.getDeclaredMedicalHistory()
        );
        horse.setImageUrl(request.getImageUrl());
        horse.setRegistrationNumber(request.getRegistrationNumber());horse.setDocumentType(request.getDocumentType());horse.setDocumentUrl(request.getDocumentUrl());
>>>>>>> 76de6e5 (luu code)
    }
}
