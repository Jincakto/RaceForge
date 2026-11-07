package com.raceforge.backend.payment;

import com.raceforge.backend.common.exception.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class PayOsGateway {
    private final RestClient api;
    private final String checksum;
    private final boolean configured;
    private final String callback;
    record Link(long orderCode, long amount, String id, String paymentLinkId, String status,
                String checkoutUrl, Long amountPaid, Long amountRemaining) {}
    record Reply(String code, Link data) {}
    public record Notice(Map<String,Object> data, String signature) {}

    @org.springframework.beans.factory.annotation.Autowired
    public PayOsGateway(@Value("${PAYOS_CLIENT_ID:}") String clientId,
                        @Value("${PAYOS_API_KEY:}") String key,
                        @Value("${PAYOS_CHECKSUM_KEY:}") String checksum,
                        @Value("${PAYOS_PUBLIC_BASE_URL:http://localhost:8080}") String base) {
        this(clientId, key, checksum, base, http());
    }

    private static RestClient.Builder http() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(12));
        return RestClient.builder().requestFactory(factory);
    }

    PayOsGateway(String clientId, String key, String checksum, String base, RestClient.Builder builder) {
        this.checksum = checksum;
        configured = !clientId.isBlank() && !key.isBlank() && !checksum.isBlank();
        callback = base.replaceAll("/+$", "") + "/api/payments/payos";
        api = builder.baseUrl("https://api-merchant.payos.vn/v2/payment-requests")
                .defaultHeader("x-client-id", clientId).defaultHeader("x-api-key", key).build();
    }

    void requireConfiguration() {
        if (!configured) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PAYOS_CONFIG", "Configure the three payOS channel keys in backend/.env.");
    }

    private static ApiException upstream() {
        return new ApiException(HttpStatus.BAD_GATEWAY, "PAYOS_RESPONSE", "Cannot confirm the payment with payOS. Retry this registration.");
    }

    Link create(long code, long amount, String description) {
        requireConfiguration();
        var body = new TreeMap<String,Object>(Map.of("amount", amount, "cancelUrl", callback + "/cancel",
                "description", description, "orderCode", code, "returnUrl", callback + "/return"));
        body.put("signature", sign(body));
        try {
            var reply = api.post().contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(Reply.class);
            if (reply != null && "00".equals(reply.code()) && reply.data() != null) return reply.data();
        } catch (RestClientException e) {
            // The provider may already have created the order before the connection failed.
        }
        return lookup(code);
    }

    Link lookup(long code) {
        requireConfiguration();
        try {
            var reply = api.get().uri("/{code}", code).retrieve().body(Reply.class);
            if (reply != null && "00".equals(reply.code()) && reply.data() != null) return reply.data();
        } catch (RestClientException e) { throw upstream(); }
        throw upstream();
    }

    String sign(Map<String,Object> data) {
        String message = new TreeMap<>(data).entrySet().stream()
                .map(e -> e.getKey() + "=" + (e.getValue() == null ? "" : e.getValue()))
                .collect(Collectors.joining("&"));
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(checksum.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) { throw new IllegalStateException(e); }
    }

    void verify(Notice notice) {
        requireConfiguration();
        if (notice.data() == null || notice.signature() == null ||
                !MessageDigest.isEqual(sign(notice.data()).getBytes(StandardCharsets.US_ASCII),
                        notice.signature().getBytes(StandardCharsets.US_ASCII))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PAYOS_SIGNATURE", "Invalid payOS signature.");
        }
    }
}
