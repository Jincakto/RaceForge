package com.raceforge.backend.training.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
public record PackageRoadmapDto(@NotBlank @Size(max=150) String title,
 @NotBlank @Size(max=500) String goal, @Size(max=30) List<@Size(max=2000) String> sources,
 Integer revision, @NotEmpty @Size(max=100) List<@Valid Stage> stages) {}
