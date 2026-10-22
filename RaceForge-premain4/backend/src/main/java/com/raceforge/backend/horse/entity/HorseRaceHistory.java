package com.raceforge.backend.horse.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "HORSE_RACE_HISTORY")
public class HorseRaceHistory {

    @Id
    @Column(name = "race_history_id", length = 20)
    private String raceHistoryId;

    @ManyToOne
    @JoinColumn(name = "horse_id", nullable = false)
    private Horse horse;

    @Column(name = "race_name", nullable = false)
    private String raceName;

    @Column(name = "race_date")
    private LocalDate raceDate;

    @Column(name = "distance")
    private Integer distance;

    @Column(name = "finish_position")
    private Integer finishPosition;

    @Column(name = "completion_time")
    private String completionTime;

    @Column(name = "racecourse")
    private String racecourse;

    @Column(name = "jockey_name")
    private String jockeyName;

    @Column(name = "prize")
    private BigDecimal prize;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getRaceHistoryId() {
        return raceHistoryId;
    }

    public void setRaceHistoryId(String raceHistoryId) {
        this.raceHistoryId = raceHistoryId;
    }

    public Horse getHorse() {
        return horse;
    }

    public void setHorse(Horse horse) {
        this.horse = horse;
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
