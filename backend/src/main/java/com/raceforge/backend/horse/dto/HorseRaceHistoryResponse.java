package com.raceforge.backend.horse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class HorseRaceHistoryResponse {

    private String raceHistoryId;
    private String horseId;

    private String raceName;
    private LocalDate raceDate;
    private Integer distance;
    private Integer finishPosition;
    private String completionTime;
    private String racecourse;
    private String jockeyName;
    private BigDecimal prize;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;


    public String getRaceHistoryId() {
        return raceHistoryId;
    }

    public void setRaceHistoryId(String raceHistoryId) {
        this.raceHistoryId = raceHistoryId;
    }

    public String getHorseId() {
        return horseId;
    }

    public void setHorseId(String horseId) {
        this.horseId = horseId;
    }

    public String getRaceName() {
        return raceName;
    }

    public void setRaceName(String raceName) {
        this.raceName = raceName;
    }

    public LocalDate getRaceDate() {
        return raceDate;
    }

    public void setRaceDate(LocalDate raceDate) {
        this.raceDate = raceDate;
    }

    public Integer getDistance() {
        return distance;
    }

    public void setDistance(Integer distance) {
        this.distance = distance;
    }

    public Integer getFinishPosition() {
        return finishPosition;
    }

    public void setFinishPosition(Integer finishPosition) {
        this.finishPosition = finishPosition;
    }

    public String getCompletionTime() {
        return completionTime;
    }

    public void setCompletionTime(String completionTime) {
        this.completionTime = completionTime;
    }

    public String getRacecourse() {
        return racecourse;
    }

    public void setRacecourse(String racecourse) {
        this.racecourse = racecourse;
    }

    public String getJockeyName() {
        return jockeyName;
    }

    public void setJockeyName(String jockeyName) {
        this.jockeyName = jockeyName;
    }

    public BigDecimal getPrize() {
        return prize;
    }

    public void setPrize(BigDecimal prize) {
        this.prize = prize;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
