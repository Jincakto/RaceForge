// Pre-String ID test retained for reference, superseded by StringTrainingWorkflowIT and StringIdContractTest.
// package com.raceforge.backend.training.service;
// 
// import static org.junit.jupiter.api.Assertions.*;
// import static org.mockito.Mockito.*;
// import com.raceforge.backend.common.exception.BusinessRuleException;
// import com.raceforge.backend.horse.entity.Horse;
// import com.raceforge.backend.horse.repository.HorseRepository;
// import com.raceforge.backend.training.dto.ScheduleRecurringRequest;
// import com.raceforge.backend.training.entity.*;
// import com.raceforge.backend.training.mapper.TrainingSessionMapper;
// import com.raceforge.backend.training.repository.*;
// import java.time.*;
// import java.util.*;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.Test;
// import org.mockito.ArgumentCaptor;
// import org.springframework.test.util.ReflectionTestUtils;
// import jakarta.validation.Validation;
// 
// class PackageRecurringScheduleTest {
//     final TrainingScheduleService service = new TrainingScheduleService();
//     final TrainingPlanRepository plans = mock(TrainingPlanRepository.class);
//     final TrainingSessionRepository sessions = mock(TrainingSessionRepository.class);
//     final HorsePackageRepository packages = mock(HorsePackageRepository.class);
//     final HorseRepository horses = mock(HorseRepository.class);
//     final TrainingPlanHorseResolver resolver = mock(TrainingPlanHorseResolver.class);
//     final TrainingSessionRules rules = mock(TrainingSessionRules.class);
//     final Horse horse = new Horse();
//     final HorsePackage pack = new HorsePackage();
//     final TrainingPlan plan = new TrainingPlan();
//     final ScheduleRecurringRequest request = new ScheduleRecurringRequest();
// 
//     @BeforeEach void setup() {
//         ReflectionTestUtils.setField(service,"planRepository",plans);
//         ReflectionTestUtils.setField(service,"sessionRepository",sessions);
//         ReflectionTestUtils.setField(service,"horsePackageRepository",packages);
//         ReflectionTestUtils.setField(service,"horseRepository",horses);
//         ReflectionTestUtils.setField(service,"horseResolver",resolver);
//         ReflectionTestUtils.setField(service,"rules",rules);
//         ReflectionTestUtils.setField(service,"sessionMapper",mock(TrainingSessionMapper.class));
//         horse.setHorseId(7); plan.setPlanId(3);
//         pack.setHorse(horse); pack.setHorsePackageId(9); pack.setStatus("ACTIVE"); pack.setPaymentStatus("PAID");
//         pack.setStartDate(LocalDate.of(2026,10,14)); pack.setEndDate(LocalDate.of(2026,11,12));
//         TrainingPackage catalog = new TrainingPackage(); catalog.setPackageName("Basic Training"); pack.setTrainingPackage(catalog);
//         request.setHorseId(7); request.setPlanId(3); request.setHorsePackageId(9); request.setActivityName("Endurance");
//         request.setDaysOfWeek(Set.of(DayOfWeek.MONDAY,DayOfWeek.WEDNESDAY,DayOfWeek.FRIDAY));
//         when(plans.findById(3)).thenReturn(Optional.of(plan));
//         when(resolver.resolve(3,7)).thenReturn(horse); when(rules.lockHorse(7)).thenReturn(horse);
//         when(packages.findById(9)).thenReturn(Optional.of(pack));
//         when(sessions.saveAll(anyList())).thenAnswer(invocation->invocation.getArgument(0));
//     }
//     @Test void thirtyDaysIncludesPartialFinalWeekWithoutRoundingOrExtraDates() {
//         service.createRecurringSchedule(request);
//         ArgumentCaptor<List<TrainingSession>> saved = ArgumentCaptor.forClass(List.class);
//         verify(sessions).saveAll(saved.capture());
//         var dates=saved.getValue().stream().map(s->s.getScheduledStart().toLocalDate()).toList();
//         assertEquals(13,dates.size()); assertEquals(LocalDate.of(2026,10,14),dates.get(0));
//         assertEquals(LocalDate.of(2026,11,11),dates.get(dates.size()-1));
//         assertTrue(dates.stream().allMatch(d->!d.isBefore(pack.getStartDate())&&!d.isAfter(pack.getEndDate())));
//         assertTrue(saved.getValue().stream().allMatch(s->s.getScheduledStart().toLocalTime().equals(LocalTime.of(7,0))));
//     }
//     @Test void includesBothEndpointsAndChosenTime() {
//         pack.setEndDate(pack.getStartDate()); request.setSessionTime(LocalTime.of(18,30));
//         var result=service.createRecurringSchedule(request); assertEquals(1,result.size());
//         verify(sessions).existsByHorse_HorseIdAndScheduledStart(7,LocalDateTime.of(2026,10,14,18,30));
//     }
//     @Test void anotherHorsesPackageRejectedBeforeSaving() {
//         Horse other=new Horse(); other.setHorseId(8); pack.setHorse(other);
//         assertThrows(BusinessRuleException.class,()->service.createRecurringSchedule(request)); verify(sessions,never()).saveAll(any());
//     }
//     @Test void pausedOrUnpaidOrInvalidDatesRejected() {
//         pack.setStatus("PAUSED"); assertThrows(BusinessRuleException.class,()->service.createRecurringSchedule(request));
//         pack.setStatus("ACTIVE");pack.setPaymentStatus("PENDING"); assertThrows(BusinessRuleException.class,()->service.createRecurringSchedule(request));
//         pack.setPaymentStatus("PAID");pack.setEndDate(null); assertThrows(BusinessRuleException.class,()->service.createRecurringSchedule(request));
//         verify(sessions,never()).saveAll(any());
//     }
//     @Test void conflictOnLastDateDoesNotSavePartialBatch() {
//         when(sessions.existsByHorse_HorseIdAndScheduledStart(7,LocalDateTime.of(2026,11,11,7,0))).thenReturn(true);
//         assertThrows(BusinessRuleException.class,()->service.createRecurringSchedule(request)); verify(sessions,never()).saveAll(any());
//     }
//     @Test void narrowPlanReportsPackageAndDateWithoutSaving() {
//         doThrow(new BusinessRuleException("Session date is outside the horse-plan date range.")).when(resolver).validateSchedule(plan,7,LocalDate.of(2026,11,11));
//         var error=assertThrows(BusinessRuleException.class,()->service.createRecurringSchedule(request));
//         assertTrue(error.getMessage().contains("Basic Training"));assertTrue(error.getMessage().contains("2026-11-11"));
//         verify(sessions,never()).saveAll(any());
//     }
//     @Test void noMatchingWeekdayIsAnErrorInsteadOfEmptySuccess() {
//         pack.setEndDate(pack.getStartDate());request.setDaysOfWeek(Set.of(DayOfWeek.SUNDAY));
//         assertThrows(BusinessRuleException.class,()->service.createRecurringSchedule(request));verify(sessions,never()).saveAll(any());
//     }
//     @Test void requestRequiresRegisteredPackageAndWeekdays() {
//         try(var factory=Validation.buildDefaultValidatorFactory()) {
//             request.setHorsePackageId(null);request.setDaysOfWeek(Set.of());
//             var names=factory.getValidator().validate(request).stream().map(v->v.getPropertyPath().toString()).toList();
//             assertTrue(names.contains("horsePackageId"));assertTrue(names.contains("daysOfWeek"));
//         }
//     }
//     @Test void schedulingReadReturnsOnlyUsablePackages() {
//         when(horses.existsById(7)).thenReturn(true);
//         HorsePackage unpaid=new HorsePackage();unpaid.setStatus("ACTIVE");unpaid.setPaymentStatus("PENDING");
//         when(packages.findByHorse_HorseIdAndStatus(7,"ACTIVE")).thenReturn(List.of(pack,unpaid));
//         var result=service.getSchedulingPackages(7);
//         assertEquals(1,result.size());assertEquals("Basic Training",result.get(0).packageName());assertEquals(9,result.get(0).horsePackageId());
//     }
// }
// 