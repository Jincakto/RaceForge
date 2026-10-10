package com.raceforge.backend.medical.controller;

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
    public ResponseEntity<MedicalRecordResponse> createMedicalRecord(
            @RequestBody MedicalRecordCreateRequest request,
            Authentication authentication) {

        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

      request.setVeterinarianId(currentUserId(authentication));

        MedicalRecordResponse response = medicalRecordService.createMedicalRecord(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/records/{medicalRecordId}")
    public MedicalRecordResponse getMedicalRecord(
            @PathVariable String medicalRecordId,
            Authentication authentication) {

        currentUserId(authentication);
        return medicalRecordService.getMedicalRecordById(medicalRecordId);
    }

    @GetMapping("/horses/{horseId}/records")
    public List<MedicalRecordResponse> getMedicalHistory(
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
        return medicalRecordService.getMedicalHistory(horseId);
    }

    @GetMapping("/horses/{horseId}/previous-examination")
    public ResponseEntity<MedicalRecordResponse> getPreviousConfirmedExamination(
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
        return medicalRecordService.getPreviousConfirmedExamination(horseId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/records/{medicalRecordId}/draft")
    public MedicalRecordResponse updateMedicalDraft(
            @PathVariable String medicalRecordId,
            @RequestBody MedicalRecordUpdateRequest request,
            Authentication authentication) {

        return medicalRecordService.updateMedicalDraft(
                medicalRecordId,
                currentUserId(authentication),
                request);
    }

    @PostMapping("/records/{medicalRecordId}/confirm")
    public MedicalRecordResponse confirmMedicalRecord(
            @PathVariable String medicalRecordId,
            Authentication authentication) {

        return medicalRecordService.confirmMedicalRecord(
                medicalRecordId,
                currentUserId(authentication));
    }

    @PostMapping("/horses/{horseId}/training-lock/unlock")
    public TrainingLockResponse unlockHorse(
            @PathVariable String horseId,
            @RequestBody TrainingUnlockRequest request,
            Authentication authentication) {

        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        return TrainingLockResponse.from(trainingLockService.unlockHorse(
                horseId,
                currentUserId(authentication),
                request.getReason()));
    }

    @GetMapping("/horses/{horseId}/training-lock/history")
    public List<TrainingLockResponse> getTrainingLockHistory(
            @PathVariable String horseId,
            Authentication authentication) {

        currentUserId(authentication);
        return trainingLockService.getLockHistory(horseId)
                .stream()
                .map(TrainingLockResponse::from)
                .toList();
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
