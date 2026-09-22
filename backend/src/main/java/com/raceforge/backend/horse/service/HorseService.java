/**
 * Horse services own horse profile business rules. Horse Owner creates profiles and submits them for review.
 * New profiles start as DRAFT or PENDING_APPROVAL. Club Manager approval or rejection belongs in the service layer.
 */
package com.raceforge.backend.horse.service;

import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HorseService {

  @Autowired
  private HorseRepository horseRepository;

  @Autowired
  private HorseMapper horseMapper;

  public HorseResponse createHorse(HorseCreateRequest request) {

      Horse horse = horseMapper.toEntity(request);

      horse.setStatus("INACTIVE");
      horse.setTrainingLocked(false);
      horse.setHealthStatus(null);

      Horse savedHorse = horseRepository.save(horse);

      return horseMapper.toResponse(savedHorse);
  }

  public List<HorseResponse> getAllHorses() {
      return horseRepository.findAll()
              .stream()
              .map(horseMapper::toResponse)
              .toList();
  }

  public HorseResponse getHorseById(Long horseId) {

      Horse horse = horseRepository.findById(horseId)
              .orElseThrow(() -> new RuntimeException("Horse not found"));

      return horseMapper.toResponse(horse);
  }

  public HorseResponse updateHorse(Long horseId, HorseUpdateRequest request) {

      Horse horse = horseRepository.findById(horseId)
              .orElseThrow(() -> new RuntimeException("Horse not found"));

      horseMapper.updateEntity(request, horse);

      Horse updatedHorse = horseRepository.save(horse);

      return horseMapper.toResponse(updatedHorse);
  }

  public void deleteHorse(Long horseId) {

      Horse horse = horseRepository.findById(horseId)
              .orElseThrow(() -> new RuntimeException("Horse not found"));

      horseRepository.delete(horse);
  }
  
}
