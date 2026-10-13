package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MedicalRecordRepository
        extends JpaRepository<MedicalRecord, Integer> {

    List<MedicalRecord>
        findByHealthProfile_ProfileIdOrderByExaminedAtDesc(
            Integer profileId
        );

    List<MedicalRecord>
        findByVeterinarian_UserIdOrderByExaminedAtDesc(
            Integer veterinarianId
        );

    List<MedicalRecord>
        findByStatus(String status);
                
    Optional<MedicalRecord>
        findFirstByHealthProfile_ProfileIdAndStatusOrderByExaminedAtDesc(
                Integer profileId,
                String status
        );
}
