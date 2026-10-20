package com.raceforge.backend.horse.service;

import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseRaceHistory;
import com.raceforge.backend.horse.mapper.HorseRaceHistoryMapper;
import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class HorseRaceHistoryService {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator;

    private final HorseRaceHistoryRepository raceHistoryRepository;
    private final HorseRepository horseRepository;
    private final HorseRaceHistoryMapper raceHistoryMapper;
    private final AuditLogService auditLogService;

    public HorseRaceHistoryService(
            HorseRaceHistoryRepository raceHistoryRepository,
            HorseRepository horseRepository,
            HorseRaceHistoryMapper raceHistoryMapper,
            AuditLogService auditLogService,
            com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator) {
        this.idAllocator = idAllocator;
        this.raceHistoryRepository = raceHistoryRepository;
        this.horseRepository = horseRepository;
        this.raceHistoryMapper = raceHistoryMapper;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public HorseRaceHistoryResponse createRaceHistory(
            String horseId,
            String actorId,
            HorseRaceHistoryCreateRequest request
    ) {
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Horse not found: " + horseId
                ));

        validateRaceDate(request.getRaceDate(), horse.getDateOfBirth());

        HorseRaceHistory history = raceHistoryMapper.toEntity(request);
        history.setRaceHistoryId(idAllocator.next("RAC"));
        history.setHorse(horse);

        LocalDateTime now = LocalDateTime.now();
        history.setCreatedAt(now);
        history.setUpdatedAt(now);

        HorseRaceHistory saved = raceHistoryRepository.save(history);
        auditLogService.record(
                actorId, horseId, "HORSE_RACE_HISTORY", saved.getRaceHistoryId(),
                "RACE_HISTORY_CREATED", "SUCCESS", null
        );
        return raceHistoryMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<HorseRaceHistoryResponse> getRaceHistoryByHorse(String horseId) {
        if (!horseRepository.existsById(horseId)) {
            throw new ResourceNotFoundException("Horse not found: " + horseId);
        }

        return raceHistoryRepository.findByHorseHorseId(horseId)
                .stream()
                .map(raceHistoryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public HorseRaceHistoryResponse getRaceHistoryById(String raceHistoryId) {
        return raceHistoryMapper.toResponse(findRaceHistoryById(raceHistoryId));
    }

    @Transactional
    public HorseRaceHistoryResponse updateRaceHistory(
            String raceHistoryId,
            String actorId,
            HorseRaceHistoryUpdateRequest request
    ) {
        HorseRaceHistory history = findRaceHistoryById(raceHistoryId);
        validateRaceDate(
                request.getRaceDate(), history.getHorse().getDateOfBirth()
        );

        // A new race result can be recorded even after horse admission is APPROVED.
        raceHistoryMapper.updateEntity(history, request);
        history.setUpdatedAt(LocalDateTime.now());

        HorseRaceHistory saved = raceHistoryRepository.save(history);
        auditLogService.record(
                actorId, saved.getHorse().getHorseId(), "HORSE_RACE_HISTORY",
                saved.getRaceHistoryId(), "RACE_HISTORY_UPDATED", "SUCCESS", null
        );
        return raceHistoryMapper.toResponse(saved);
    }

    @Transactional
    public void deleteRaceHistory(String raceHistoryId, String actorId) {
        HorseRaceHistory history = findRaceHistoryById(raceHistoryId);
        String horseId = history.getHorse().getHorseId();
        raceHistoryRepository.delete(history);
        auditLogService.record(
                actorId, horseId, "HORSE_RACE_HISTORY", raceHistoryId,
                "RACE_HISTORY_DELETED", "SUCCESS", null
        );
    }

    private void validateRaceDate(LocalDate raceDate, LocalDate dateOfBirth) {
        if (raceDate == null) {
            return; // Race date is optional in the existing DTO and database.
        }
        if (raceDate.isAfter(LocalDate.now())) {
            throw new BusinessRuleException("Race date cannot be in the future");
        }
        if (dateOfBirth != null && raceDate.isBefore(dateOfBirth)) {
            throw new BusinessRuleException("Race date cannot precede horse's birth date");
        }
    }

    private HorseRaceHistory findRaceHistoryById(String raceHistoryId) {
        return raceHistoryRepository.findById(raceHistoryId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Race history not found: " + raceHistoryId
                ));
    }
}
