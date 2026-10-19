package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.MedicalVitalSign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MedicalVitalSignRepository
        extends JpaRepository<MedicalVitalSign, String> {

    Optional<MedicalVitalSign>
        findByMedicalRecord_MedicalRecordId(
            String medicalRecordId
        );
}
