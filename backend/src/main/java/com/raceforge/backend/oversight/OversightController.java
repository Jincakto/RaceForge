package com.raceforge.backend.oversight;

import com.raceforge.backend.common.response.ApiResponse;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only endpoints for administration; no payment or training mutations. */
@RestController
@RequestMapping("/api/oversight")
public class OversightController {
    private final OversightQueryService query;

    public OversightController(OversightQueryService query) {
        this.query = query;
    }

    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<Map<String, Long>> overview() {
        return ApiResponse.success("Administration overview", query.overview());
    }

    @GetMapping("/horses")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<List<Map<String, Object>>> horses() {
        return ApiResponse.success("Read-only horse directory", query.horses());
    }

    @GetMapping("/packages")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<List<Map<String, Object>>> packages() {
        return ApiResponse.success("Read-only training package catalogue", query.packages());
    }

    @GetMapping("/payments")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<List<Map<String, Object>>> payments() {
        return ApiResponse.success("Read-only PayOS order monitor", query.payments());
    }

    @GetMapping("/registrations")
    @PreAuthorize("hasAnyAuthority('ADMIN','CLUB_MANAGER')")
    public ApiResponse<List<Map<String, Object>>> registrations() {
        return ApiResponse.success("Horse package registrations", query.registrations());
    }
}
