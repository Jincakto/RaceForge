package com.raceforge.backend.payment;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.service.HorsePackageService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OwnerPayments {
    public record Payment(long orderCode, String registrationId, long amount, String checkoutUrl,
                          String paymentState, boolean applied, boolean reviewRequired, String applicationError) {
        public Payment(long code,String registration,long amount,String url,String state,boolean applied){this(code,registration,amount,url,state,applied,false,null);}
    }
    private record Order(Payment payment, String linkId, java.time.Instant expiresAt) {}
    private final JdbcTemplate sql;
    private final EntityManager db;
    private final TransactionTemplate tx;
    private final PayOsGateway gateway;
    private final HorsePackageService normal;
    private final SecureRandom random = new SecureRandom();

    public OwnerPayments(JdbcTemplate sql, EntityManager db, TransactionTemplate tx, PayOsGateway gateway,
                         HorsePackageService normal) {
        this.sql = sql;
        this.db = db;
        this.tx = tx;
        this.gateway = gateway;
        this.normal = normal;
    }

    private Order map(ResultSet rs, int row) throws SQLException {
        return new Order(new Payment(rs.getLong("order_code"), rs.getString("horse_package_id"), rs.getLong("amount"),
                rs.getString("checkout_url"), rs.getString("payment_state"), rs.getBoolean("applied"),rs.getBoolean("review_required"),rs.getString("application_error")), rs.getString("link_id"), rs.getObject("expires_at_utc", java.time.OffsetDateTime.class)==null?null:rs.getObject("expires_at_utc", java.time.OffsetDateTime.class).toInstant());
    }

    private Order find(long code) {
        return sql.query("SELECT * FROM dbo.PayOS_Order WHERE order_code=?", this::map, code).stream().findFirst().orElse(null);
    }

    private Order owned(String id, String owner, boolean create) {
        return tx.execute(t -> {
            HorsePackage pack = db.find(HorsePackage.class, id, LockModeType.PESSIMISTIC_WRITE);
            if (pack == null || !owner.equals(pack.getHorse().getOwner().getUserId()))
                throw new ResourceNotFoundException("Package registration not found");
            var existing = sql.query("SELECT * FROM dbo.PayOS_Order WHERE horse_package_id=?", this::map, id);
            if (!existing.isEmpty()) return existing.get(0);
            if (!create) throw new ResourceNotFoundException("Create the payOS checkout first");
            if (!"PENDING".equals(pack.getPaymentStatus()) || !"PENDING".equals(pack.getStatus()))
                throw new BusinessRuleException("This registration does not require an Owner payment.");
            if(pack.getPendingExpiresAtUtc()!=null && !java.time.Instant.now().isBefore(pack.getPendingExpiresAtUtc())) throw new BusinessRuleException("This registration has expired. Create a new registration.");
            long amount = pack.getTotalPrice().longValueExact();
            if (amount <= 0) throw new BusinessRuleException("Package price must be positive.");
            long code = random.nextLong(1, 1L << 52);
            sql.update("INSERT INTO dbo.PayOS_Order(order_code, horse_package_id, amount, expires_at_utc) VALUES(?,?,?,?)", code, id, amount, pack.getPendingExpiresAtUtc()==null?null:java.time.OffsetDateTime.ofInstant(pack.getPendingExpiresAtUtc(),java.time.ZoneOffset.UTC));
            return find(code);
        });
    }

    public Payment checkout(String id, String owner) {
        gateway.requireConfiguration();
        var order = owned(id, owner, true);
        var payment = order.payment();
        if(!"PENDING".equals(payment.paymentState())) return payment;
        if(order.expiresAt()!=null && !java.time.Instant.now().isBefore(order.expiresAt())) {
            var checked=sync(order,gateway.lookup(payment.orderCode()));
            if(!"PAID".equals(checked.paymentState())) throw new BusinessRuleException("This registration has expired. Payment has been checked; create a new registration.");
            return checked;
        }
        if(payment.checkoutUrl()!=null) return payment;
        var link = gateway.create(payment.orderCode(), payment.amount(), id,order.expiresAt());
        String linkId = verifyLink(order, link);
        String url = link.checkoutUrl() != null ? link.checkoutUrl() : "https://pay.payos.vn/web/" + linkId;
        sql.update("UPDATE dbo.PayOS_Order SET checkout_url=?, link_id=? WHERE order_code=? AND (link_id IS NULL OR link_id=?)",
                url, linkId, payment.orderCode(), linkId);
        return sync(find(payment.orderCode()), link);
    }

    private String verifyLink(Order order, PayOsGateway.Link link) {
        String id = link.paymentLinkId() != null ? link.paymentLinkId() : link.id();
        if (id == null || !id.matches("[a-zA-Z0-9-]{1,64}") || link.orderCode() != order.payment().orderCode()
                || link.amount() != order.payment().amount() || (order.linkId() != null && !order.linkId().equals(id)))
            throw new BusinessRuleException("payOS order, link or amount does not match the registration.");
        return id;
    }

    public Payment reconcile(String id, String owner) {
        var order = owned(id, owner, false);
        return order.payment().applied() && "PAID".equals(order.payment().paymentState()) ? order.payment() : sync(order, gateway.lookup(order.payment().orderCode()));
    }

    public void webhook(PayOsGateway.Notice notice) {
        gateway.verify(notice);
        Object value = notice.data().get("orderCode");
        if (!(value instanceof Number number)) throw new BusinessRuleException("Missing payOS order code");
        var order = find(number.longValue());
        if (order == null || (order.payment().applied() && "PAID".equals(order.payment().paymentState()))) return; // Also accepts the signed channel verification sample.
        var link = gateway.lookup(number.longValue());
        String id = verifyLink(order, link);
        if (!id.equals(notice.data().get("paymentLinkId"))) throw new BusinessRuleException("Unexpected payOS payment link");
        sync(order, link);
    }

    static java.time.Instant verifiedPaymentTime(PayOsGateway.Link link){
        if(link.transactions()==null || link.transactions().isEmpty()) return null;
        long total=0;java.time.Instant latest=null;
        try{for(var transfer:link.transactions()){
            if(transfer.amount()==null || transfer.amount()<=0 || transfer.transactionDateTime()==null)return null;
            total=Math.addExact(total,transfer.amount());
            String text=transfer.transactionDateTime().replace(' ','T');
            java.time.Instant at;
            try{at=java.time.OffsetDateTime.parse(text).toInstant();}
            catch(java.time.format.DateTimeParseException local){at=java.time.LocalDateTime.parse(text).atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();}
            if(latest==null || at.isAfter(latest)) latest=at;
        }}catch(RuntimeException invalid){return null;}
        return total==link.amount()?latest:null;
    }

    public java.util.List<Payment> pendingReview(){return sql.query("SELECT * FROM dbo.PayOS_Order WHERE review_required=1 AND applied=0",this::map).stream().map(Order::payment).toList();}
    public Payment retryReview(long code){var order=find(code);if(order==null)throw new ResourceNotFoundException("Payment order not found");return sync(order,gateway.lookup(code));}

    private Payment sync(Order order, PayOsGateway.Link link) {
        verifyLink(order, link);
        long code = order.payment().orderCode();
        boolean paid = "PAID".equals(link.status());
        boolean cancelled = "CANCELLED".equals(link.status()) || "EXPIRED".equals(link.status());
        if (!paid && !cancelled) {
            if(link.amountPaid()!=null && link.amountPaid()>0) sql.update("UPDATE dbo.PayOS_Order SET review_required=1,application_error=? WHERE order_code=? AND applied=0","Partial payment requires manager reconciliation.",code);
            return find(code).payment();
        }
        if (paid && (link.amountPaid() == null || link.amountPaid() != link.amount() || link.amountRemaining() == null || link.amountRemaining() != 0)) {
            sql.update("UPDATE dbo.PayOS_Order SET review_required=1,application_error=? WHERE order_code=? AND applied=0", "Received amount needs reconciliation.",code);
            return find(code).payment();
        }
        if (cancelled && (link.amountPaid() == null || link.amountPaid() != 0)){
            sql.update("UPDATE dbo.PayOS_Order SET review_required=1,application_error=? WHERE order_code=? AND applied=0","Partially paid registration needs reconciliation.",code);
            return find(code).payment();
        }
        // Keep the verified receipt even if a new medical lock prevents package activation.
        String state = paid ? "PAID" : "CANCELLED";
        sql.update("UPDATE dbo.PayOS_Order SET applied=CASE WHEN ?='PAID' AND payment_state<>'PAID' THEN 0 ELSE applied END, payment_state=?, "
                + "confirmed_at_utc=CASE WHEN ?='PAID' THEN COALESCE(confirmed_at_utc, SYSUTCDATETIME()) ELSE confirmed_at_utc END "
                + "WHERE order_code=? AND (payment_state='PENDING' OR ?='PAID')", state, state, state, code,state);
        java.time.Instant paidAt = paid ? verifiedPaymentTime(link) : null;
        if(paidAt!=null) sql.update("UPDATE dbo.PayOS_Order SET verified_paid_at_utc=? WHERE order_code=?",java.time.OffsetDateTime.ofInstant(paidAt,java.time.ZoneOffset.UTC),code);
        try {
            tx.executeWithoutResult(t -> {
                var locked = sql.queryForObject("SELECT * FROM dbo.PayOS_Order WITH (UPDLOCK, ROWLOCK) WHERE order_code=?", this::map, code);
                if (locked.payment().applied() || !state.equals(locked.payment().paymentState())) return;
                var pack = db.find(HorsePackage.class, order.payment().registrationId());
                String owner = pack.getHorse().getOwner().getUserId();
                if(paid && locked.expiresAt()!=null && (paidAt==null || paidAt.isAfter(locked.expiresAt()))) throw new BusinessRuleException("Payment time is missing or after the registration deadline. Manager reconciliation is required.");
                if(paid || !"EXPIRED".equals(pack.getStatus())) normal.applyVerifiedPayment(pack.getHorsePackageId(), paid, owner,paidAt);
                sql.update("UPDATE dbo.PayOS_Order SET applied=1,review_required=0,application_error=NULL WHERE order_code=?", code);
            });
        } catch (BusinessRuleException blocked) {
            sql.update("UPDATE dbo.PayOS_Order SET review_required=1,application_error=? WHERE order_code=? AND applied=0",blocked.getMessage().substring(0,Math.min(1000,blocked.getMessage().length())),code);
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("payOS order {} needs package review: {}", code, blocked.getMessage());
        }
        return find(code).payment();
    }
}
