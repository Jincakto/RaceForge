package com.raceforge.backend.report;

import com.raceforge.backend.common.response.ApiResponse;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports/revenue")
@PreAuthorize("hasAnyAuthority('ADMIN','CLUB_MANAGER')")
public class RevenueReportController {
    private final RevenueReportService service;
    public RevenueReportController(RevenueReportService service) { this.service = service; }

    @GetMapping("/summary")
    public ApiResponse<RevenueReportService.Overview> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String packageType) {
        return ApiResponse.success("Confirmed gross collections", service.overview(from,to,packageType));
    }

    @GetMapping("/transactions")
    public ApiResponse<List<RevenueReportService.Transaction>> transactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String packageType) {
        return ApiResponse.success("Paid orders", service.transactions(from,to,packageType));
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String packageType) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=RaceForge-revenue.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(service.csv(from,to,packageType));
    }
}
