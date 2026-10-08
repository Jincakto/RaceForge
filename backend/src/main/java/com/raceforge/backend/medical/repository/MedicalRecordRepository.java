package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalRecordRepository
        extends JpaRepository<MedicalRecord, String> {

    List<MedicalRecord>
        findByHealthProfile_ProfileIdOrderByExaminedAtDesc(
            String profileId
        );

    List<MedicalRecord>
        findByVeterinarian_UserIdOrderByExaminedAtDesc(
            String veterinarianId
        );

    List<MedicalRecord>
        findByStatus(String status);
}
