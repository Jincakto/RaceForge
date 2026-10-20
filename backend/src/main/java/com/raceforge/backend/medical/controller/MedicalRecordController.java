package com.raceforge.backend.medical.controller;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.service.HorseAccess;
import com.raceforge.backend.medical.dto.*;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.service.MedicalRecordService;
import com.raceforge.backend.medical.service.TrainingLockService;
import com.raceforge.backend.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/medical")
@Tag(name = "Medical Records")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('VETERINARIAN','CLUB_MANAGER','HORSE_OWNER')")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final TrainingLockService trainingLockService;
    private final HealthProfileRepository healthProfileRepository;
    private final HorseAccess horseAccess;

    public MedicalRecordController(
            MedicalRecordService medicalRecordService,
            TrainingLockService trainingLockService,
            HealthProfileRepository healthProfileRepository,
            HorseAccess horseAccess) {
        this.medicalRecordService = medicalRecordService;
        this.trainingLockService = trainingLockService;
        this.healthProfileRepository = healthProfileRepository;
        this.horseAccess = horseAccess;
    }

    /** Preview for the four-step examination form; no database writes. */
    @PostMapping("/horses/{horseId}/evaluation")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<MedicalEvaluationPreviewResponse> previewEvaluation(
            @PathVariable String horseId,
            @RequestBody MedicalEvaluationPreviewRequest request,
            Authentication authentication) {
        return ApiResponse.success("Medical evaluation suggestion",
                medicalRecordService.previewEvaluation(
                        horseId, currentUser(authentication).userId(), request));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('VETERINARIAN')")
    @PostMapping("/records")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> createMedicalRecord(
<<<<<<< HEAD
            @Valid @RequestBody MedicalRecordCreateRequest request,
=======
            @jakarta.validation.Valid @RequestBody MedicalRecordCreateRequest request,
>>>>>>> 76de6e5 (luu code)
            Authentication authentication) {
        // Never trust the veterinarian ID provided by a client.
        request.setVeterinarianId(currentUser(authentication).userId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Medical record created",
                        medicalRecordService.createMedicalRecord(request)));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('VETERINARIAN','CLUB_MANAGER','HORSE_OWNER') and @medicalAccess.readRecord(authentication,#medicalRecordId)")
    @GetMapping("/records/{medicalRecordId}")
    @PreAuthorize("hasAnyAuthority('CLUB_MANAGER', 'VETERINARIAN', 'HORSE_OWNER')")
    @Transactional(readOnly = true)
    public ApiResponse<MedicalRecordResponse> getMedicalRecord(
            @PathVariable String medicalRecordId,
            Authentication authentication) {
        MedicalRecordResponse response = medicalRecordService.getMedicalRecordById(medicalRecordId);
        String horseId = healthProfileRepository.findById(response.getProfileId())
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"))
                .getHorse().getHorseId();
        requireHorseRead(authentication, horseId);
        return ApiResponse.success("Medical record retrieved", response);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('VETERINARIAN','CLUB_MANAGER','HORSE_OWNER') and @horseAccess.read(authentication,#horseId)")
    @GetMapping("/horses/{horseId}/records")
    @PreAuthorize("hasAnyAuthority('CLUB_MANAGER', 'VETERINARIAN', 'HORSE_OWNER') "
            + "and @horseAccess.read(authentication, #horseId)")
    public ApiResponse<List<MedicalRecordResponse>> getMedicalHistory(
<<<<<<< HEAD
            @PathVariable String horseId) {
=======
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
>>>>>>> 76de6e5 (luu code)
        return ApiResponse.success("Medical history retrieved",
                medicalRecordService.getMedicalHistory(horseId));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('VETERINARIAN','CLUB_MANAGER','HORSE_OWNER') and @horseAccess.read(authentication,#horseId)")
    @GetMapping("/horses/{horseId}/previous-examination")
    @PreAuthorize("hasAnyAuthority('CLUB_MANAGER', 'VETERINARIAN', 'HORSE_OWNER') "
            + "and @horseAccess.read(authentication, #horseId)")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getPreviousConfirmedExamination(
<<<<<<< HEAD
            @PathVariable String horseId) {
=======
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
>>>>>>> 76de6e5 (luu code)
        return medicalRecordService.getPreviousConfirmedExamination(horseId)
                .map(record -> ResponseEntity.ok(
                        ApiResponse.success("Previous examination retrieved", record)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('VETERINARIAN')")
    @PutMapping("/records/{medicalRecordId}/draft")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<MedicalRecordResponse> updateMedicalDraft(
            @PathVariable String medicalRecordId,
<<<<<<< HEAD
            @Valid @RequestBody MedicalRecordUpdateRequest request,
=======
            @jakarta.validation.Valid @RequestBody MedicalRecordUpdateRequest request,
>>>>>>> 76de6e5 (luu code)
            Authentication authentication) {
        return ApiResponse.success("Medical draft updated",
                medicalRecordService.updateMedicalDraft(
                        medicalRecordId, currentUser(authentication).userId(), request));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('VETERINARIAN')")
    @PostMapping("/records/{medicalRecordId}/confirm")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<MedicalRecordResponse> confirmMedicalRecord(
            @PathVariable String medicalRecordId,
            Authentication authentication) {
        // The final decision must be saved on the DRAFT before this endpoint is called.
        return ApiResponse.success("Medical record confirmed",
                medicalRecordService.confirmMedicalRecord(
                        medicalRecordId, currentUser(authentication).userId()));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('VETERINARIAN')")
    @PostMapping("/horses/{horseId}/training-lock/unlock")
    @PreAuthorize("hasAuthority('VETERINARIAN')")
    public ApiResponse<TrainingLockResponse> unlockHorse(
            @PathVariable String horseId,
<<<<<<< HEAD
            @Valid @RequestBody TrainingUnlockRequest request,
=======
            @RequestBody TrainingUnlockRequest request,
>>>>>>> 76de6e5 (luu code)
            Authentication authentication) {
        return ApiResponse.success("Training lock released",
                TrainingLockResponse.from(trainingLockService.unlockHorse(
                        horseId, currentUser(authentication).userId(), request.getReason())));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('VETERINARIAN','CLUB_MANAGER','HORSE_OWNER') and @horseAccess.read(authentication,#horseId)")
    @GetMapping("/horses/{horseId}/training-lock/history")
    @PreAuthorize("hasAnyAuthority('CLUB_MANAGER', 'VETERINARIAN', 'HORSE_OWNER') "
            + "and @horseAccess.read(authentication, #horseId)")
    public ApiResponse<List<TrainingLockResponse>> getTrainingLockHistory(
<<<<<<< HEAD
            @PathVariable String horseId) {
=======
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
>>>>>>> 76de6e5 (luu code)
        return ApiResponse.success("Training lock history retrieved",
                trainingLockService.getLockHistory(horseId).stream()
                        .map(TrainingLockResponse::from).toList());
    }

<<<<<<< HEAD
    private AuthenticatedUser currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof AuthenticatedUser user)
                || !"ACTIVE".equals(user.status()) || user.userId() == null) {
            throw new AccessDeniedException("Active authenticated account required");
        }
        return user;
    }

    private void requireHorseRead(Authentication authentication, String horseId) {
        AuthenticatedUser user = currentUser(authentication);
        if (!Objects.equals(user.roleName(), "CLUB_MANAGER")
                && !Objects.equals(user.roleName(), "VETERINARIAN")
                && !Objects.equals(user.roleName(), "HORSE_OWNER")) {
            throw new AccessDeniedException("Role cannot view medical records");
        }
        if (!horseAccess.read(authentication, horseId)) {
            throw new AccessDeniedException("Not allowed to view medical records of this horse");
=======
    private String currentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof com.raceforge.backend.security.AuthenticatedUser user)
                || user.userId() == null || user.userId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
>>>>>>> 76de6e5 (luu code)
        }
    }
<<<<<<< HEAD
=======
    // Legacy: Authentication.getName() is not the numeric ID for the JWT principal.
    //     private String currentUserId(Authentication authentication) {
    //         if (authentication == null
    //                 || !authentication.isAuthenticated()
    //                 || authentication.getName() == null
    //                 || authentication.getName().isBlank()
    //                 || "anonymousUser".equals(authentication.getName())) {
    // 
    //             throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
    //         }
    // 
    //         try {
    //             return Integer.valueOf(authentication.getName());
    //         } catch (NumberFormatException ex) {
    //             throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication user ID must be numeric");
    //         }
    //     }
    // 
>>>>>>> 76de6e5 (luu code)
}
