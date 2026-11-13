package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingCertificate;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingCertificateRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TrainingCertificateAccessTest {
    private final HorsePackageRepository packages = mock(HorsePackageRepository.class);
    private final TrainingCertificateRepository certificates = mock(TrainingCertificateRepository.class);
    private final TrainingCertificateAccess access =
            new TrainingCertificateAccess(packages, certificates, mock(HorsePackageMapper.class));

    @Test
    void onlyTheOwnerCanReadAnIssuedCertificate() {
        var certificate = new TrainingCertificate("HPG-010", "Ánh Dương", LocalDate.of(2026, 11, 12));
        when(packages.findByHorsePackageIdAndHorse_Owner_UserId("HPG-010", "owner"))
                .thenReturn(Optional.of(new HorsePackage()));
        when(certificates.findById("HPG-010")).thenReturn(Optional.of(certificate));

        assertThrows(ResourceNotFoundException.class, () -> access.certificate("HPG-010", "other"));
        verifyNoInteractions(certificates);
        assertSame(certificate, access.certificate("HPG-010", "owner"));
        assertEquals("RF-HPG-010", access.detail("HPG-010", "owner").certificate().certificateNumber());
    }

    @Test
    void completedRegistrationWithoutCertificateStillHasNoDownload() {
        HorsePackage registration = new HorsePackage();
        registration.setStatus("COMPLETED");
        when(packages.findByHorsePackageIdAndHorse_Owner_UserId("HPG-010", "owner"))
                .thenReturn(Optional.of(registration));

        assertNull(access.detail("HPG-010", "owner").certificate());
        assertThrows(ResourceNotFoundException.class, () -> access.certificate("HPG-010", "owner"));
    }
}
