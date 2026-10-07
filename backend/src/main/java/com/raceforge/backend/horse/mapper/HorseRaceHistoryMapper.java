package com.raceforge.backend.horse.mapper;

import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;
import com.raceforge.backend.horse.entity.HorseRaceHistory;

import org.springframework.stereotype.Component;

@Component
public class HorseRaceHistoryMapper {

    public HorseRaceHistory toEntity(
            HorseRaceHistoryCreateRequest request) {

        HorseRaceHistory history = new HorseRaceHistory();

        history.setRaceName(request.getRaceName());
        history.setRaceDate(request.getRaceDate());
        history.setDistance(request.getDistance());
        history.setFinishPosition(request.getFinishPosition());
        history.setCompletionTime(request.getCompletionTime());
        history.setRacecourse(request.getRacecourse());
        history.setJockeyName(request.getJockeyName());
        history.setPrize(request.getPrize());

        return history;
    }

    public HorseRaceHistoryResponse toResponse(
            HorseRaceHistory history) {

        HorseRaceHistoryResponse response =
                new HorseRaceHistoryResponse();

        response.setRaceHistoryId(history.getRaceHistoryId());

        if (history.getHorse() != null) {
            response.setHorseId(
                    history.getHorse().getHorseId()
            );
        }

        response.setRaceName(history.getRaceName());
        response.setRaceDate(history.getRaceDate());
        response.setDistance(history.getDistance());
        response.setFinishPosition(history.getFinishPosition());
        response.setCompletionTime(history.getCompletionTime());
        response.setRacecourse(history.getRacecourse());
        response.setJockeyName(history.getJockeyName());
        response.setPrize(history.getPrize());

        response.setCreatedAt(history.getCreatedAt());
        response.setUpdatedAt(history.getUpdatedAt());

        return response;
    }

    public void updateEntity(
            HorseRaceHistory history,
            HorseRaceHistoryUpdateRequest request) {

        history.setRaceName(request.getRaceName());
        history.setRaceDate(request.getRaceDate());
        history.setDistance(request.getDistance());
        history.setFinishPosition(request.getFinishPosition());
        history.setCompletionTime(request.getCompletionTime());
        history.setRacecourse(request.getRacecourse());
        history.setJockeyName(request.getJockeyName());
        history.setPrize(request.getPrize());
    }
}
