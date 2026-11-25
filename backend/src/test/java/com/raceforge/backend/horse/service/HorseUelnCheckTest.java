package com.raceforge.backend.horse.service;

import com.raceforge.backend.horse.repository.HorseRepository;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.*;

class HorseUelnCheckTest {
    private boolean duplicate;
    private String queriedUeln;
    private final HorseRepository horses = (HorseRepository) Proxy.newProxyInstance(
            HorseRepository.class.getClassLoader(), new Class<?>[]{HorseRepository.class},
            (proxy, method, args) -> {
                if (!method.getName().equals("existsByRegistrationNumberIgnoreCase")) {
                    throw new AssertionError("Unexpected repository call: " + method.getName());
                }
                queriedUeln = (String) args[0];
                return duplicate;
            });
    private final HorseService service = new HorseService(horses, null, null, null);

    @Test
    void normalizesInputAndReportsDuplicateWithoutHorseDetails() {
        duplicate = true;
        var result = service.checkUeln(" 124can123456789 ");
        assertTrue(result.validFormat());
        assertTrue(result.prefixRecognized());
        assertTrue(result.exists());
        assertEquals("This UELN is already registered.", result.message());
        assertEquals("124CAN123456789", queriedUeln);
    }

    @Test
    void availableUelnHasNoMessage() {
        var result = service.checkUeln("036001123456789");
        assertTrue(result.validFormat());
        assertTrue(result.prefixRecognized());
        assertFalse(result.exists());
        assertEquals("", result.message());
    }

    @Test
    void invalidInputDoesNotQueryDatabase() {
        for (String value : new String[]{null, "", "826ABC", "ABC123123456789", "826ABC12345678!"}) {
            assertFalse(service.checkUeln(value).validFormat());
        }
        assertNull(queriedUeln);
    }

    @Test
    void unsupportedPrefixIsNotReportedAsInvalidSyntaxOrQueriedInDatabase() {
        var result = service.checkUeln("999ZZZ123456789");
        assertTrue(result.validFormat());
        assertFalse(result.prefixRecognized());
        assertFalse(result.exists());
        assertEquals("This UELN prefix is not supported. Please check the issuing organization.", result.message());
        assertNull(queriedUeln);
        var submitError = assertThrows(com.raceforge.backend.common.exception.BusinessRuleException.class,
                () -> UelnValidator.normalizeAndValidate("999ZZZ123456789"));
        assertEquals(result.message(), submitError.getMessage());
    }
}
