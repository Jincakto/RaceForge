package com.raceforge.backend.storage;

import com.raceforge.backend.common.exception.ApiException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;

class StorageServiceTest {
    private final StorageService storage = new StorageService("https://example.invalid", "");

    @Test void rejectsAnImageSubmittedAsTheIdentityDocument() {
        var image = new MockMultipartFile("document", "passport.pdf", "application/pdf", new byte[]{-1, -40, -1, 1});
        assertThrows(ApiException.class, () -> storage.validate(image, true));
    }

    @Test void acceptsUtf8TextAndEnforcesItsOwnSizeLimit() {
        var text = new MockMultipartFile("document", "passport.txt", "text/plain", "Mã ngựa".getBytes(StandardCharsets.UTF_8));
        assertEquals("txt", storage.validate(text, true).extension());
        var large = new MockMultipartFile("document", "a.txt", "text/plain", new byte[1024 * 1024 + 1]);
        assertThrows(ApiException.class, () -> storage.validate(large, true));
    }

    @Test void preservesLegacyUrlsAndOnlyManagesGeneratedPaths() {
        String old = "https://example.invalid/horse.jpg";
        assertEquals(old, storage.readUrl(StorageService.IMAGES, old));
        assertFalse(StorageService.managed(old));
        assertTrue(StorageService.managed("rf/9acf1249-0735-42d8-bdfa-0e26527840db.jpg"));
    }
}
