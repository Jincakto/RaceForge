package com.raceforge.backend.storage;

import com.raceforge.backend.common.exception.ApiException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
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

    @Test void privateDocumentReadUsesOnlyManagedKeysAndBoundsResponseSize() {
        var builder = RestClient.builder().baseUrl("https://example.invalid/storage/v1");
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new StorageService("https://example.invalid", "test-key");
        ReflectionTestUtils.setField(service, "client", builder.build());
        for (String path : new String[]{"https://example.org/secret.pdf", "../secret.pdf", "rf/file.pdf", null}) {
            assertThrows(ApiException.class, () -> service.readDocument(path));
        }
        String path = "rf/9acf1249-0735-42d8-bdfa-0e26527840db.pdf";
        String endpoint = "https://example.invalid/storage/v1/object/authenticated/raceforge-documents/" + path;
        byte[] body = "%PDF-test".getBytes(StandardCharsets.UTF_8);
        server.expect(requestTo(endpoint)).andRespond(withSuccess(body, MediaType.APPLICATION_PDF));
        server.expect(requestTo(endpoint)).andRespond(withSuccess(new byte[10 * 1024 * 1024 + 1], MediaType.APPLICATION_PDF));
        assertArrayEquals(body, service.readDocument(path));
        assertThrows(ApiException.class, () -> service.readDocument(path));
        server.verify();
    }
}
