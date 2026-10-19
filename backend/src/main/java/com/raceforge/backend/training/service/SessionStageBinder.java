package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingStageRepository;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

/** All single, recurring and generated sessions inherit the saved curriculum activity. */
@Component
public class SessionStageBinder {
    private final TrainingStageRepository stages;
    private final HorsePackageRepository packages;
    private final TrainingCalendarRules calendar;
    public SessionStageBinder(TrainingStageRepository stages,HorsePackageRepository packages,TrainingCalendarRules calendar) {
        this.stages=stages;this.packages=packages;this.calendar=calendar;
    }
    public void bind(TrainingSession session) {
        var plan=session.getPlan();
        var pack=packages.findById(plan.getHorsePackageId()).orElseThrow(()->new BusinessRuleException("Plan package is missing"));
        int day=Math.toIntExact(ChronoUnit.DAYS.between(pack.getStartDate(),session.getScheduledStart().toLocalDate())+1);
        var matches=stages.findForDay(plan.getPlanId(),day);
        if(matches.size()!=1)throw new BusinessRuleException("Session date must belong to one saved roadmap stage; rest gaps cannot be scheduled");
        var stage=matches.get(0);
        if(stage.getPhaseCode()==null||stage.getTitle()==null)throw new BusinessRuleException("This legacy roadmap has no package curriculum; review its stages or create a new plan before scheduling");
        if(session.getScheduledEnd()==null){
            if(stage.getSessionEndTime()==null)throw new BusinessRuleException("Enter a planned end time in the roadmap before scheduling");
            session.setScheduledEnd(java.time.LocalDateTime.of(session.getScheduledStart().toLocalDate(),stage.getSessionEndTime()));
        }
        calendar.validateSlot(session.getHorse().getHorseId(),session.getScheduledStart(),session.getScheduledEnd());
        session.setTrainingStage(stage);
        session.setIntensity(stage.getIntensity());
        session.setNotes(stage.getTitle()+" — "+stage.getActivityName());
    }
}
