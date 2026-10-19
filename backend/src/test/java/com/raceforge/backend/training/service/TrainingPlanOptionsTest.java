// Pre-String ID test retained for reference, superseded by StringTrainingWorkflowIT and StringIdContractTest.
// package com.raceforge.backend.training.service;
// import static org.junit.jupiter.api.Assertions.*;
// import static org.mockito.Mockito.*;
// import com.raceforge.backend.horse.repository.HorseRepository;
// import com.raceforge.backend.training.entity.*;
// import com.raceforge.backend.training.repository.HorsePlanRepository;
// import com.raceforge.backend.common.exception.ResourceNotFoundException;
// import java.time.LocalDate;
// import java.util.List;
// import org.junit.jupiter.api.Test;
// import org.springframework.test.util.ReflectionTestUtils;
// class TrainingPlanOptionsTest {
//     final HorseRepository horses=mock(HorseRepository.class);
//     final HorsePlanRepository links=mock(HorsePlanRepository.class);
//     final TrainingPlanService service=new TrainingPlanService();
//     TrainingPlanOptionsTest(){ReflectionTestUtils.setField(service,"horseRepository",horses);ReflectionTestUtils.setField(service,"horsePlanRepository",links);}
//     @Test void readsDatesAndAssignmentStatusFromHorsePlan(){
//         when(horses.existsById(7)).thenReturn(true);
//         var plan=new TrainingPlan();plan.setPlanId(3);plan.setPlanName("Endurance");plan.setStatus("ACTIVE");
//         var link=new HorsePlan();link.setPlan(plan);link.setStatus("PAUSED");link.setStartDate(LocalDate.of(2026,10,14));link.setEndDate(LocalDate.of(2026,11,3));
//         when(links.findById_HorseIdOrderById_PlanIdDesc(7)).thenReturn(List.of(link));
//         var result=service.getPlansForHorse(7);assertEquals(1,result.size());
//         assertEquals("Endurance",result.get(0).planName());assertEquals(7,result.get(0).horseId());
//         assertEquals(link.getStartDate(),result.get(0).startDate());assertEquals(link.getEndDate(),result.get(0).endDate());
//         assertEquals("PAUSED",result.get(0).horsePlanStatus());verify(links).findById_HorseIdOrderById_PlanIdDesc(7);
//     }
//     @Test void missingHorseIsNotReturnedAsAnEmptyPlanList(){
//         assertThrows(ResourceNotFoundException.class,()->service.getPlansForHorse(99));verifyNoInteractions(links);
//     }
// }
// 