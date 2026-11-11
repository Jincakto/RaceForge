package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingCertificate;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingCertificateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional(readOnly = true)
public class TrainingCertificateAccess {
    private final HorsePackageRepository packages;
    private final TrainingCertificateRepository certificates;
    private final HorsePackageMapper mapper;

    public TrainingCertificateAccess(HorsePackageRepository packages, TrainingCertificateRepository certificates,
                                     HorsePackageMapper mapper) {
        this.packages = packages;
        this.certificates = certificates;
        this.mapper = mapper;
    }

    public RegistrationDetail detail(String registrationId, String ownerId) {
        HorsePackage registration = ownedRegistration(registrationId, ownerId);
        CertificateSummary certificate = certificates.findById(registrationId)
                .map(value -> new CertificateSummary(value.getCertificateNumber(), value.getIssueDate()))
                .orElse(null);
        return new RegistrationDetail(mapper.toResponse(registration), certificate);
    }

    public TrainingCertificate certificate(String registrationId, String ownerId) {
        ownedRegistration(registrationId, ownerId);
        return certificates.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Training certificate not found"));
    }

    private HorsePackage ownedRegistration(String registrationId, String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new ResourceNotFoundException("Package registration not found");
        }
        return packages.findByHorsePackageIdAndHorse_Owner_UserId(registrationId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Package registration not found"));
    }

    public record RegistrationDetail(HorsePackageResponse registration, CertificateSummary certificate) {
    }

    public record CertificateSummary(String certificateNumber, LocalDate issueDate) {
    }
}
