package com.raceforge.backend.horse.entity;

import com.raceforge.backend.account.entity.User;
import jakarta.persistence.*;

/**
 * Domain entity for a training staff member. It is NOT a new security role.
 * The linked User must have the existing HEAD_TRAINER role.
 */
@Entity
@Table(name = "Trainer")
public class Trainer {

    @Id
    @Column(name = "trainer_id")
    private String trainerId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    public String getTrainerId() {
        return trainerId;
    }

    public void setTrainerId(String trainerId) {
        this.trainerId = trainerId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
