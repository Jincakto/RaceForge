package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.MedicalClinicalExam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalClinicalExamRepository
        extends JpaRepository<MedicalClinicalExam, Integer> {

    List<MedicalClinicalExam>
        findByMedicalRecord_MedicalRecordId(
            Integer medicalRecordId
        );
}
