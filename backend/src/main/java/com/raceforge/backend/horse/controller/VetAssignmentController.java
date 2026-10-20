package com.raceforge.backend.horse.controller;
import com.raceforge.backend.horse.service.VetAssignmentService;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api")
public class VetAssignmentController {
 private final VetAssignmentService service;public VetAssignmentController(VetAssignmentService service){this.service=service;}
 public record Draft(@NotBlank String medicalRecordId){}
 public record Assign(@NotBlank String veterinarianId){}
 public record Respond(@NotNull Boolean accepted,@Size(max=1000) String reason){}
 public record Replace(@NotBlank String veterinarianId,@NotBlank @Size(max=1000) String reason){}
 @PostMapping("/horses/{horseId}/vet-assignments") @PreAuthorize("hasAuthority('CLUB_MANAGER')")
 public Object assign(@PathVariable String horseId,@Valid @RequestBody Assign body,@AuthenticationPrincipal AuthenticatedUser actor){return ApiResponse.success("Veterinarian assigned",service.assign(horseId,body.veterinarianId(),actor.userId()));}
 @GetMapping("/vet-assignments/me") @PreAuthorize("hasAuthority('VETERINARIAN')")
 public Object mine(@AuthenticationPrincipal AuthenticatedUser actor){return ApiResponse.success("My veterinary assignments",service.mine(actor.userId()));}
 @PostMapping("/vet-assignments/{id}/respond") @PreAuthorize("hasAuthority('VETERINARIAN')")
 public Object respond(@PathVariable String id,@Valid @RequestBody Respond body,@AuthenticationPrincipal AuthenticatedUser actor){return ApiResponse.success("Assignment answered",service.respond(id,actor.userId(),body.accepted(),body.reason()));}
 @PostMapping("/vet-assignments/{id}/attach-draft") @PreAuthorize("hasAuthority('VETERINARIAN')")
 public Object attachDraft(@PathVariable String id,@Valid @RequestBody Draft body,@AuthenticationPrincipal AuthenticatedUser actor){return ApiResponse.success("Existing draft linked",service.attachDraft(id,body.medicalRecordId(),actor.userId()));}
 @PostMapping("/vet-assignments/{id}/replace") @PreAuthorize("hasAuthority('CLUB_MANAGER')")
 public Object replace(@PathVariable String id,@Valid @RequestBody Replace body,@AuthenticationPrincipal AuthenticatedUser actor){return ApiResponse.success("Veterinarian replacement awaits acceptance",service.replace(id,body.veterinarianId(),actor.userId(),body.reason()));}
}
