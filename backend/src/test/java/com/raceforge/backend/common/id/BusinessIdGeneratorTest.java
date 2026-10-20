package com.raceforge.backend.common.id;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.raceforge.backend.account.entity.User;
import org.junit.jupiter.api.Test;
class BusinessIdGeneratorTest {
 @Test void moduleAdapterUsesTheSameCounterNamespace(){
  try(var ids=mockStatic(BusinessIds.class)){
   ids.when(()->BusinessIds.next("MED-")).thenReturn("MED-001");
   assertEquals("MED-001",new BusinessIdGenerator().next("MED"));
   ids.verify(()->BusinessIds.next("MED-"));
  }
 }
 @Test void userIdentityIsIndependentOfRoleAndNotReallocated(){
  BusinessIdGenerator generator=mock(BusinessIdGenerator.class);when(generator.next("USR")).thenReturn("USR-001");
  User user=new User();com.raceforge.backend.account.entity.Role role=new com.raceforge.backend.account.entity.Role();role.setRoleId("ROL-003");user.setRole(role);
  BusinessIdListener listener=new BusinessIdListener(generator);listener.assign(user);assertEquals("USR-001",user.getUserId());
  role.setRoleId("ROL-005");listener.assign(user);assertEquals("USR-001",user.getUserId());verify(generator,times(1)).next("USR");
 }
}
