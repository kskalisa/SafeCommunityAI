package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.HospitalRequest;
import com.SafeCommunityAI.backend.service.CatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hospitals")
@RequiredArgsConstructor
public class HospitalController {
    private final CatalogService catalogService;

    @GetMapping
    public List<?> list(@RequestParam(required = false) String q) {
        return catalogService.hospitals(q);
    }

    @PostMapping
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public Object create(@Valid @RequestBody HospitalRequest request) {
        return catalogService.saveHospital(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public Object update(@PathVariable Long id, @Valid @RequestBody HospitalRequest request) {
        return catalogService.updateHospital(id, request);
    }

    @PostMapping("/{id}/notify")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN') or hasRole('RESPONDER')")
    public Object notify(@PathVariable Long id, @RequestBody Map<String, String> request) {
        return catalogService.notifyHospital(id, request.getOrDefault("message", "Incoming patient"));
    }
}
