package com.raceforge.backend.horse.service;

import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.common.exception.ResourceNotFoundException;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HorseService {

    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final HorseMapper horseMapper;
    private final AuditLogService auditLogService;

    public HorseService(
            HorseRepository horseRepository,
            UserRepository userRepository,
            HorseMapper horseMapper,
            AuditLogService auditLogService) {

        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.horseMapper = horseMapper;
        this.auditLogService = auditLogService;
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse createHorse(
            Integer ownerId,
            HorseCreateRequest request) {

        User owner = userRepository.findById(ownerId)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                        "Owner not found: " + ownerId
                )
        );

        Horse horse = horseMapper.toEntity(request);

        

        horse.setOwner(owner);
        horse.setHeadTrainer(null);

        horse.setHealthStatus(null);
        horse.setTrainingLocked(false);
        horse.setStatus("INACTIVE");

        Horse savedHorse = horseRepository.save(horse);
        // TODO: resolve authenticated actor from merged User/Auth module.
        auditLogService.record(null, savedHorse.getHorseId(), "HORSE", savedHorse.getHorseId(), "HORSE_CREATED", "SUCCESS", null);

        return horseMapper.toResponse(savedHorse);
    }

    public List<HorseResponse> getAllHorses() {

        return horseRepository.findAll()
                .stream()
                .map(horseMapper::toResponse)
                .toList();
    }

    public HorseResponse getHorseById(Integer horseId) {

        Horse horse = findHorseById(horseId);

        return horseMapper.toResponse(horse);
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse updateHorse(Integer horseId, HorseUpdateRequest request) {

        Horse horse = findHorseById(horseId);

        horseMapper.updateEntity(horse, request);

        Horse updatedHorse = horseRepository.save(horse);

        auditLogService.record(null, updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_UPDATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse deactivateHorse(Integer horseId) {
    
        Horse horse = findHorseById(horseId);
    
        horse.setStatus("INACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        auditLogService.record(null, updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_DEACTIVATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse activateHorse(Integer horseId) {
    
        Horse horse = findHorseById(horseId);
    
        horse.setStatus("ACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        auditLogService.record(null, updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_ACTIVATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

    private Horse findHorseById(Integer horseId) {
        return horseRepository.findById(horseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Horse not found: " + horseId
                        )
                );
    }


}