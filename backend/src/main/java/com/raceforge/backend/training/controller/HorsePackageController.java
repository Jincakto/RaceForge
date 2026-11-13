package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;

import com.raceforge.backend.training.dto.HorsePackageRegisterRequest;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.service.HorsePackageService;
import com.raceforge.backend.training.service.TrainingCertificateAccess;
import com.raceforge.backend.training.service.TrainingCertificatePdf;
import com.raceforge.backend.training.entity.TrainingCertificate;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horse-packages")
@Tag(name = "Horse Packages")
public class HorsePackageController {

    private final HorsePackageService service;
    private final TrainingCertificateAccess certificates;
    private final TrainingCertificatePdf certificatePdf;
    private final com.raceforge.backend.training.service.HorsePackageLifecycleService lifecycle;

    public HorsePackageController(HorsePackageService service, TrainingCertificateAccess certificates,
                                  TrainingCertificatePdf certificatePdf,
                                  com.raceforge.backend.training.service.HorsePackageLifecycleService lifecycle) {
        this.service = service;
        this.certificates = certificates;
        this.certificatePdf = certificatePdf;
        this.lifecycle = lifecycle;
    }

    @io.swagger.v3.oas.annotations.Operation(summary = "Cancel a paid package registration",
            description = "Owner only. Cancels ACTIVE/PAUSED registration, deletes unstarted scheduled sessions and retains payment/history. Started unfinished sessions block cancellation. No automatic refund. No request body.")
    @PreAuthorize("hasAuthority('HORSE_OWNER') and principal.status() == 'ACTIVE'")
    @PatchMapping("/{horsePackageId}/cancel")
    public ApiResponse<com.raceforge.backend.training.dto.HorsePackageLifecycleResponse> cancel(
            @PathVariable String horsePackageId) {
        return ApiResponse.success("Training package cancelled", lifecycle.cancel(horsePackageId));
    }

    @io.swagger.v3.oas.annotations.Operation(summary = "Complete a paid training package and issue its certificate",
            description = "Current accepted trainer with MANAGE_TRAINING only, while ACTIVE and in term. At least one non-cancelled session is required; all must be COMPLETED or MISSED. No request body.")
    @PreAuthorize("hasAuthority('HEAD_TRAINER') and principal.status() == 'ACTIVE' and @permissionAccess.has(authentication, 'MANAGE_TRAINING')")
    @PatchMapping("/{horsePackageId}/complete")
    public ApiResponse<com.raceforge.backend.training.dto.HorsePackageLifecycleResponse> complete(
            @PathVariable String horsePackageId) {
        return ApiResponse.success("Training package completed", lifecycle.complete(horsePackageId));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @GetMapping("/{horsePackageId}")
    public ApiResponse<TrainingCertificateAccess.RegistrationDetail> detail(
            @PathVariable String horsePackageId,
            @AuthenticationPrincipal(expression = "userId") String ownerId) {
        return ApiResponse.success("Horse package retrieved", certificates.detail(horsePackageId, ownerId));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @GetMapping("/{horsePackageId}/certificate")
    public ResponseEntity<byte[]> downloadCertificate(
            @PathVariable String horsePackageId,
            @AuthenticationPrincipal(expression = "userId") String ownerId) {
        TrainingCertificate certificate = certificates.certificate(horsePackageId, ownerId);
        String disposition = ContentDisposition.attachment()
                .filename(certificate.getCertificateNumber() + ".pdf")
                .build().toString();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .body(certificatePdf.render(certificate));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> register(
            @Valid @RequestBody HorsePackageRegisterRequest request,
            @AuthenticationPrincipal(expression = "userId") String ownerId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration created", service.register(request, ownerId)));
    }


    /** CM oversight: unlike Owner history, this endpoint has no ownership filter. */
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @GetMapping("/manage/horse/{horseId}")
    public ResponseEntity<ApiResponse<List<HorsePackageResponse>>> managerHistory(
            @PathVariable String horseId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Horse package history for Club Manager", service.historyForManager(horseId)
        ));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @GetMapping("/horse/{horseId}")
    public ResponseEntity<ApiResponse<List<HorsePackageResponse>>> history(
            @PathVariable String horseId,
            @AuthenticationPrincipal(expression = "userId") String ownerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Horse package history retrieved", service.history(horseId, ownerId)
        ));
    }
}
