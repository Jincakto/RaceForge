package com.raceforge.backend.payment;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.service.HorsePackageService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.transaction.*;
import org.springframework.transaction.support.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.function.Consumer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class OwnerPaymentReconciliationTest {
 final JdbcTemplate sql=mock(JdbcTemplate.class);final EntityManager db=mock(EntityManager.class);
 final TransactionTemplate tx=mock(TransactionTemplate.class);final PayOsGateway gateway=mock(PayOsGateway.class);
 final HorsePackageService normal=mock(HorsePackageService.class);final OwnerPayments service=new OwnerPayments(sql,db,tx,gateway,normal);
 final HorsePackage pack=new HorsePackage();String state="PENDING",error;boolean applied,review;Instant deadline=Instant.parse("2026-11-25T03:30:00Z");
 @BeforeEach @SuppressWarnings({"unchecked","rawtypes"}) void setup() throws Exception {
  var owner=new User();owner.setUserId("OWN-001");var horse=new Horse();horse.setOwner(owner);pack.setHorse(horse);pack.setHorsePackageId("HPG-001");
  when(db.find(eq(HorsePackage.class),eq("HPG-001"),eq(LockModeType.PESSIMISTIC_WRITE))).thenReturn(pack);
  when(db.find(HorsePackage.class,"HPG-001")).thenReturn(pack);
  when(tx.execute(any())).thenAnswer(i->((TransactionCallback)i.getArgument(0)).doInTransaction(mock(TransactionStatus.class)));
  doAnswer(i->{((Consumer<TransactionStatus>)i.getArgument(0)).accept(mock(TransactionStatus.class));return null;}).when(tx).executeWithoutResult(any());
  doAnswer(i->{RowMapper mapper=i.getArgument(1);return List.of(mapper.mapRow(result(),0));}).when(sql).query(anyString(),any(RowMapper.class),any(Object[].class));
  doAnswer(i->{RowMapper mapper=i.getArgument(1);return mapper.mapRow(result(),0);}).when(sql).queryForObject(anyString(),any(RowMapper.class),any(Object[].class));
  doAnswer(i->{String statement=i.getArgument(0);
    if(statement.contains("SET applied=CASE")){String next=i.getArgument(1);if("PAID".equals(next)&&!"PAID".equals(state))applied=false;state=next;}
    else if(statement.contains("SET applied=1")){applied=true;review=false;error=null;}
    else if(statement.contains("SET review_required=1")){review=true;error=i.getArgument(1);}
    return 1;
  }).when(sql).update(anyString(),any(Object[].class));
 }
 ResultSet result() throws SQLException {
  ResultSet rs=mock(ResultSet.class);when(rs.getLong("order_code")).thenReturn(1L);when(rs.getLong("amount")).thenReturn(5000L);
  when(rs.getString("horse_package_id")).thenReturn("HPG-001");when(rs.getString("checkout_url")).thenReturn("https://pay.test");when(rs.getString("link_id")).thenReturn("link");when(rs.getString("payment_state")).thenReturn(state);when(rs.getBoolean("applied")).thenReturn(applied);when(rs.getBoolean("review_required")).thenReturn(review);when(rs.getString("application_error")).thenReturn(error);
  when(rs.getObject("expires_at_utc",OffsetDateTime.class)).thenReturn(deadline.atOffset(ZoneOffset.UTC));return rs;
 }
 PayOsGateway.Link paid(String at){return new PayOsGateway.Link(1,5000,"link","link","PAID",null,5000L,0L,List.of(new PayOsGateway.Transfer(5000L,at)));}
 @Test void duplicateVerifiedPaymentAppliesOnce(){when(gateway.lookup(1)).thenReturn(paid("2026-11-25T03:20:00Z"));service.reconcile("HPG-001","OWN-001");service.reconcile("HPG-001","OWN-001");assertEquals("PAID",state);assertTrue(applied);verify(normal,times(1)).applyVerifiedPayment("HPG-001",true,"OWN-001",Instant.parse("2026-11-25T03:20:00Z"));}
 @Test void lateReceiptIsRetainedWithoutActivation(){when(gateway.lookup(1)).thenReturn(paid("2026-11-25T03:31:00Z"));var receipt=service.reconcile("HPG-001","OWN-001");assertEquals("PAID",receipt.paymentState());assertFalse(receipt.applied());assertTrue(receipt.reviewRequired());verifyNoInteractions(normal);}
 @Test void medicalFailureRetainsReceiptAndCanBeRetried(){when(gateway.lookup(1)).thenReturn(paid("2026-11-25T03:20:00Z"));when(normal.applyVerifiedPayment(anyString(),eq(true),anyString(),any())).thenThrow(new BusinessRuleException("Training locked"));var receipt=service.reconcile("HPG-001","OWN-001");assertEquals("PAID",receipt.paymentState());assertTrue(receipt.reviewRequired());assertFalse(receipt.applied());assertEquals("Training locked",receipt.applicationError());}
 @Test void paidAfterCancelledOrderStillEntersReconciliation(){state="CANCELLED";applied=true;when(gateway.lookup(1)).thenReturn(paid("2026-11-25T03:31:00Z"));var receipt=service.reconcile("HPG-001","OWN-001");assertEquals("PAID",receipt.paymentState());assertFalse(receipt.applied());assertTrue(receipt.reviewRequired());}
 @Test void checkoutReconcilesCancelledLinkBeforeReuse(){
  deadline=Instant.now().plusSeconds(1800);
  when(gateway.lookup(1)).thenReturn(new PayOsGateway.Link(1,5000,"link","link","CANCELLED",null,0L,5000L,List.of()));
  var receipt=service.checkout("HPG-001","OWN-001");
  assertEquals("CANCELLED",receipt.paymentState());assertTrue(receipt.applied());
  verify(normal).applyVerifiedPayment("HPG-001",false,"OWN-001",null);
 }
 @Test void checkoutKeepsPendingLinkWhenStillValid(){
  deadline=Instant.now().plusSeconds(1800);
  when(gateway.lookup(1)).thenReturn(new PayOsGateway.Link(1,5000,"link","link","PENDING",null,0L,5000L,List.of()));
  var receipt=service.checkout("HPG-001","OWN-001");
  assertEquals("PENDING",receipt.paymentState());assertEquals("https://pay.test",receipt.checkoutUrl());verifyNoInteractions(normal);
 }
}
