/**
 * Mappers for converting between horse entities and DTOs.
 */
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
      horse.setSire(request.getSire());
      horse.setDam(request.getDam());
      horse.setWeight(request.getWeight());

      return horse;
  }

  public HorseResponse toResponse(Horse horse) {
      HorseResponse response = new HorseResponse();

      response.setHorseId(horse.getHorseId());
      response.setHorseName(horse.getHorseName());
      response.setDateOfBirth(horse.getDateOfBirth());
      response.setGender(horse.getGender());
      response.setBreed(horse.getBreed());
      response.setSire(horse.getSire());
      response.setDam(horse.getDam());
      response.setWeight(horse.getWeight());

      response.setHealthStatus(horse.getHealthStatus());
      response.setTrainingLocked(horse.getTrainingLocked());
      response.setStatus(horse.getStatus());

      return response;
  }

  public void updateEntity(HorseUpdateRequest request, Horse horse) {
      horse.setHorseName(request.getHorseName());
      horse.setDateOfBirth(request.getDateOfBirth());
      horse.setGender(request.getGender());
      horse.setBreed(request.getBreed());
      horse.setSire(request.getSire());
      horse.setDam(request.getDam());
      horse.setWeight(request.getWeight());
  }
  
}
