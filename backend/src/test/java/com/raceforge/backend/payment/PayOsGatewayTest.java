package com.raceforge.backend.payment;

import com.raceforge.backend.common.exception.ApiException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class PayOsGatewayTest {
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final PayOsGateway api = new PayOsGateway("client", "api", "test-checksum", "http://localhost:8080", builder);
    private static final String URL = "https://api-merchant.payos.vn/v2/payment-requests";

    @Test void verifiesSignatureAndRejectsChangedAmount() {
        var signature = "f593555733475b3bc257e26898188b4aae2fc19da0e762a061dc5cafb2e5419e";
        api.verify(new PayOsGateway.Notice(Map.of("orderCode",12345,"amount",25000),signature));
        assertThrows(ApiException.class, () -> api.verify(new PayOsGateway.Notice(Map.of("orderCode",12345,"amount",1),signature)));
    }

    @Test void createsHostedCheckoutWithServerPrice() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.POST)).andExpect(header("x-client-id","client"))
                .andExpect(header("x-api-key","api")).andExpect(jsonPath("$.amount").value(25000))
                .andExpect(jsonPath("$.returnUrl").value("http://localhost:8080/api/payments/payos/return"))
                .andExpect(jsonPath("$.signature").isString())
                .andRespond(withSuccess("""
                    {"code":"00","data":{"orderCode":12345,"amount":25000,"paymentLinkId":"abc","status":"PENDING",
                    "checkoutUrl":"https://pay.payos.vn/web/abc","qrCode":"demo"}}
                    """, MediaType.APPLICATION_JSON));
        assertEquals("abc", api.create(12345,25000,"HPG-001").paymentLinkId());
        server.verify();
    }

    @Test void retrievesSameOrderOnDuplicateCreate() {
        server.expect(requestTo(URL)).andRespond(withSuccess("{\"code\":\"231\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(URL+"/12345")).andExpect(method(HttpMethod.GET)).andRespond(withSuccess("""
                {"code":"00","data":{"id":"abc","orderCode":12345,"amount":25000,"amountPaid":25000,
                "amountRemaining":0,"status":"PAID","transactions":[]}}
                """, MediaType.APPLICATION_JSON));
        assertEquals("PAID",api.create(12345,25000,"HPG-001").status());
        server.verify();
    }
}
