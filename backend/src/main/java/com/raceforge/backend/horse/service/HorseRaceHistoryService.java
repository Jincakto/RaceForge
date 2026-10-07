package com.raceforge.backend.horse.service;

import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;

import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseRaceHistory;

import com.raceforge.backend.horse.mapper.HorseRaceHistoryMapper;

import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
import com.raceforge.backend.horse.repository.HorseRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class HorseRaceHistoryService {

    private final HorseRaceHistoryRepository raceHistoryRepository;
    private final HorseRepository horseRepository;
    private final HorseRaceHistoryMapper raceHistoryMapper;

    public HorseRaceHistoryService(
            HorseRaceHistoryRepository raceHistoryRepository,
            HorseRepository horseRepository,
            HorseRaceHistoryMapper raceHistoryMapper) {

        this.raceHistoryRepository = raceHistoryRepository;
        this.horseRepository = horseRepository;
        this.raceHistoryMapper = raceHistoryMapper;
    }

    public HorseRaceHistoryResponse createRaceHistory(
            String horseId,
            HorseRaceHistoryCreateRequest request) {

        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() ->
                        new RuntimeException("Horse not found"));

        HorseRaceHistory history =
                raceHistoryMapper.toEntity(request);

        history.setRaceHistoryId(generateRaceHistoryId());
        history.setHorse(horse);

        LocalDateTime now = LocalDateTime.now();

        history.setCreatedAt(now);
        history.setUpdatedAt(now);

        HorseRaceHistory savedHistory =
                raceHistoryRepository.save(history);

        return raceHistoryMapper.toResponse(savedHistory);
    }

    public List<HorseRaceHistoryResponse> getRaceHistoryByHorse(
            String horseId) {

        if (!horseRepository.existsById(horseId)) {
            throw new RuntimeException("Horse not found");
        }

        return raceHistoryRepository
                .findByHorseHorseId(horseId)
                .stream()
                .map(raceHistoryMapper::toResponse)
                .toList();
    }

    public HorseRaceHistoryResponse getRaceHistoryById(
            String raceHistoryId) {

        HorseRaceHistory history =
                findRaceHistoryById(raceHistoryId);

        return raceHistoryMapper.toResponse(history);
    }

    public HorseRaceHistoryResponse updateRaceHistory(
            String raceHistoryId,
            HorseRaceHistoryUpdateRequest request) {

        HorseRaceHistory history =
                findRaceHistoryById(raceHistoryId);

        raceHistoryMapper.updateEntity(history, request);

        history.setUpdatedAt(LocalDateTime.now());

        HorseRaceHistory updatedHistory =
                raceHistoryRepository.save(history);

        return raceHistoryMapper.toResponse(updatedHistory);
    }

    public void deleteRaceHistory(String raceHistoryId) {

        HorseRaceHistory history =
                findRaceHistoryById(raceHistoryId);

        raceHistoryRepository.delete(history);
    }

    private HorseRaceHistory findRaceHistoryById(
            String raceHistoryId) {

        return raceHistoryRepository
                .findById(raceHistoryId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Race history not found"
                        ));
    }

    private String generateRaceHistoryId() {

        String latestId =
                raceHistoryRepository.findLatestRaceHistoryId();

        if (latestId == null) {
            return "RHI001";
        }

        int currentNumber =
                Integer.parseInt(latestId.substring(3));

        return String.format(
                "RHI%03d",
                currentNumber + 1
        );
    }
}
