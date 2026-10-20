package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.TrainingPlanCreateRequest;
import com.raceforge.backend.training.dto.TrainingPlanResponse;
import com.raceforge.backend.training.service.TrainingPlanService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.raceforge.backend.training.dto.TrainingPlanOptionResponse;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;

@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/horses/{horseId}/training-plans")
@PreAuthorize("hasAuthority('HEAD_TRAINER') and @permissionAccess.has(authentication, 'MANAGE_TRAINING')")
@Tag(name = "Training Plans")
public class TrainingPlanController {

  @Autowired
  private TrainingPlanService trainingPlanService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<TrainingPlanOptionResponse>>> list(
          @PathVariable String horseId) {
      return ResponseEntity.ok(ApiResponse.success("Horse training plans retrieved",
              trainingPlanService.getPlansForHorse(horseId)));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<TrainingPlanResponse>> create(
          @PathVariable String horseId,
          @Valid @RequestBody TrainingPlanCreateRequest request,
          @AuthenticationPrincipal AuthenticatedUser user) {

      TrainingPlanResponse response = trainingPlanService.createPlan(horseId, request, user.userId());
      return ResponseEntity.ok(ApiResponse.success("Training plan created", response));
  }
}
