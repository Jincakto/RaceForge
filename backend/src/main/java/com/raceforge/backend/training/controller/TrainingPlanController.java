package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.TrainingPlanCreateRequest;
import com.raceforge.backend.training.dto.TrainingPlanResponse;
import com.raceforge.backend.training.service.TrainingPlanService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/horses/{horseId}/training-plans")
public class TrainingPlanController {

  @Autowired
  private TrainingPlanService trainingPlanService;

  @PostMapping
  public ResponseEntity<ApiResponse<TrainingPlanResponse>> create(
          @PathVariable Long horseId,
          @Valid @RequestBody TrainingPlanCreateRequest request) {

      TrainingPlanResponse response = trainingPlanService.createPlan(horseId, request);
      return ResponseEntity.ok(ApiResponse.success("Training plan created", response));
  }
}
