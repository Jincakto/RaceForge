package com.raceforge.backend.horse.service;

import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;

import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseRaceHistory;

import com.raceforge.backend.horse.mapper.HorseRaceHistoryMapper;

import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.common.exception.ResourceNotFoundException;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class HorseRaceHistoryService {

    private final HorseRaceHistoryRepository raceHistoryRepository;
    private final HorseRepository horseRepository;
    private final HorseRaceHistoryMapper raceHistoryMapper;
    private final AuditLogService auditLogService;

    public HorseRaceHistoryService(
            HorseRaceHistoryRepository raceHistoryRepository,
            HorseRepository horseRepository,
            HorseRaceHistoryMapper raceHistoryMapper,
            AuditLogService auditLogService) {

        this.raceHistoryRepository = raceHistoryRepository;
        this.horseRepository = horseRepository;
        this.raceHistoryMapper = raceHistoryMapper;
        this.auditLogService = auditLogService;
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseRaceHistoryResponse createRaceHistory(
            Integer horseId,
            HorseRaceHistoryCreateRequest request) {
        Horse horse = horseRepository.findById(horseId)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                        "Horse not found: " + horseId
                )
        );

        HorseRaceHistory history =
                raceHistoryMapper.toEntity(request);

        
        history.setHorse(horse);

        LocalDateTime now = LocalDateTime.now();

        history.setCreatedAt(now);
        history.setUpdatedAt(now);

        HorseRaceHistory savedHistory =
                raceHistoryRepository.save(history);

        auditLogService.record(null, horseId, "HORSE_RACE_HISTORY", savedHistory.getRaceHistoryId(), "RACE_HISTORY_CREATED", "SUCCESS", null);
        return raceHistoryMapper.toResponse(savedHistory);
    }

    public List<HorseRaceHistoryResponse> getRaceHistoryByHorse(
            Integer horseId) {

        if (!horseRepository.existsById(horseId)) {
            throw new ResourceNotFoundException(
                    "Horse not found: " + horseId
            );
        }

        return raceHistoryRepository
                .findByHorseHorseId(horseId)
                .stream()
                .map(raceHistoryMapper::toResponse)
                .toList();
    }

    public HorseRaceHistoryResponse getRaceHistoryById(
            Integer raceHistoryId) {

        HorseRaceHistory history =
                findRaceHistoryById(raceHistoryId);

        return raceHistoryMapper.toResponse(history);
    }

    @org.springframework.transaction.annotation.Transactional
    public HorseRaceHistoryResponse updateRaceHistory(
            Integer raceHistoryId,
            HorseRaceHistoryUpdateRequest request) {

        HorseRaceHistory history =
                findRaceHistoryById(raceHistoryId);

        raceHistoryMapper.updateEntity(history, request);

        history.setUpdatedAt(LocalDateTime.now());

        HorseRaceHistory updatedHistory =
                raceHistoryRepository.save(history);

        auditLogService.record(null, updatedHistory.getHorse().getHorseId(), "HORSE_RACE_HISTORY", updatedHistory.getRaceHistoryId(), "RACE_HISTORY_UPDATED", "SUCCESS", null);
        return raceHistoryMapper.toResponse(updatedHistory);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteRaceHistory(Integer raceHistoryId) {

        HorseRaceHistory history =
                findRaceHistoryById(raceHistoryId);

        raceHistoryRepository.delete(history);
        auditLogService.record(null, history.getHorse().getHorseId(), "HORSE_RACE_HISTORY", raceHistoryId, "RACE_HISTORY_DELETED", "SUCCESS", null);
    }

    private HorseRaceHistory findRaceHistoryById(Integer raceHistoryId) {

        return raceHistoryRepository
                .findById(raceHistoryId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Race history not found: " + raceHistoryId
                        )
                );
    }


}
