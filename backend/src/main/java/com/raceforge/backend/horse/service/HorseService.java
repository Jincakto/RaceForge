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

    private final com.raceforge.backend.horse.admission.AdmissionService admission;
    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final HorseMapper horseMapper;
    private final AuditLogService auditLogService;

    public HorseService(
            com.raceforge.backend.horse.admission.AdmissionService admission,
            HorseRepository horseRepository,
            UserRepository userRepository,
            HorseMapper horseMapper,
            AuditLogService auditLogService) {

        this.admission = admission;
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.horseMapper = horseMapper;
        this.auditLogService = auditLogService;
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse createHorse(
            String ownerId,
            HorseCreateRequest request) {

        admission.requireRole("HORSE_OWNER");
        ownerId = admission.actor().userId();
        User owner = userRepository.findById(ownerId)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                        "Authenticated owner not found"
                )
        );

        Horse horse = horseMapper.toEntity(request);

        

        horse.setOwner(owner);
        horse.setHeadTrainer(null);

        horse.setHealthStatus(null);
        horse.setTrainingLocked(false);
        horse.setStatus("INACTIVE");

        Horse savedHorse = horseRepository.save(horse);
        admission.register(savedHorse);
        auditLogService.record(admission.actor().userId(), savedHorse.getHorseId(), "HORSE", savedHorse.getHorseId(), "HORSE_CREATED", "SUCCESS", null);

        return horseMapper.toResponse(savedHorse);
    }

    public List<HorseResponse> getAllHorses() {

        return horseRepository.findAll()
                .stream().filter(admission::canRead)
                .map(horseMapper::toResponse)
                .toList();
    }

    public HorseResponse getHorseById(String horseId) {

        Horse horse = findHorseById(horseId);
        admission.checkRead(horse);

        return horseMapper.toResponse(horse);
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse updateHorse(String horseId, HorseUpdateRequest request) {

        Horse horse = horseRepository.findByIdForUpdate(horseId).orElseThrow(() -> new ResourceNotFoundException("Horse not found"));

        admission.requireEditable(horse);
        horseMapper.updateEntity(horse, request);

        Horse updatedHorse = horseRepository.save(horse);

        auditLogService.record(admission.actor().userId(), updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_UPDATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse deactivateHorse(String horseId) {
    
        Horse horse = findHorseById(horseId);
    
        admission.requireRole("CLUB_MANAGER");
        horse.setStatus("INACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        auditLogService.record(admission.actor().userId(), updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_DEACTIVATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseResponse activateHorse(String horseId) {
    
        Horse horse = findHorseById(horseId);
    
        admission.requireRole("CLUB_MANAGER");
        admission.requireCompleted(horseId);
        horse.setStatus("ACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        auditLogService.record(admission.actor().userId(), updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_ACTIVATED", "SUCCESS", null);
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


}
