package com.raceforge.backend.payment;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class PaymentDeadlineTest {
 PayOsGateway.Link paid(PayOsGateway.Transfer... transfers){return new PayOsGateway.Link(1,5000,"link","link","PAID",null,5000L,0L,List.of(transfers));}
 @Test void usesVerifiedLastTransferTimeRatherThanWebhookArrival(){assertEquals(Instant.parse("2026-11-25T03:20:00Z"),OwnerPayments.verifiedPaymentTime(paid(new PayOsGateway.Transfer(2000L,"2026-11-25 10:00:00"),new PayOsGateway.Transfer(3000L,"2026-11-25T10:20:00+07:00"))));}
 @Test void missingMalformedOrPartialEvidenceRequiresReview(){assertNull(OwnerPayments.verifiedPaymentTime(paid()));assertNull(OwnerPayments.verifiedPaymentTime(paid(new PayOsGateway.Transfer(5000L,"bad"))));assertNull(OwnerPayments.verifiedPaymentTime(paid(new PayOsGateway.Transfer(1000L,"2026-11-25 10:00:00"))));}
 @Test void rejectsNegativeTransferInsteadOfFabricatingFullPayment(){assertNull(OwnerPayments.verifiedPaymentTime(paid(new PayOsGateway.Transfer(-1000L,"2026-11-25 10:00:00"),new PayOsGateway.Transfer(6000L,"2026-11-25 10:00:00"))));}
}
