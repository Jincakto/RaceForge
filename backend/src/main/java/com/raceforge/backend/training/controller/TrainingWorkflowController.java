package com.raceforge.backend.training.controller;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.*;
import com.raceforge.backend.training.service.*;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api")
@Tag(name="Trainer assignments and roadmaps")
public class TrainingWorkflowController {
 private static final String MANAGER="hasAuthority('CLUB_MANAGER') and @permissionAccess.has(authentication,'ASSIGN_TRAINER')";
 private static final String TRAINER="hasAuthority('HEAD_TRAINER') and @permissionAccess.has(authentication,'MANAGE_TRAINING')";
 private final TrainerAssignmentService assignments;private final TrainingRecommendationService recommendations;private final TrainingRoadmapService roadmaps;
 public TrainingWorkflowController(TrainerAssignmentService assignments,TrainingRecommendationService recommendations,TrainingRoadmapService roadmaps){this.assignments=assignments;this.recommendations=recommendations;this.roadmaps=roadmaps;}
 @PostMapping("/trainer-profiles") @PreAuthorize("hasAuthority('ADMIN') and @permissionAccess.has(authentication,'MANAGE_ACCOUNTS')")
 public Object createProfile(@Valid @RequestBody ProfileRequest body){return ApiResponse.success("Trainer profile created",assignments.createProfile(body));}
 @GetMapping("/trainer-profiles") @PreAuthorize("hasAnyAuthority('ADMIN','CLUB_MANAGER')")
 public Object profiles(){return ApiResponse.success("Trainer profiles",assignments.profiles());}
 @GetMapping("/trainer-profiles/{id}") @PreAuthorize("hasAnyAuthority('ADMIN','CLUB_MANAGER','HEAD_TRAINER')")
 public Object profile(@PathVariable String id){return ApiResponse.success("Trainer profile",assignments.profile(id));}
 @PutMapping("/trainer-profiles/{id}") @PreAuthorize("hasAnyAuthority('ADMIN','HEAD_TRAINER')")
 public Object updateProfile(@PathVariable String id,@Valid @RequestBody ProfileUpdate body){return ApiResponse.success("Trainer profile updated",assignments.updateProfile(id,body));}
 @PatchMapping("/trainer-profiles/{id}/status") @PreAuthorize("hasAuthority('ADMIN') and @permissionAccess.has(authentication,'MANAGE_ACCOUNTS')")
 public Object profileStatus(@PathVariable String id,@Valid @RequestBody ProfileStatus body){return ApiResponse.success("Trainer profile status updated",assignments.profileStatus(id,body.status()));}
 @GetMapping("/trainer-profiles/{id}/history") @PreAuthorize("hasAnyAuthority('ADMIN','CLUB_MANAGER','HEAD_TRAINER')")
 public Object history(@PathVariable String id){return ApiResponse.success("Trainer history",assignments.history(id));}
 @GetMapping("/trainer-profiles/{id}/sessions") @PreAuthorize("hasAnyAuthority('ADMIN','CLUB_MANAGER','HEAD_TRAINER')")
 public Object trainerSessions(@PathVariable String id){return ApiResponse.success("Trainer recorded session history",assignments.sessionHistory(id));}
 @PostMapping("/trainer-assignments") @PreAuthorize(MANAGER)
 public Object assign(@Valid @RequestBody AssignmentRequest body){return ApiResponse.success("Trainer assigned",assignments.assign(body));}
 @GetMapping("/trainer-assignments/me") @PreAuthorize(TRAINER)
 public Object mine(){return ApiResponse.success("My assignments",assignments.mine());}
 @PostMapping("/trainer-assignments/{id}/respond") @PreAuthorize(TRAINER)
 public Object respond(@PathVariable String id,@Valid @RequestBody Decision body){return ApiResponse.success("Assignment answered",assignments.respond(id,body));}
 @PostMapping("/trainer-assignments/{id}/end") @PreAuthorize(MANAGER)
 public Object end(@PathVariable String id,@Valid @RequestBody Reason body){return ApiResponse.success("Assignment ended",assignments.end(id,body.reason()));}
 @PostMapping("/trainer-assignments/{id}/replace") @PreAuthorize(MANAGER)
 public Object replace(@PathVariable String id,@Valid @RequestBody Replacement body){return ApiResponse.success("Replacement pending trainer acceptance",assignments.replace(id,body));}
 @GetMapping("/horse-packages/{id}/trainer-assignments")
 public Object forPackage(@PathVariable String id){return ApiResponse.success("Package assignment history",assignments.forPackage(id));}
 @PostMapping("/training-protocols") @PreAuthorize("hasAuthority('VETERINARIAN')")
 public Object protocol(@Valid @RequestBody ProtocolRequest body){return ApiResponse.success("Draft protocol created",recommendations.createProtocol(body));}
 @GetMapping("/training-protocols") @PreAuthorize("hasAnyAuthority('VETERINARIAN','HEAD_TRAINER','CLUB_MANAGER')")
 public Object protocols(){return ApiResponse.success("Training protocols",recommendations.protocols());}
 @PostMapping("/training-protocols/{id}/approve") @PreAuthorize("hasAuthority('VETERINARIAN')")
 public Object approve(@PathVariable String id){return ApiResponse.success("Protocol approved by veterinarian",recommendations.approveProtocol(id));}
 @PostMapping("/training-protocols/{id}/retire") @PreAuthorize("hasAuthority('VETERINARIAN')")
 public Object retire(@PathVariable String id){return ApiResponse.success("Protocol retired",recommendations.retireProtocol(id));}
 @PostMapping("/horse-packages/{id}/training-recommendations") @PreAuthorize(TRAINER)
 public Object recommend(@PathVariable String id,@Valid @RequestBody RecommendationRequest body){return ApiResponse.success("Draft suggestion requires trainer confirmation",recommendations.recommend(id,body));}
 @GetMapping("/horse-packages/{id}/training-context") @PreAuthorize(TRAINER)
 public Object context(@PathVariable String id){return ApiResponse.success("Horse and medical information for training",recommendations.context(id));}
 @GetMapping("/training-recommendations/{id}") @PreAuthorize(TRAINER)
 public Object recommendation(@PathVariable String id){return ApiResponse.success("Saved training suggestion and evidence",recommendations.savedRecommendation(id));}
 @GetMapping("/training-plans/{id}/stages") @PreAuthorize(TRAINER)
 public Object stages(@PathVariable String id){return ApiResponse.success("Training roadmap",roadmaps.stages(id));}
 @PutMapping("/training-plans/{id}/stages") @PreAuthorize(TRAINER)
 public Object stages(@PathVariable String id,@Valid @RequestBody StagesRequest body){return ApiResponse.success("Training roadmap updated",roadmaps.replace(id,body.stages()));}
 @GetMapping("/horse-packages/{id}/roadmap-template") @PreAuthorize(TRAINER)
 public Object registeredTemplate(@PathVariable String id){return ApiResponse.success("Package-specific roadmap template",recommendations.registeredTemplate(id));}
 @GetMapping("/training-packages/{id}/roadmap-template") @PreAuthorize("hasAnyAuthority('HORSE_OWNER','HEAD_TRAINER','CLUB_MANAGER','VETERINARIAN','ADMIN')")
 public Object catalogTemplate(@PathVariable String id){return ApiResponse.success("Package curriculum preview",recommendations.catalogTemplate(id));}
 @PostMapping("/training-plans/{id}/generate-sessions") @PreAuthorize(TRAINER)
 public Object generate(@PathVariable String id,@Valid @RequestBody GenerateRequest body){return ApiResponse.success("Roadmap sessions generated",roadmaps.generate(id));}
}
