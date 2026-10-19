package com.raceforge.backend.training;
import static org.junit.jupiter.api.Assertions.*;
import com.raceforge.backend.training.service.PackageRoadmapPolicy;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import com.raceforge.backend.common.exception.BusinessRuleException;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class PackageRoadmapPolicyTest {
    final PackageRoadmapPolicy policy=new PackageRoadmapPolicy();
    Stage activity(int from,int to){return new Stage(from,to,"Approved activity","LOW",Set.of(DayOfWeek.MONDAY,DayOfWeek.FRIDAY),LocalTime.of(7,0),LocalTime.of(8,0));}
    @Test void fourTypesHaveDifferentOrderedGoalsAndCoverTheProductPeriod(){
        Set<String> goals=new HashSet<>(),codes=new HashSet<>();
        for(String type:List.of("BASIC","RACING","PERFORMANCE","RECOVERY")){
            var template=policy.template(type,31);goals.add(template.goal());int next=1;
            for(var phase:template.phases()){
                assertEquals(next,phase.startDay());assertTrue(phase.endDay()>=phase.startDay());next=phase.endDay()+1;
                assertTrue(phase.phaseCode().startsWith(type+"_"));assertTrue(codes.add(phase.phaseCode()));assertFalse(phase.objective().isBlank());
            }
            assertEquals(32,next);
        }
        assertEquals(4,goals.size());assertEquals(3,policy.template("BASIC",30).phases().size());assertEquals(4,policy.template("RACING",30).phases().size());
    }
    @Test void applyingCurriculumPreservesApprovedActivityDaysTimeAndIntensity(){
        for(String type:List.of("BASIC","RACING","PERFORMANCE","RECOVERY")){
            var parts=policy.apply(type,List.of(activity(1,12),activity(15,30)),30);Set<Integer> covered=new HashSet<>();
            for(var part:parts){
                var a=part.activity();assertEquals("Approved activity",a.activityName());assertEquals("LOW",a.intensity());assertEquals(LocalTime.of(7,0),a.sessionTime());assertEquals(Set.of(DayOfWeek.MONDAY,DayOfWeek.FRIDAY),a.daysOfWeek());
                for(int d=a.startDay();d<=a.endDay();d++)assertTrue(covered.add(d));
            }
            assertEquals(28,covered.size());assertFalse(covered.contains(13));assertFalse(covered.contains(14));
        }
    }
    @Test void shortPackagesCombineObjectivesWithoutZeroDayPhases(){
        var t=policy.template("RACING",1);assertEquals(1,t.phases().size());assertEquals(1,t.phases().get(0).startDay());assertEquals(1,t.phases().get(0).endDay());assertEquals("RACING_COMBINED",t.phases().get(0).phaseCode());
    }
    @Test void unsupportedTypesAndInvalidPeriodsAreRejected(){
        assertThrows(BusinessRuleException.class,()->policy.template("PREMIUM",30));assertThrows(BusinessRuleException.class,()->policy.template("BASIC",0));
    }
}
