package com.raceforge.backend.payment;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Only new timed, unpaid registrations expire. Receipts and historical registrations are retained. */
@Component
public class PendingPaymentExpiryScheduler {
    private final JdbcTemplate sql;
    public PendingPaymentExpiryScheduler(JdbcTemplate sql){this.sql=sql;}
    @Scheduled(fixedDelayString="${raceforge.payments.expiry-sweep-ms:60000}")
    public void expire(){
        sql.update("UPDATE hp SET status='EXPIRED',updated_at=GETDATE() FROM dbo.HORSE_PACKAGE hp "
            + "WHERE hp.status='PENDING' AND hp.payment_status='PENDING' AND hp.pending_expires_at_utc<=SYSUTCDATETIME() "
            + "AND NOT EXISTS(SELECT 1 FROM dbo.PayOS_Order po WHERE po.horse_package_id=hp.horse_package_id AND (po.payment_state='PAID' OR po.review_required=1))");
    }
}
