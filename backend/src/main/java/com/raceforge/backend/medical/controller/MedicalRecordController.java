package com.raceforge.backend.medical.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.medical.dto.MedicalRecordCreateRequest;
import com.raceforge.backend.medical.dto.MedicalRecordResponse;
import com.raceforge.backend.medical.dto.MedicalRecordUpdateRequest;
import com.raceforge.backend.medical.dto.TrainingLockResponse;
import com.raceforge.backend.medical.dto.TrainingUnlockRequest;
import com.raceforge.backend.medical.service.MedicalRecordService;
import com.raceforge.backend.medical.service.TrainingLockService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;


@RestController
@RequestMapping("/api/medical")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final TrainingLockService trainingLockService;

    public MedicalRecordController(
            MedicalRecordService medicalRecordService,
            TrainingLockService trainingLockService) {
        this.medicalRecordService = medicalRecordService;
        this.trainingLockService = trainingLockService;
    }

    @PostMapping("/records")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> createMedicalRecord(
            @RequestBody MedicalRecordCreateRequest request,
            Authentication authentication) {

        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        request.setVeterinarianId(currentUserId(authentication));

        MedicalRecordResponse response = medicalRecordService.createMedicalRecord(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Medical record created", response));
    }

    @GetMapping("/records/{medicalRecordId}")
    public ApiResponse<MedicalRecordResponse> getMedicalRecord(
            @PathVariable String medicalRecordId,
            Authentication authentication) {

        currentUserId(authentication);
        return ApiResponse.success("Medical record retrieved",
                medicalRecordService.getMedicalRecordById(medicalRecordId));
    }

    @GetMapping("/horses/{horseId}/records")
    public ApiResponse<List<MedicalRecordResponse>> getMedicalHistory(
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
        return ApiResponse.success("Medical history retrieved",
                medicalRecordService.getMedicalHistory(horseId));
    }

    @GetMapping("/horses/{horseId}/previous-examination")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getPreviousConfirmedExamination(
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
        return medicalRecordService.getPreviousConfirmedExamination(horseId)
                .map(record -> ResponseEntity.ok(ApiResponse.success("Previous examination retrieved", record)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/records/{medicalRecordId}/draft")
    public ApiResponse<MedicalRecordResponse> updateMedicalDraft(
            @PathVariable String medicalRecordId,
            @RequestBody MedicalRecordUpdateRequest request,
            Authentication authentication) {

        return ApiResponse.success("Medical draft updated",
                medicalRecordService.updateMedicalDraft(
                        medicalRecordId,
                        currentUserId(authentication),
                        request));
    }

    @PostMapping("/records/{medicalRecordId}/confirm")
    public ApiResponse<MedicalRecordResponse> confirmMedicalRecord(
            @PathVariable String medicalRecordId,
            Authentication authentication) {

        return ApiResponse.success("Medical record confirmed",
                medicalRecordService.confirmMedicalRecord(
                        medicalRecordId,
                        currentUserId(authentication)));
    }

    @PostMapping("/horses/{horseId}/training-lock/unlock")
    public ApiResponse<TrainingLockResponse> unlockHorse(
            @PathVariable String horseId,
            @RequestBody TrainingUnlockRequest request,
            Authentication authentication) {

        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        return ApiResponse.success("Training lock released",
                TrainingLockResponse.from(trainingLockService.unlockHorse(
                        horseId,
                        currentUserId(authentication),
                        request.getReason())));
    }

    @GetMapping("/horses/{horseId}/training-lock/history")
    public ApiResponse<List<TrainingLockResponse>> getTrainingLockHistory(
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
        return ApiResponse.success("Training lock history retrieved",
                trainingLockService.getLockHistory(horseId)
                        .stream()
                        .map(TrainingLockResponse::from)
                        .toList());
    }

    private String currentUserId(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()
                || "anonymousUser".equals(authentication.getName())) {

            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        return authentication.getName();
    }
}
