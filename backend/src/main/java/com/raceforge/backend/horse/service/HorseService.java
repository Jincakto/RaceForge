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
import com.raceforge.backend.common.exception.BusinessRuleException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
            String ownerId,
            HorseCreateRequest request) {

        User owner = userRepository.findById(ownerId)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                        "Owner not found: " + ownerId
                )
        );

        Horse horse = horseMapper.toEntity(request);

        horse.setOwner(owner);
<<<<<<< HEAD
        horse.setHorseId(nextHorseId());
        horse.setAdmissionStatus("NOT_SUBMITTED"); // Cascade persists Horse_Admission
=======
        horse.setAdmissionStatus("NOT_SUBMITTED");
>>>>>>> 76de6e5 (luu code)

        horse.setHealthStatus(null);
        horse.setTrainingLocked(false);
        horse.setStatus("INACTIVE");

        Horse savedHorse = horseRepository.save(horse);
        auditLogService.record(ownerId, savedHorse.getHorseId(), "HORSE", savedHorse.getHorseId(), "HORSE_CREATED", "SUCCESS", null);

        return horseMapper.toResponse(savedHorse);
    }

<<<<<<< HEAD
    @Transactional(readOnly = true)
=======
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
>>>>>>> 76de6e5 (luu code)
    public List<HorseResponse> getAllHorses() {
        return searchHorses(null);
    }

<<<<<<< HEAD
    @Transactional(readOnly = true)
    public List<HorseResponse> searchHorses(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return horseRepository.findAll().stream().map(horseMapper::toResponse).toList();
        }

        String value = keyword.trim();
        List<Horse> matches = new java.util.ArrayList<>(
                horseRepository.searchByNameOrRegistrationNumber(value));

        // The primary key is already the external HOR-xxx identifier.
        horseRepository.findById(value.toUpperCase(java.util.Locale.ROOT))
                .ifPresent(horse -> {
                    if (matches.stream().noneMatch(h -> h.getHorseId().equals(horse.getHorseId()))) {
                        matches.add(horse);
                    }
                });
        return matches.stream().map(horseMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
=======
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
>>>>>>> 76de6e5 (luu code)
    public HorseResponse getHorseById(String horseId) {

        Horse horse = findHorseById(horseId);

        return horseMapper.toResponse(horse);
    }

    @org.springframework.transaction.annotation.Transactional
<<<<<<< HEAD
    public HorseResponse updateHorse(String horseId, String actorId, HorseUpdateRequest request) {

        Horse horse = findHorseById(horseId);

        if ("APPROVED".equals(horse.getAdmissionStatus())) {
            throw new BusinessRuleException("Approved horse registration details cannot be modified");
        }
=======
    public HorseResponse updateHorse(String horseId, HorseUpdateRequest request) {

        Horse horse = findHorseById(horseId);

        if("APPROVED".equals(horse.getAdmissionStatus()))throw new com.raceforge.backend.common.exception.BusinessRuleException("Admitted horse identity details cannot be edited");
>>>>>>> 76de6e5 (luu code)
        horseMapper.updateEntity(horse, request);

        Horse updatedHorse = horseRepository.save(horse);

        auditLogService.record(actorId, updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_UPDATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

    @org.springframework.transaction.annotation.Transactional
<<<<<<< HEAD
    public HorseResponse deactivateHorse(String horseId, String actorId) {
=======
    public HorseResponse deactivateHorse(String horseId) {
>>>>>>> 76de6e5 (luu code)
    
        Horse horse = findHorseById(horseId);
    
        horse.setStatus("INACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        auditLogService.record(actorId, updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_DEACTIVATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

    @org.springframework.transaction.annotation.Transactional
<<<<<<< HEAD
    public HorseResponse activateHorse(String horseId, String actorId) {
=======
    public HorseResponse activateHorse(String horseId) {
>>>>>>> 76de6e5 (luu code)
    
        Horse horse = findHorseById(horseId);
    
        horse.setStatus("ACTIVE");
    
        Horse updatedHorse = horseRepository.save(horse);
    
        auditLogService.record(actorId, updatedHorse.getHorseId(), "HORSE", updatedHorse.getHorseId(), "HORSE_ACTIVATED", "SUCCESS", null);
        return horseMapper.toResponse(updatedHorse);
    }

<<<<<<< HEAD
    /**
     * Horse IDs continue to use dbo.Horse_Id_Sequence from the merged schema.
     * Its output must fit the DB CHECK constraint HOR-001..HOR-999.
     */
    private String nextHorseId() {
        long number = horseRepository.nextHorseNumber();
        if (number < 1 || number > 999) {
            throw new BusinessRuleException("Horse ID sequence exceeds HOR-999 capacity");
        }
        return "HOR-" + String.format(java.util.Locale.ROOT, "%03d", number);
    }

=======
>>>>>>> 76de6e5 (luu code)
    private Horse findHorseById(String horseId) {
        return horseRepository.findById(horseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Horse not found: " + horseId
                        )
                );
    }


}
