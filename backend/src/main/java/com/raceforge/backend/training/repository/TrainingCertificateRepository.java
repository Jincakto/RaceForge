package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingCertificate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingCertificateRepository extends JpaRepository<TrainingCertificate, String> {
}
