package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.*;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class MedicalRecordService {

    private final HealthProfileRepository healthProfileRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalVitalSignRepository medicalVitalSignRepository;
    private final MedicalClinicalExamRepository medicalClinicalExamRepository;

    public MedicalRecordService(
            HealthProfileRepository healthProfileRepository,
            MedicalRecordRepository medicalRecordRepository,
            MedicalVitalSignRepository medicalVitalSignRepository,
            MedicalClinicalExamRepository medicalClinicalExamRepository) {

        this.healthProfileRepository = healthProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalVitalSignRepository = medicalVitalSignRepository;
        this.medicalClinicalExamRepository = medicalClinicalExamRepository;
    }
}
