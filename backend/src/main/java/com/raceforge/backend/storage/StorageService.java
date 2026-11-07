package com.raceforge.backend.storage;

import com.raceforge.backend.common.exception.ApiException;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StorageService {
    private final RestClient client;
    private final String url;
    private final String key;
    public static final String IMAGES = "raceforge-images";
    public static final String DOCUMENTS = "raceforge-documents";

    public StorageService(@Value("${SUPABASE_URL:https://uivnbvywcyqkgzgusyai.supabase.co}") String url,
                          @Value("${SUPABASE_SECRET_KEY:}") String key) {
        this.url = url.replaceAll("/+$", "");
        this.key = key;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(30));
        client = RestClient.builder().baseUrl(this.url + "/storage/v1")
                .requestFactory(factory).defaultHeader("apikey", key).build();
    }

    public record Upload(byte[] bytes, String type, String extension) {}

    public Upload validate(MultipartFile file, boolean document) {
        if (file.isEmpty() || file.getSize() > (document ? 10 : 5) * 1024L * 1024)
            throw invalid("Empty file or file exceeds the upload limit.");
        try {
            byte[] bytes = file.getBytes();
            String type = String.valueOf(file.getContentType());
            String ext = switch (type) {
                case "image/jpeg" -> !document && bytes.length > 3 && bytes[0] == -1 && bytes[1] == -40 && bytes[2] == -1 ? "jpg" : null;
                case "image/png" -> !document && starts(bytes, "\u0089PNG\r\n\u001a\n", 0) ? "png" : null;
                case "image/webp" -> !document && starts(bytes, "RIFF", 0) && starts(bytes, "WEBP", 8) ? "webp" : null;
                case "application/pdf" -> document && starts(bytes, "%PDF-", 0) ? "pdf" : null;
                case "text/plain" -> document && bytes.length <= 1024 * 1024
                        && StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).chars()
                        .noneMatch(c -> Character.isISOControl(c) && !Character.isWhitespace(c)) ? "txt" : null;
                default -> null;
            };
            if (ext == null) throw invalid(document ? "Select a PDF (10 MB) or UTF-8 TXT (1 MB)." : "Select a JPG, PNG or WebP image (5 MB).");
            return new Upload(bytes, type, ext);
        } catch (IOException e) {
            throw invalid("Cannot read file contents.");
        }
    }

    private boolean starts(byte[] bytes, String signature, int offset) {
        byte[] expected = signature.getBytes(StandardCharsets.ISO_8859_1);
        return bytes.length >= offset + expected.length && java.util.Arrays.equals(bytes, offset,
                offset + expected.length, expected, 0, expected.length);
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", message);
    }

    private ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "File storage is unavailable. Check the backend storage configuration.");
    }

    public static boolean managed(String path) {
        return path != null && path.matches("rf/[0-9a-f-]{36}\\.(jpg|png|webp|pdf|txt)");
    }

    public String replace(String bucket, Upload upload, String previous) {
        if (key.isBlank()) throw unavailable();
        String path = "rf/" + UUID.randomUUID() + "." + upload.extension();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) remove(bucket, path);
                if (status == STATUS_COMMITTED && managed(previous)) remove(bucket, previous);
            }
        });
        try {
            client.post().uri("/object/" + bucket + "/" + path)
                    .contentType(MediaType.parseMediaType(upload.type())).body(upload.bytes()).retrieve().toBodilessEntity();
            return path;
        } catch (RestClientException e) { throw unavailable(); }
    }

    private void remove(String bucket, String path) {
        try {
            client.delete().uri("/object/" + bucket + "/" + path).retrieve().toBodilessEntity();
        } catch (RestClientException e) {
            LoggerFactory.getLogger(getClass()).warn("Storage cleanup pending for {}/{}", bucket, path);
        }
    }

    public String readUrl(String bucket, String path) {
        if (!managed(path)) return path;
        try {
            var response = client.post().uri("/object/sign/" + bucket + "/" + path)
                    .body(Map.of("expiresIn", 3600)).retrieve().body(Map.class);
            if (response == null || !(response.get("signedURL") instanceof String signed) || !signed.startsWith("/object/sign/"))
                throw unavailable();
            return url + "/storage/v1" + signed;
        } catch (RestClientException e) { throw unavailable(); }
    }
}
