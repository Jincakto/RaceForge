package com.raceforge.backend.horse.admission;

import com.raceforge.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController @Validated @RequestMapping("/api/horse-admissions")
@Tag(name="Horse admission", description="Registration → veterinarian acceptance → examination → manager decision → trainer acceptance")
public class AdmissionController {
    private final AdmissionService service;
    public AdmissionController(AdmissionService service) { this.service=service; }
    public record Assign(@NotBlank @Pattern(regexp="VET|TRAINER") String kind,
                         @NotBlank @Pattern(regexp="(?:VET|HTR)-[0-9]{3}") String assigneeId) {}
    public record Respond(@NotBlank @Pattern(regexp="ACCEPT|REJECT|CANCEL") String action,@Size(max=1000) String reason) {}
    public record Decision(@NotNull Boolean accepted,@Size(max=1000) String reason) {}
    @GetMapping public ApiResponse<List<AdmissionService.View>> list() { return ApiResponse.success("Admissions",service.list()); }
    @GetMapping("/staff") public ApiResponse<List<AdmissionService.Staff>> staff() { return ApiResponse.success("Available staff",service.staff()); }
    @GetMapping("/{id}") public ApiResponse<AdmissionService.View> get(@PathVariable @Pattern(regexp="HOR-[0-9]{3}") String id) { return ApiResponse.success("Admission",service.get(id)); }
    @PostMapping("/{id}/assignments") public ApiResponse<AdmissionService.View> assign(@PathVariable @Pattern(regexp="HOR-[0-9]{3}") String id,@Valid @RequestBody Assign request) {
        return ApiResponse.success("Assignment sent",service.assign(id,request.kind(),request.assigneeId()));
    }
    @PostMapping("/{id}/assignments/{assignmentId}/response") public ApiResponse<AdmissionService.View> respond(@PathVariable @Pattern(regexp="HOR-[0-9]{3}") String id,@PathVariable @Positive Integer assignmentId,@Valid @RequestBody Respond request) {
        return ApiResponse.success("Assignment updated",service.respond(id,assignmentId,request.action(),request.reason()));
    }
    @PostMapping("/{id}/decision") public ApiResponse<AdmissionService.View> decide(@PathVariable @Pattern(regexp="HOR-[0-9]{3}") String id,@Valid @RequestBody Decision request) {
        return ApiResponse.success("Decision recorded",service.decide(id,request.accepted(),request.reason()));
    }
}
