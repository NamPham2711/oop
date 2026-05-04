package com.oop.ecommerce.controller;

import com.oop.ecommerce.dto.admin.DashboardStatsDto;
import com.oop.ecommerce.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/dashboard-stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStatsDto> dashboardStats(
            @RequestParam(name = "days", defaultValue = "30") int days
    ) {
        return ResponseEntity.ok(adminDashboardService.getDashboardStats(days));
    }
}

