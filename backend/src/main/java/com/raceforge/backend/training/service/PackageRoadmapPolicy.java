package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import java.util.*;
import org.springframework.stereotype.Component;

/** Product curriculum, not a veterinary exercise prescription. Never changes supplied workload. */
@Component
public class PackageRoadmapPolicy {
    public static final String VERSION="PACKAGE_CURRICULUM_V2";
    public record Focus(String code,String title,String objective) { }
    public record Phase(String phaseCode,String title,String objective,int startDay,int endDay) { }
    public record Template(String packageType,String title,String goal,String roadmapVersion,
                           int durationDays,List<Phase> phases,List<String> sources,String workloadPolicy) { }
    public record Part(Stage activity,Phase phase) { }
    private record Curriculum(String title,String goal,List<Focus> phases,List<String> sources) { }
    private static final String CONDITIONING="https://horses.extension.org/basic-conditioning-of-the-equine-athlete/";
    private static final String FATIGUE="https://www.merckvetmanual.com/metabolic-disorders/fatigue-and-exercise-in-horses/prevention-of-fatigue-in-horses";
    private static final String BEHAVIOR="https://www.merckvetmanual.com/horse-owners/behavior-of-horses/treatment-of-behavior-problems-in-horses";
    private static final String REHAB="https://horsereport.vetmed.ucdavis.edu/news/exercise-therapy";
    private static final Map<String,Curriculum> TYPES=Map.of(
        "BASIC",new Curriculum("Foundation training","Establish a consistent foundation and review readiness for further training.",List.of(
            new Focus("BASIC_ROUTINE","Familiarization and routine","Record response to the trainer, familiar cues and the agreed routine."),
            new Focus("BASIC_FOUNDATION","Basic cues and foundation practice","Practice consistent basic responses within the supplied activity plan."),
            new Focus("BASIC_REVIEW","Foundation review","Review learned responses and document objectives for the next plan.")),List.of(BEHAVIOR,CONDITIONING)),
        "RACING",new Curriculum("Race preparation","Prepare and review race-specific skills within an individually approved workload.",List.of(
            new Focus("RACING_BASELINE","Racing baseline","Document the starting condition and skills needed for the intended racing activity."),
            new Focus("RACING_SKILLS","Start practice and race pacing","Practice the race-specific tasks chosen by the trainer and veterinarian."),
            new Focus("RACING_CONSOLIDATION","Combined race skills","Record consistency of race-specific responses under the approved activity plan."),
            new Focus("RACING_REVIEW","Racing readiness review","Review preparation and exercise response; this is not automatic competition clearance.")),List.of(CONDITIONING,FATIGUE)),
        "PERFORMANCE",new Curriculum("Performance development","Improve and assess selected skills against the horse's own recorded baseline.",List.of(
            new Focus("PERFORMANCE_BASELINE","Performance baseline","Record the selected skill and its baseline observations."),
            new Focus("PERFORMANCE_TECHNIQUE","Technique practice","Practice the specific technique identified in the individual training goal."),
            new Focus("PERFORMANCE_CONSISTENCY","Consistency practice","Record repeatability and quality of the selected skill under the approved workload."),
            new Focus("PERFORMANCE_REVIEW","Performance comparison","Compare observations with the initial baseline and record the next goals.")),List.of(CONDITIONING,FATIGUE)),
        "RECOVERY",new Curriculum("Veterinarian-directed return to activity","Follow individually authorized activity and document response for veterinary reassessment.",List.of(
            new Focus("RECOVERY_CHECKIN","Veterinary activity review","Review the confirmed clearance and individual activity restrictions before exercise."),
            new Focus("RECOVERY_CONTROLLED","Controlled activity within medical restrictions","Follow the individually prescribed activity and record the observed response."),
            new Focus("RECOVERY_REASSESS","Recovery reassessment","Document progress for veterinary reassessment before returning to regular training.")),List.of(REHAB))
    );

    public Template template(String type,int days) {
        Curriculum curriculum=TYPES.get(type);
        if(curriculum==null)throw new BusinessRuleException("Unsupported roadmap package type: "+type);
        if(days<1)throw new BusinessRuleException("A positive package period is required");
        List<Phase> phases=new ArrayList<>();
        if(days<curriculum.phases().size()) {
            // A short product combines focus labels; no exercise dose is compressed or increased.
            phases.add(new Phase(type+"_COMBINED",curriculum.title()+" — combined review",
                String.join(" ",curriculum.phases().stream().map(Focus::objective).toList()),1,days));
        } else {
            for(int i=0;i<curriculum.phases().size();i++) {
                Focus focus=curriculum.phases().get(i);
                phases.add(new Phase(focus.code(),focus.title(),focus.objective(),
                    i*days/curriculum.phases().size()+1,(i+1)*days/curriculum.phases().size()));
            }
        }
        return new Template(type,curriculum.title(),curriculum.goal(),VERSION,days,List.copyOf(phases),curriculum.sources(),
            "Phase dates are application planning defaults, not clinical progression criteria. Activity, intensity, weekdays and time are supplied separately and are never increased by this template. Vet clearance and trainer confirmation remain required.");
    }

    /** Editable scheduling defaults, not an exercise dose derived from medical measurements. */
    public List<Stage> suggestedStages(Template template) {
        Set<java.time.DayOfWeek> days=switch(template.packageType()) {
            case "RACING" -> Set.of(java.time.DayOfWeek.MONDAY,java.time.DayOfWeek.TUESDAY,java.time.DayOfWeek.THURSDAY,java.time.DayOfWeek.SATURDAY);
            case "PERFORMANCE" -> Set.of(java.time.DayOfWeek.MONDAY,java.time.DayOfWeek.WEDNESDAY,java.time.DayOfWeek.FRIDAY,java.time.DayOfWeek.SATURDAY);
            default -> Set.of(java.time.DayOfWeek.MONDAY,java.time.DayOfWeek.WEDNESDAY,java.time.DayOfWeek.FRIDAY);
        };
        int minutes=switch(template.packageType()){case "BASIC" -> 30;case "RACING" -> 40;case "PERFORMANCE" -> 35;case "RECOVERY" -> 20;default -> throw new BusinessRuleException("Unsupported package type");};
        return template.phases().stream().map(phase -> new Stage(phase.startDay(),phase.endDay(),phase.title(),"LOW",days,
            java.time.LocalTime.of(7,0),java.time.LocalTime.of(7,0).plusMinutes(minutes))).toList();
    }

    public List<Part> apply(String type,List<Stage> stages,int days) {
        TrainingRecommendationService.validateStages(stages,days);
        List<Part> result=new ArrayList<>();
        for(Stage stage:stages.stream().sorted(Comparator.comparingInt(Stage::startDay)).toList()) {
            for(Phase phase:template(type,days).phases()) {
                int start=Math.max(stage.startDay(),phase.startDay()),end=Math.min(stage.endDay(),phase.endDay());
                if(start<=end) result.add(new Part(new Stage(start,end,stage.activityName(),stage.intensity(),stage.daysOfWeek(),stage.sessionTime(),stage.sessionEndTime()),phase));
            }
        }
        return List.copyOf(result);
    }
}
