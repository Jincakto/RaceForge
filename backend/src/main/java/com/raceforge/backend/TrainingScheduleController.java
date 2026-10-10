package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.AttendSessionRequest;
import com.raceforge.backend.training.dto.AttendanceResponse;
import com.raceforge.backend.training.dto.ScheduleRecurringRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.service.TrainingScheduleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Shares the /api/training-sessions base path with TrainingSessionController but uses different
// sub-paths (/recurring, /{id}/attendance, /horse/{id}), so the mappings do not collide.
// TODO: once auth exists, restrict POST /recurring to HEAD_TRAINER (Trainer must not create
// schedules) and read performedBy from the authenticated principal instead of the request body.
@RestController
@RequestMapping("/api/training-sessions")
public class TrainingScheduleController {

  @Autowired
  private TrainingScheduleService trainingScheduleService;

  @PostMapping("/recurring")
  public ResponseEntity<ApiResponse<List<TrainingSessionResponse>>> createRecurring(
          @Valid @RequestBody ScheduleRecurringRequest request) {
      List<TrainingSessionResponse> created = trainingScheduleService.createRecurringSchedule(request);
      return ResponseEntity.ok(ApiResponse.success("Training schedule created", created));
  }

  @PutMapping("/{sessionId}/attendance")
  public ResponseEntity<ApiResponse<AttendanceResponse>> submitAttendance(
          @PathVariable Long sessionId,
          @Valid @RequestBody AttendSessionRequest request) {
      AttendanceResponse response = trainingScheduleService.submitAttendance(sessionId, request);
      String message = response.isWarningTriggered()
              ? "Attendance recorded, performance warning triggered"
              : "Attendance recorded";
      return ResponseEntity.ok(ApiResponse.success(message, response));
  }

  @GetMapping("/horse/{horseId}")
  public ResponseEntity<ApiResponse<List<TrainingSessionResponse>>> getByHorse(@PathVariable Long horseId) {
      return ResponseEntity.ok(ApiResponse.success(
              "Training schedule retrieved", trainingScheduleService.getScheduleByHorseId(horseId)));
  }
}
