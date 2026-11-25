package com.raceforge.backend.horse.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.dto.HorseDocumentReport;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.storage.StorageService;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HorseDocumentReviewService {
    private final HorseRepository horses;
    private final StorageService storage;
    public HorseDocumentReviewService(HorseRepository horses, StorageService storage) {
        this.horses = horses;
        this.storage = storage;
    }

    /** Always recompute from the stored current profile/file; no stale verification flag is persisted. */
    @Transactional(readOnly = true)
    public HorseDocumentReport review(String horseId) {
        var horse = horses.findById(horseId).orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        String path = horse.getDocumentUrl();
        if (!StorageService.managed(path) || !path.endsWith(".pdf")) {
            return report(horseId, "MANUAL_REVIEW", null,
                    "Only managed PDF uploads support text comparison. Review legacy links or TXT documents manually.", List.of());
        }
        final byte[] bytes;
        try { bytes = storage.readDocument(path); }
        catch (ApiException unavailable) {
            return report(horseId, "SOURCE_UNAVAILABLE", null,
                    "The stored document could not be retrieved. Retry or review manually; this is not a mismatch.", List.of());
        }
        String hash = sha256(bytes);
        var extracted = HorseDocumentTextReader.read(bytes);
        if (!"READABLE".equals(extracted.status())) {
            return report(horseId, extracted.status(), hash, extracted.message(), List.of());
        }
        var fields = HorseDocumentComparison.compare(horse, extracted.text());
        String status = fields.stream().anyMatch(field -> "MISMATCH".equals(field.status())) ? "MISMATCH"
                : fields.stream().allMatch(field -> "MATCHED".equals(field.status())) ? "MATCHED" : "INCOMPLETE";
        return report(horseId, status, hash,
                "Content comparison only. No issuer, external registry or ownership verification was performed. Missing or ambiguous fields require manual review.", fields);
    }

    private HorseDocumentReport report(String horseId, String status, String hash, String message,
            List<HorseDocumentReport.Field> fields) {
        return new HorseDocumentReport(horseId, status, "UNVERIFIED", "UNVERIFIED",
                "OWNER_UPLOADED_DOCUMENT", Instant.now(), hash, message, fields);
    }

    private String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
