package com.raceforge.backend.training;
import static org.junit.jupiter.api.Assertions.*;
import com.raceforge.backend.training.service.TrainingCalendarRules;
import com.raceforge.backend.common.exception.BusinessRuleException;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class TrainingCalendarRulesTest {
    final LocalDate monday=LocalDate.of(2026,10,19);
    List<LocalDate> days(int count){return java.util.stream.IntStream.range(0,count).mapToObj(monday::plusDays).toList();}
    @Test void sixDaysAreAllowedButSeventhDayIsRejected(){assertDoesNotThrow(()->TrainingCalendarRules.requireSixDayWeek(days(6)));assertThrows(BusinessRuleException.class,()->TrainingCalendarRules.requireSixDayWeek(days(7)));}
    @Test void multipleSessionsOnOneDayStillCountAsOneTrainingDay(){var dates=new ArrayList<>(days(6));dates.add(monday);dates.add(monday);assertDoesNotThrow(()->TrainingCalendarRules.requireSixDayWeek(dates));}
    @Test void mondayStartsANewWeek(){var dates=new ArrayList<>(days(6));dates.add(monday.plusWeeks(1));assertDoesNotThrow(()->TrainingCalendarRules.requireSixDayWeek(dates));}
    @Test void windowsMustHaveALaterEndOnTheSameDate(){var start=monday.atTime(7,0);assertDoesNotThrow(()->TrainingCalendarRules.requireWindow(start,start.plusHours(1)));assertThrows(BusinessRuleException.class,()->TrainingCalendarRules.requireWindow(start,start));assertThrows(BusinessRuleException.class,()->TrainingCalendarRules.requireWindow(start,start.minusMinutes(1)));assertThrows(BusinessRuleException.class,()->TrainingCalendarRules.requireWindow(start,start.plusDays(1)));}
}
