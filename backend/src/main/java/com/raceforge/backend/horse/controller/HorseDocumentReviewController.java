package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseDocumentReport;
import com.raceforge.backend.horse.service.HorseDocumentReviewService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/horses/{horseId}/admission/document-review")
public class HorseDocumentReviewController {
    private final HorseDocumentReviewService service;
    public HorseDocumentReviewController(HorseDocumentReviewService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<HorseDocumentReport> review(@PathVariable String horseId) {
        return ApiResponse.success("Document content comparison", service.review(horseId));
    }
}
