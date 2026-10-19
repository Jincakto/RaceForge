package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MedicalRecordRepository
        extends JpaRepository<MedicalRecord, String> {

    List<MedicalRecord>
        findByHealthProfile_ProfileIdOrderByExaminedAtDesc(
            Integer profileId
        );

    List<MedicalRecord>
        findByVeterinarian_UserIdOrderByExaminedAtDesc(
            String veterinarianId
        );

    List<MedicalRecord>
        findByStatus(String status);

    // Used when the Club Manager issues a new veterinary assignment.
    // MedicalRecord -> HealthProfile -> Horse (String horseId).
    List<MedicalRecord> findByHealthProfile_Horse_HorseIdAndStatus(
            String horseId, String status);
                
    Optional<MedicalRecord>
        findFirstByHealthProfile_ProfileIdAndStatusOrderByExaminedAtDesc(
                Integer profileId,
                String status
        );

    // Final Flyway schema must create dbo.Medical_Record_Id_Sequence.
    @Query(value = "SELECT NEXT VALUE FOR dbo.Medical_Record_Id_Sequence", nativeQuery = true)
    Long nextMedicalRecordNumber();
}
