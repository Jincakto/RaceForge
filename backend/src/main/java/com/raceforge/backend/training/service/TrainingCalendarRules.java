package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Caller must hold the horse write lock when checking/inserting actual session slots. */
@Component
public class TrainingCalendarRules {
    private final JdbcTemplate jdbc;
    public TrainingCalendarRules(JdbcTemplate jdbc){this.jdbc=jdbc;}
    private static LocalDate week(LocalDate date){return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));}
    public static void requireSixDayWeek(Collection<LocalDate> dates){
        Map<LocalDate,Set<LocalDate>> weeks=new HashMap<>();
        for(LocalDate date:dates){
            var days=weeks.computeIfAbsent(week(date),ignored->new HashSet<>());days.add(date);
            if(days.size()>6)throw new BusinessRuleException("A horse may train on at most six distinct days in the Monday-to-Sunday week starting "+week(date));
        }
    }
    public static List<LocalDate> plannedDates(List<Stage> stages,LocalDate packageStart){
        List<LocalDate> result=new ArrayList<>();
        for(Stage stage:stages)for(int d=stage.startDay();d<=stage.endDay();d++){
            var date=packageStart.plusDays(d-1L);if(stage.daysOfWeek().contains(date.getDayOfWeek()))result.add(date);
        }
        return result;
    }
    public static void requireWindow(LocalDateTime start,LocalDateTime end){
        if(start==null||end==null||!end.isAfter(start)||!start.toLocalDate().equals(end.toLocalDate()))
            throw new BusinessRuleException("Planned start and end are required; end must be later on the same calendar day");
    }
    public void validateSlot(String horseId,LocalDateTime start,LocalDateTime end){
        validateSlot(horseId,start,end,"");
    }
    public void validateSlot(String horseId,LocalDateTime start,LocalDateTime end,String excludeSessionId){
        requireWindow(start,end);
        Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Session WHERE horse_id=? AND session_id<>? AND status IN ('SCHEDULED','COMPLETED') AND ((scheduled_end IS NULL AND CAST(scheduled_start AS date)=CAST(? AS date)) OR (scheduled_start<? AND scheduled_end>?))",Integer.class,horseId,excludeSessionId,start,end,start);
        if(count!=null&&count>0)throw new BusinessRuleException("The planned time window overlaps another session for this horse; legacy sessions without end times need review");
    }
    public void validateDates(String horseId,Collection<LocalDate> proposed){
        validateDates(horseId,proposed,"");
    }
    public void validateDates(String horseId,Collection<LocalDate> proposed,String excludeSessionId){
        requireSixDayWeek(proposed);
        Map<LocalDate,Set<LocalDate>> grouped=new HashMap<>();
        for(LocalDate date:proposed)grouped.computeIfAbsent(week(date),ignored->new HashSet<>()).add(date);
        for(var entry:grouped.entrySet()){
            LocalDate monday=entry.getKey();Set<LocalDate> combined=new HashSet<>(entry.getValue());
            combined.addAll(jdbc.query("SELECT DISTINCT CAST(scheduled_start AS date) FROM dbo.Training_Session WHERE horse_id=? AND session_id<>? AND status IN ('SCHEDULED','COMPLETED') AND scheduled_start>=? AND scheduled_start<?",(rs,row)->rs.getDate(1).toLocalDate(),horseId,excludeSessionId,monday.atStartOfDay(),monday.plusWeeks(1).atStartOfDay()));
            requireSixDayWeek(combined);
        }
    }
}
