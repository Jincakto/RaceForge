package com.raceforge.backend.training.service;

import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Clock;
import java.time.LocalDate;

/** Enable a daily sweep for package expiration without changing application config. */
@Configuration
@EnableScheduling
public class TrainingPackageExpiryScheduler {
    private static final Logger log = LoggerFactory.getLogger(TrainingPackageExpiryScheduler.class);

    private final HorsePackageRepository horsePackages;
    private final TrainingPackageExpirationService expiration;
    private final Clock trainingClock;

    public TrainingPackageExpiryScheduler(HorsePackageRepository horsePackages,
                                         TrainingPackageExpirationService expiration,
                                         @Qualifier("trainingClock") Clock trainingClock) {
        this.horsePackages = horsePackages;
        this.expiration = expiration;
        this.trainingClock = trainingClock;
    }

    /** Runs daily at 00:05 in the training timezone. */
    @Scheduled(cron = "${raceforge.training.package-expiry-cron:0 5 0 * * *}", zone = "Asia/Bangkok")
    public void expireOverduePackages() {
        LocalDate today = LocalDate.now(trainingClock);
        for (String id : horsePackages.findExpiredActiveRegistrationIds(today)) {
            try {
                expiration.expireRegistration(id, today);
            } catch (RuntimeException e) {
                // Fail one package, not the entire sweep. The next run retries it.
                log.error("Could not expire horse package registration {}", id, e);
            }
        }
    }
}
