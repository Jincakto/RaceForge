package com.raceforge.backend.training.dto;

import com.raceforge.backend.training.service.TrainingCertificateAccess.CertificateSummary;

/** Terminal registration state; cancellation never implies a refund. */
public record HorsePackageLifecycleResponse(
        HorsePackageResponse registration, int deletedSessionCount, CertificateSummary certificate) {
}
