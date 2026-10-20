package com.raceforge.backend.common.id;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessResourceFailureException;

class BusinessIdGeneratorTest {
    @Test void formatsZeroAndLastSlotAndUsesSeparateSequences() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForObject("SELECT NEXT VALUE FOR dbo.seq_business_HOR",Integer.class)).thenReturn(0,999);
        when(jdbc.queryForObject("SELECT NEXT VALUE FOR dbo.seq_business_OWN",Integer.class)).thenReturn(0);
        BusinessIdGenerator generator=new BusinessIdGenerator(jdbc);
        assertEquals("HOR-000",generator.next("HOR"));
        assertEquals("OWN-000",generator.next("OWN"));
        assertEquals("HOR-999",generator.next("HOR"));
    }
    @Test void exhaustionIs409AndNeverRestartsSequence() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForObject("SELECT NEXT VALUE FOR dbo.seq_business_MED",Integer.class))
                .thenThrow(new DataAccessResourceFailureException("exhausted",new SQLException("limit","S0001",11728)));
        BusinessIdGenerator generator=new BusinessIdGenerator(jdbc);
        ApiException error=assertThrows(ApiException.class,()->generator.next("MED"));
        assertEquals(409,error.getStatus().value());
        assertEquals("ID_CAPACITY_EXCEEDED",error.getCode());
        verify(jdbc).queryForObject("SELECT NEXT VALUE FOR dbo.seq_business_MED",Integer.class);
        verifyNoMoreInteractions(jdbc);
    }
    @Test void listenerUsesRoleAndDoesNotChangeExistingIdentity() {
        BusinessIdGenerator generator=mock(BusinessIdGenerator.class);
        when(generator.next("VET")).thenReturn("VET-000");
        BusinessIdListener listener=new BusinessIdListener(generator);
        User user=new User(); Role role=new Role(); role.setRoleId(3); user.setRole(role);
        assertTrue(user.isNew()); listener.assign(user);
        assertEquals("VET-000",user.getUserId()); assertEquals(user.getUserId(),user.getId());
        role.setRoleId(5); listener.assign(user);
        assertEquals("VET-000",user.getUserId());
        Horse horse=new Horse(); horse.setHorseId("HOR-001"); listener.assign(horse);
        verify(generator,times(1)).next("VET"); verifyNoMoreInteractions(generator);
    }
}
