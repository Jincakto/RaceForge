package com.raceforge.backend.common.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.common.response.HealthResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<HealthResponse>> health() {
        HealthResponse health = new HealthResponse("UP", "RaceForge Backend");
        return ResponseEntity.ok(ApiResponse.success("Backend is running", health));
    }
}
