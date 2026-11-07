package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.service.TrainingPackageSuggestionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.Pattern;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Validated
@RequestMapping("/api/horses/{horseId}/training-package-suggestions")
@PreAuthorize("hasAuthority('HORSE_OWNER')")
@Tag(name = "Training Package Suggestions")
public class TrainingPackageSuggestionController {
    private final TrainingPackageSuggestionService service;
    public TrainingPackageSuggestionController(TrainingPackageSuggestionService service) { this.service = service; }

    @GetMapping
    public ApiResponse<TrainingPackageSuggestionService.Response> suggest(
            @PathVariable String horseId,
            @RequestParam(required = false) @Pattern(regexp = "FOUNDATION|IMPROVE_PERFORMANCE|PREPARE_FOR_RACING") String goal,
            @AuthenticationPrincipal(expression = "userId") String ownerId) {
        return ApiResponse.success("Training package suggestions retrieved", service.suggest(horseId, ownerId, goal));
    }
}