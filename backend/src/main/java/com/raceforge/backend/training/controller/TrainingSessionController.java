package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.CompleteSessionRequest;
import com.raceforge.backend.training.dto.ScheduleSessionRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.service.TrainingSessionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/training-sessions")
public class TrainingSessionController {

  @Autowired
  private TrainingSessionService trainingSessionService;

  @PostMapping
  public ResponseEntity<ApiResponse<TrainingSessionResponse>> schedule(
          @Valid @RequestBody ScheduleSessionRequest request) {

      TrainingSessionResponse response = trainingSessionService.scheduleSession(request);
      return ResponseEntity.ok(ApiResponse.success("Session scheduled", response));
  }

  @PatchMapping("/{sessionId}/start")
  public ResponseEntity<ApiResponse<TrainingSessionResponse>> start(@PathVariable Long sessionId) {
      TrainingSessionResponse response = trainingSessionService.startSession(sessionId);
      return ResponseEntity.ok(ApiResponse.success("Session started", response));
  }

  @PatchMapping("/{sessionId}/complete")
  public ResponseEntity<ApiResponse<TrainingSessionResponse>> complete(
          @PathVariable Long sessionId,
          @RequestBody CompleteSessionRequest request) {

      TrainingSessionResponse response = trainingSessionService.completeSession(sessionId, request);
      return ResponseEntity.ok(ApiResponse.success("Session completed", response));
  }
}
