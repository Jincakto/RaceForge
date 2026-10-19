package com.raceforge.backend.medical.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.medical.dto.MedicalAssignmentCreateRequest;
import com.raceforge.backend.medical.dto.MedicalAssignmentDeclineRequest;
import com.raceforge.backend.medical.dto.MedicalAssignmentResponse;
import com.raceforge.backend.medical.service.MedicalAssignmentService;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical/assignments")
public class MedicalAssignmentController {

    private final MedicalAssignmentService service;

    public MedicalAssignmentController(MedicalAssignmentService service) {
        this.service = service;
    }

    @PostMapping("/horses/{horseId}")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ResponseEntity<ApiResponse<MedicalAssignmentResponse>> assign(
            @PathVariable String horseId,
            @Valid @RequestBody MedicalAssignmentCreateRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Veterinarian assigned", service.assign(horseId, request.veterinarianId(), actor.userId())));
    }

    @PostMapping("/{assignmentId}/accept")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<MedicalAssignmentResponse> accept(
            @PathVariable Integer assignmentId,
            @AuthenticationPrincipal AuthenticatedUser actor) {
        return ApiResponse.success("Assignment accepted", service.accept(assignmentId, actor.userId()));
    }

    @PostMapping("/{assignmentId}/decline")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<MedicalAssignmentResponse> decline(
            @PathVariable Integer assignmentId,
            @Valid @RequestBody MedicalAssignmentDeclineRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor) {
        return ApiResponse.success("Assignment declined",
                service.decline(assignmentId, actor.userId(), request.reason()));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<List<MedicalAssignmentResponse>> mine(@AuthenticationPrincipal AuthenticatedUser actor) {
        return ApiResponse.success("My assignments", service.myAssignments(actor.userId()));
    }

    @GetMapping("/mine/accepted-horses")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<List<MedicalAssignmentResponse>> accepted(
            @AuthenticationPrincipal AuthenticatedUser actor) {
        return ApiResponse.success("Horses ready for examination", service.acceptedHorses(actor.userId()));
    }

    @GetMapping("/mine/history")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<List<MedicalAssignmentResponse>> myHistory(
            @AuthenticationPrincipal AuthenticatedUser actor) {
        return ApiResponse.success("My assignment history", service.myHistory(actor.userId()));
    }

    @GetMapping("/declined")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<List<MedicalAssignmentResponse>> declined(
            @AuthenticationPrincipal AuthenticatedUser actor) {
        return ApiResponse.success("Declined veterinary assignments", service.declinedAssignments(actor.userId()));
    }

    @GetMapping("/horses/{horseId}")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<List<MedicalAssignmentResponse>> history(@PathVariable String horseId) {
        return ApiResponse.success("Assignment history", service.horseHistory(horseId));
    }
}
