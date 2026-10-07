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

    
}
