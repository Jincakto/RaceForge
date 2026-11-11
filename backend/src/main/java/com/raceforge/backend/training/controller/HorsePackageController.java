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

    public HorsePackageController(HorsePackageService service, TrainingCertificateAccess certificates,
                                  TrainingCertificatePdf certificatePdf) {
        this.service = service;
        this.certificates = certificates;
        this.certificatePdf = certificatePdf;
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
