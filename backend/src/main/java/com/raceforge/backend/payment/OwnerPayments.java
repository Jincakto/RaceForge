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
                          String paymentState, boolean applied) {}
    private record Order(Payment payment, String linkId) {}
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
                rs.getString("checkout_url"), rs.getString("payment_state"), rs.getBoolean("applied")), rs.getString("link_id"));
    }

    private Order find(long code) {
        return sql.query("SELECT * FROM dbo.PayOS_Order WHERE order_code=?", this::map, code).stream().findFirst().orElse(null);
    }

    private Order owned(String id, String owner, boolean create) {
        return tx.execute(t -> {
            HorsePackage pack = db.find(HorsePackage.class, id, LockModeType.PESSIMISTIC_WRITE);
            if (pack == null || !owner.equals(pack.getHorse().getOwner().getUserId()))
                throw new ResourceNotFoundException("Package registration not found");
            if ("RECOVERY".equalsIgnoreCase(pack.getTrainingPackage().getPackageType())) {
                throw new BusinessRuleException("Recovery checkout is retired; contact support for old orders");
            }
            var existing = sql.query("SELECT * FROM dbo.PayOS_Order WHERE horse_package_id=?", this::map, id);
            if (!existing.isEmpty()) return existing.get(0);
            if (!create) throw new ResourceNotFoundException("Create the payOS checkout first");
            if (pack.getReplacedHorsePackage() != null || !"PENDING".equals(pack.getPaymentStatus()) || !"PENDING".equals(pack.getStatus()))
                throw new BusinessRuleException("This registration does not require an Owner payment.");
            long amount = pack.getTotalPrice().longValueExact();
            if (amount <= 0) throw new BusinessRuleException("Package price must be positive.");
            long code = random.nextLong(1, 1L << 52);
            sql.update("INSERT INTO dbo.PayOS_Order(order_code, horse_package_id, amount) VALUES(?,?,?)", code, id, amount);
            return find(code);
        });
    }

    public Payment checkout(String id, String owner) {
        gateway.requireConfiguration();
        var order = owned(id, owner, true);
        var payment = order.payment();
        if (payment.checkoutUrl() != null || !"PENDING".equals(payment.paymentState())) return payment;
        var link = gateway.create(payment.orderCode(), payment.amount(), id);
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
        return order.payment().applied() ? order.payment() : sync(order, gateway.lookup(order.payment().orderCode()));
    }

    public void webhook(PayOsGateway.Notice notice) {
        gateway.verify(notice);
        Object value = notice.data().get("orderCode");
        if (!(value instanceof Number number)) throw new BusinessRuleException("Missing payOS order code");
        var order = find(number.longValue());
        if (order == null || order.payment().applied()) return; // Also accepts the signed channel verification sample.
        var link = gateway.lookup(number.longValue());
        String id = verifyLink(order, link);
        if (!id.equals(notice.data().get("paymentLinkId"))) throw new BusinessRuleException("Unexpected payOS payment link");
        sync(order, link);
    }

    private Payment sync(Order order, PayOsGateway.Link link) {
        verifyLink(order, link);
        long code = order.payment().orderCode();
        boolean paid = "PAID".equals(link.status());
        boolean cancelled = "CANCELLED".equals(link.status()) || "EXPIRED".equals(link.status());
        if (!paid && !cancelled) return find(code).payment();
        if (paid && (link.amountPaid() == null || link.amountPaid() != link.amount() ||
                link.amountRemaining() == null || link.amountRemaining() != 0))
            throw new BusinessRuleException("Received amount needs reconciliation.");
        if (cancelled && (link.amountPaid() == null || link.amountPaid() != 0))
            throw new BusinessRuleException("Partially paid registration needs reconciliation.");
        // Keep the verified receipt even if a new medical lock prevents package activation.
        String state = paid ? "PAID" : "CANCELLED";
        sql.update("UPDATE dbo.PayOS_Order SET payment_state=? WHERE order_code=? AND payment_state='PENDING'", state, code);
        try {
            tx.executeWithoutResult(t -> {
                var locked = sql.queryForObject("SELECT * FROM dbo.PayOS_Order WITH (UPDLOCK, ROWLOCK) WHERE order_code=?", this::map, code);
                if (locked.payment().applied() || !state.equals(locked.payment().paymentState())) return;
                var pack = db.find(HorsePackage.class, order.payment().registrationId());
                String owner = pack.getHorse().getOwner().getUserId();
                if ("RECOVERY".equalsIgnoreCase(pack.getTrainingPackage().getPackageType())) {
                    // Verified historical receipts remain PAID / applied=false for manual reconciliation.
                    throw new BusinessRuleException("Historical Recovery order requires manual reconciliation");
                }
                normal.applyPayment(pack.getHorsePackageId(), paid, owner);
                sql.update("UPDATE dbo.PayOS_Order SET applied=1 WHERE order_code=?", code);
            });
        } catch (BusinessRuleException blocked) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("payOS order {} needs package review: {}", code, blocked.getMessage());
        }
        return find(code).payment();
    }
}
