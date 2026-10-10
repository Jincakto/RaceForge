package com.raceforge.backend.common.util;

import java.security.SecureRandom;
import java.util.UUID;

public final class IdGenerator {

    private static final char[] ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private IdGenerator() {
    }

    public static String prefixed(String prefix, int maxLength) {
        int randomLength = maxLength - prefix.length();
        StringBuilder value = new StringBuilder(prefix);
        for (int i = 0; i < randomLength; i++) {
            value.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        }
        return value.toString();
    }

    public static String uuid() {
        return UUID.randomUUID().toString();
    }
}
