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
            "/registered-prefixes.txt";
    private static final Set<String> REGISTERED_PREFIXES = loadPrefixes();

    private UelnValidator() {
    }

    public static String normalizeAndValidate(String value) {
        String ueln = normalizeFormat(value);
        if (!hasSupportedPrefix(ueln)) {
            throw new BusinessRuleException(
                    "This UELN prefix is not supported. Please check the issuing organization.");
        }
        return ueln;
    }

    /** Shared normalization and syntax checks for preflight, creation and updates. */
    public static String normalizeFormat(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessRuleException("UELN (registration number) is required");
        }
        String ueln = value.trim().toUpperCase(Locale.ROOT);
        if (!FORMAT.matcher(ueln).matches()) {
            throw new BusinessRuleException(
                    "UELN must contain exactly 15 letters/digits, starting with a 3-digit country code");
        }
        return ueln;
    }

    /** Checks the configured offline subset, not the existence of a horse. */
    public static boolean hasSupportedPrefix(String normalizedUeln) {
        return normalizedUeln != null && FORMAT.matcher(normalizedUeln).matches()
                && REGISTERED_PREFIXES.contains(normalizedUeln.substring(0, 6));
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
