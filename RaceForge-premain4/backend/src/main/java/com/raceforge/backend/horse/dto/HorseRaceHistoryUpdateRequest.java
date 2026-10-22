package com.raceforge.backend.horse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class HorseRaceHistoryUpdateRequest {

    @NotBlank(message = "Race name is required")
    @Size(max = 150, message = "Race name must not exceed 150 characters")
    private String raceName;

    @PastOrPresent(message = "Race date cannot be in the future")
    private LocalDate raceDate;

    @Positive(message = "Distance must be greater than 0")
    private Integer distance;

    @Positive(message = "Finish position must be greater than 0")
    private Integer finishPosition;

    @Size(max = 20, message = "Completion time must not exceed 20 characters")
    private String completionTime;

    @Size(max = 150, message = "Racecourse must not exceed 150 characters")
    private String racecourse;

    @Size(max = 100, message = "Jockey name must not exceed 100 characters")
    private String jockeyName;

    @PositiveOrZero(message = "Prize cannot be negative")
    private BigDecimal prize;

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
}
