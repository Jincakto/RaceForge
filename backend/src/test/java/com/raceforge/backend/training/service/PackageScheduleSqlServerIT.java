package com.raceforge.backend.training.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Opt-in, SQL Server API integration test. All fixtures and sessions are rolled back. */
@SpringBootTest(properties = "spring.flyway.enabled=false")
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="RACEFORGE_SCHEDULE_DB_TEST",matches="true")
class PackageScheduleSqlServerIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;

    @Test void trainerCanReadPackageGenerateWholeRangeAndReadPersistedSchedule() throws Exception {
        Integer role=jdbc.queryForObject("SELECT role_id FROM Role WHERE role_name='HEAD_TRAINER'",Integer.class);
        Integer actor=jdbc.queryForObject("INSERT INTO dbo.[User](role_id,full_name,email,password,status,email_verified) OUTPUT INSERTED.user_id VALUES (?,N'Schedule integration test',?,'test-only-no-login','ACTIVE',1)",Integer.class,role,"schedule-test-"+UUID.randomUUID()+"@example.com");
        Integer horse=jdbc.queryForObject("INSERT INTO Horse(owner_id,horse_name,status,health_status,training_locked) OUTPUT INSERTED.horse_id VALUES (?,N'Schedule integration horse','ACTIVE','READY',0)",Integer.class,actor);
        Integer catalog=jdbc.queryForObject("INSERT INTO TRAINING_PACKAGE(package_name,package_type,duration_days,price,status) OUTPUT INSERTED.package_id VALUES (N'Package 30 days API test','BASIC',30,0,'ACTIVE')",Integer.class);
        Integer pack=jdbc.queryForObject("INSERT INTO HORSE_PACKAGE(horse_id,package_id,start_date,end_date,status,total_price,payment_status) OUTPUT INSERTED.horse_package_id VALUES (?,?,'2026-10-14','2026-11-12','ACTIVE',0,'PAID')",Integer.class,horse,catalog);
        Integer plan=jdbc.queryForObject("INSERT INTO Training_Plan(created_by,plan_name,status) OUTPUT INSERTED.plan_id VALUES (?,N'Package plan API test','ACTIVE')",Integer.class,actor);
        jdbc.update("INSERT INTO Horse_Plan(plan_id,horse_id,start_date,end_date,status) VALUES (?,?,'2026-10-14','2026-11-12','ACTIVE')",plan,horse);
        var auth=UsernamePasswordAuthenticationToken.authenticated(new AuthenticatedUser(actor,"test@example.com","ACTIVE",role,"HEAD_TRAINER"),null,List.of(new SimpleGrantedAuthority("HEAD_TRAINER")));
        String planPath="/api/horses/"+horse+"/training-plans";
        mvc.perform(get(planPath).with(authentication(auth))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].planName").value("Package plan API test"))
                .andExpect(jsonPath("$.data[0].horseId").value(horse))
                .andExpect(jsonPath("$.data[0].startDate").value("2026-10-14"))
                .andExpect(jsonPath("$.data[0].endDate").value("2026-11-12"));
        String packagePath="/api/training-sessions/horse/"+horse+"/scheduling-packages";
        mvc.perform(get(packagePath).with(authentication(auth))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].horsePackageId").value(pack))
                .andExpect(jsonPath("$.data[0].packageName").value("Package 30 days API test"))
                .andExpect(jsonPath("$.data[0].startDate").value("2026-10-14"))
                .andExpect(jsonPath("$.data[0].endDate").value("2026-11-12"));
        String body="""
            {"planId":%d,"horseId":%d,"horsePackageId":%d,"activityName":"Endurance API test","daysOfWeek":["MONDAY","WEDNESDAY","FRIDAY"],"sessionTime":"07:00"}
            """.formatted(plan,horse,pack);
        mvc.perform(post("/api/training-sessions/recurring").with(authentication(auth)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(13))
                .andExpect(jsonPath("$.data[0].scheduledStart").value("2026-10-14T07:00:00"));
        em.flush(); em.clear();
        assertEquals(13,jdbc.queryForObject("SELECT COUNT(*) FROM Training_Session WHERE horse_id=?",Integer.class,horse));
        mvc.perform(get("/api/training-sessions/horse/"+horse).with(authentication(auth)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(13))
                .andExpect(jsonPath("$.data[12].scheduledStart").value("2026-11-11T07:00:00"));
        var owner=UsernamePasswordAuthenticationToken.authenticated(new AuthenticatedUser(actor,"test@example.com","ACTIVE",5,"HORSE_OWNER"),null,List.of(new SimpleGrantedAuthority("HORSE_OWNER")));
        mvc.perform(get(planPath).with(authentication(owner))).andExpect(status().isForbidden());
        mvc.perform(get(packagePath).with(authentication(owner))).andExpect(status().isForbidden());
        mvc.perform(post("/api/training-sessions/recurring").with(authentication(owner)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        // This final conflict is rejected before writes. The outer test transaction still rolls back all fixtures.
        mvc.perform(post("/api/training-sessions/recurring").with(authentication(auth)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
    }
}
