package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.MedicalClinicalExam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalClinicalExamRepository
        extends JpaRepository<MedicalClinicalExam, String> {

    List<MedicalClinicalExam>
        findByMedicalRecord_MedicalRecordId(
            String medicalRecordId
        );
}
