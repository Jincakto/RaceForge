package com.raceforge.backend.horse.dto;

import java.time.Instant;
import java.util.List;

/** CM-only content comparison. Issuer authenticity and ownership are never inferred. */
public record HorseDocumentReport(String horseId, String status, String documentAuthenticity,
        String ownershipStatus, String source, Instant checkedAt, String documentSha256,
        String message, List<Field> fields) {
    public record Field(String field, String profileValue, String documentValue, String status) {}
}
