package com.raceforge.backend.horse.service;

import com.raceforge.backend.common.exception.BusinessRuleException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validation of the externally issued UELN stored as Horse.registrationNumber.
 * Only the issuing organisation prefix is checked against our offline reference file;
 * the last nine characters are NOT verified against any external horse registry.
 * The included prefix catalog is a verified subset, NOT the entire global UELN registry.
 */
public final class UelnValidator {

    private static final Pattern FORMAT = Pattern.compile("^[0-9]{3}[A-Z0-9]{12}$");
    private static final String CODE_RESOURCE =
            "/com/raceforge/backend/src/main/resources/registered-prefixes.txt";
    private static final Set<String> REGISTERED_PREFIXES = loadPrefixes();

    private UelnValidator() {
    }

    public static String normalizeAndValidate(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessRuleException("UELN (registration number) is required");
        }
        String ueln = value.trim().toUpperCase(Locale.ROOT);
        if (!FORMAT.matcher(ueln).matches()) {
            throw new BusinessRuleException(
                    "UELN must contain exactly 15 letters/digits, starting with a 3-digit country code");
        }
        String organizationCode = ueln.substring(0, 6);
        if (!REGISTERED_PREFIXES.contains(organizationCode)) {
            throw new BusinessRuleException(
                    "UELN organization code '" + organizationCode
                            + "' is not in the configured UELN reference list; check the official UELN directory");
        }
        
        return ueln;
    }

    private static Set<String> loadPrefixes() {
        try (InputStream stream = UelnValidator.class.getResourceAsStream(CODE_RESOURCE)) {
            if (stream == null) {
                throw new IllegalStateException("Missing UELN prefix reference: " + CODE_RESOURCE);
            }
            Set<String> codes = new HashSet<>();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String value = line.strip();
                    if (value.isEmpty() || value.startsWith("#")) {
                        continue;
                    }
                    if (!value.matches("[0-9]{3}[A-Z0-9]{3}")) {
                        throw new IllegalStateException("Invalid UELN organization prefix in reference file: " + value);
                    }
                    codes.add(value);
                }
            }
            if (codes.isEmpty()) {
                throw new IllegalStateException("UELN organization prefix reference is empty");
            }
            return Collections.unmodifiableSet(codes);
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot read UELN organization code reference", exception);
        }
    }
}
