package com.raceforge.backend.payment;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.service.HorsePackageService;
import com.raceforge.backend.training.service.RecoveryPackageService;
import jakarta.persistence.EntityManager;
import java.sql.ResultSet;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OwnerPaymentsTest {
    private final JdbcTemplate sql = mock(JdbcTemplate.class);
    private final EntityManager db = mock(EntityManager.class);
    private final TransactionTemplate tx = mock(TransactionTemplate.class);
    private final PayOsGateway gateway = mock(PayOsGateway.class);
    private final HorsePackageService normal = mock(HorsePackageService.class);
    private final RecoveryPackageService recovery = mock(RecoveryPackageService.class);
    private final OwnerPayments payments = new OwnerPayments(sql, db, tx, gateway, normal, recovery);
    private final PayOsGateway.Notice notice = new PayOsGateway.Notice(Map.of("orderCode", 123L, "paymentLinkId", "abc"), "verified-by-gateway");
    private boolean applied;
    private String state = "PENDING";

    @SuppressWarnings("unchecked")
    private void setup(String type, long price) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getLong("order_code")).thenReturn(123L);
        when(rs.getLong("amount")).thenReturn(5000L);
        when(rs.getString("horse_package_id")).thenReturn("HPG-001");
        when(rs.getString("link_id")).thenReturn("abc");
        when(rs.getBoolean("applied")).thenAnswer(call -> applied);
        when(rs.getString("payment_state")).thenAnswer(call -> state);
        when(sql.query(anyString(), any(RowMapper.class), eq(123L))).thenAnswer(call ->
                List.of(call.<RowMapper<?>>getArgument(1).mapRow(rs, 0)));
        when(sql.queryForObject(anyString(), any(RowMapper.class), eq(123L))).thenAnswer(call ->
                call.<RowMapper<?>>getArgument(1).mapRow(rs, 0));
        when(sql.update(startsWith("UPDATE dbo.PayOS_Order SET payment_state"), eq("PAID"), eq(123L))).thenAnswer(call -> { state = "PAID"; return 1; });
        when(sql.update(startsWith("UPDATE dbo.PayOS_Order SET applied"), eq(123L))).thenAnswer(call -> { applied = true; return 1; });
        doAnswer(call -> { call.<Consumer<TransactionStatus>>getArgument(0).accept(new SimpleTransactionStatus()); return null; })
                .when(tx).executeWithoutResult(any());
        var horse = new Horse();
        var user = new User();
        user.setUserId("OWN-001");
        horse.setOwner(user);
        var pack = new HorsePackage();
        pack.setHorsePackageId("HPG-001");
        pack.setHorse(horse);
        var training = new TrainingPackage();
        training.setPackageType(type);
        pack.setTrainingPackage(training);
        when(db.find(HorsePackage.class, "HPG-001")).thenReturn(pack);
        when(gateway.lookup(123)).thenReturn(new PayOsGateway.Link(123,price,"abc",null,"PAID",null,price,0L));
    }

    @Test void normalPaymentAppliesOnlyOnceOnRepeatedDelivery() throws Exception {
        setup("NORMAL",5000);
        payments.webhook(notice);
        payments.webhook(notice);
        verify(normal).applyPayment("HPG-001",true,"OWN-001");
        verifyNoInteractions(recovery);
    }

    @Test void ownerPaidRecoveryUsesRecoveryGuards() throws Exception {
        setup("RECOVERY",5000);
        payments.webhook(notice);
        verify(recovery).applyRecoveryPayment("HPG-001",true,"OWN-001");
        verifyNoInteractions(normal);
    }

    @Test void paymentSurvivesBlockedActivation() throws Exception {
        setup("NORMAL",5000);
        when(normal.applyPayment("HPG-001",true,"OWN-001")).thenThrow(new BusinessRuleException("Horse is locked"));
        payments.webhook(notice);
        assertEquals("PAID",state);
        assertFalse(applied);
    }

    @Test void mismatchedAmountCannotActivate() throws Exception {
        setup("NORMAL",3000);
        assertThrows(BusinessRuleException.class, () -> payments.webhook(notice));
        assertEquals("PENDING",state);
        verifyNoInteractions(normal,recovery);
    }
}
