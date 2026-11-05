package com.raceforge.backend.training.service;

import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.common.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessResourceFailureException;
import java.time.LocalDate;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class TrainingContextReadTest {
 @Test void missingOrInvalidRoadmapDoesNotLoseRegistration(){
  var guard=mock(TrainingWorkflowGuard.class);var roadmaps=mock(PackageRoadmapTemplateService.class);
  var pack=new HorsePackage();var horse=new Horse();horse.setHorseId("HOR");
  var product=new TrainingPackage();product.setPackageId("PKG");product.setPackageName("Basic");
  pack.setHorse(horse);pack.setTrainingPackage(product);pack.setStatus("COMPLETED");pack.setPaymentStatus("PAID");
  pack.setStartDate(LocalDate.now().minusDays(30));pack.setEndDate(LocalDate.now().minusDays(1));
  when(guard.visiblePackage("HPG")).thenReturn(pack);
  when(guard.medical(horse)).thenThrow(new BusinessRuleException("No confirmed examination"));
  var service=new TrainingPackageContextService(mock(JdbcTemplate.class),guard,roadmaps);
  for(var code:java.util.List.of("ROADMAP_MISSING","STAGES_MISSING","ROADMAP_INVALID")){
   when(roadmaps.inspect("PKG")).thenReturn(new PackageRoadmapTemplateService.Inspection(null,code));
   var context=service.context("HPG");assertEquals("HPG",context.get("horsePackageId"));
   assertEquals("COMPLETED",context.get("packageStatus"));assertEquals(false,context.get("roadmapConfigured"));
   assertEquals(code,context.get("roadmapConfigurationReason"));assertNull(context.get("roadmapTemplate"));
  }
  when(roadmaps.inspect("PKG")).thenThrow(new DataAccessResourceFailureException("Database unavailable"));
  assertThrows(DataAccessResourceFailureException.class,()->service.context("HPG"));
 }
}