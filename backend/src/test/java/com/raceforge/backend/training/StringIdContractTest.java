package com.raceforge.backend.training;
import static org.junit.jupiter.api.Assertions.*;
import com.raceforge.backend.training.service.TrainingRecommendationService;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import com.raceforge.backend.common.exception.BusinessRuleException;
import java.time.*;
import java.util.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
class StringIdContractTest {
 @Test void allActiveEntityPrimaryKeysAreStringOrCompositeString() throws Exception {
  var scanner=new ClassPathScanningCandidateComponentProvider(false);scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));int found=0;
  for(var candidate:scanner.findCandidateComponents("com.raceforge.backend")){
   Class<?> type=Class.forName(candidate.getBeanClassName());
   for(var field:type.getDeclaredFields()){
    if(field.isAnnotationPresent(Id.class)){assertEquals(String.class,field.getType(),type.getName()+"."+field.getName());assertFalse(field.isAnnotationPresent(GeneratedValue.class));found++;}
    if(field.isAnnotationPresent(EmbeddedId.class))for(var key:field.getType().getDeclaredFields())if(!java.lang.reflect.Modifier.isStatic(key.getModifiers()))assertEquals(String.class,key.getType());
   }
  }
  assertTrue(found>=15);
 }
 Stage stage(int from,int to){return new Stage(from,to,"Walk","LOW",Set.of(DayOfWeek.MONDAY),LocalTime.of(7,0),LocalTime.of(8,0));}
 @Test void stageBoundsAndOverlapsAreRejected(){
  assertThrows(BusinessRuleException.class,()->TrainingRecommendationService.validateStages(List.of(stage(1,7),stage(7,10)),30));
  assertThrows(BusinessRuleException.class,()->TrainingRecommendationService.validateStages(List.of(stage(1,31)),30));
  assertThrows(BusinessRuleException.class,()->TrainingRecommendationService.validateStages(List.of(),30));
 }
 @Test void validProgressiveStagesMayIncludeRestGaps(){assertDoesNotThrow(()->TrainingRecommendationService.validateStages(List.of(stage(1,7),stage(9,30)),30));}
}
