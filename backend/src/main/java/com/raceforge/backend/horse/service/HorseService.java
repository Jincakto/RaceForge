package com.raceforge.backend.horse.service;

import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.user.entity.User;
import com.raceforge.backend.user.repository.UserRepository;
import com.raceforge.backend.common.exception.ResourceNotFoundException;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HorseService {

    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final HorseMapper horseMapper;

    public HorseService(
            HorseRepository horseRepository,
            UserRepository userRepository,
            HorseMapper horseMapper) {

        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.horseMapper = horseMapper;
    }

    public HorseResponse createHorse(
            String ownerId,
            HorseCreateRequest request) {

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() ->
                        new RuntimeException("Owner not found"));

        Horse horse = horseMapper.toEntity(request);

        horse.setHorseId(generateHorseId());

        horse.setOwner(owner);
        horse.setHeadTrainer(null);

        horse.setHealthStatus(null);
        horse.setTrainingLocked(false);
        horse.setStatus("INACTIVE");

        Horse savedHorse = horseRepository.save(horse);

        return horseMapper.toResponse(savedHorse);
    }

    public List<HorseResponse> getAllHorses() {

        return horseRepository.findAll()
                .stream()
                .map(horseMapper::toResponse)
                .toList();
    }

    public HorseResponse getHorseById(String horseId) {

        Horse horse = findHorseById(horseId);

        return horseMapper.toResponse(horse);
    }

    public HorseResponse updateHorse(String horseId, HorseUpdateRequest request) {

        Horse horse = findHorseById(horseId);

        horseMapper.updateEntity(horse, request);

        Horse updatedHorse = horseRepository.save(horse);

        return horseMapper.toResponse(updatedHorse);
    }

    public HorseResponse deactivateHorse(String horseId) {
    
        Horse horse = findHorseById(horseId);
    
        horse.setStatus("INACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        return horseMapper.toResponse(updatedHorse);
    }

    public HorseResponse activateHorse(String horseId) {
    
        Horse horse = findHorseById(horseId);
    
        horse.setStatus("ACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        return horseMapper.toResponse(updatedHorse);
    }

    private Horse findHorseById(String horseId) {
        return horseRepository.findById(horseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Horse not found: " + horseId
                        )
                );
    }

    private String generateHorseId() {
        
        String latestId = horseRepository.findLatestHorseId();
        
        if (latestId == null) {
            return "HOR001";
        }

        int currentNumber = Integer.parseInt(latestId.substring(3));

        int nextNumber = currentNumber + 1;

        return String.format("HOR%03d", nextNumber);
    }
}
