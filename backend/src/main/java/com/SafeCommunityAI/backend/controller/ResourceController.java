package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.ResourceRequest;
import com.SafeCommunityAI.backend.service.CatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {
    private final CatalogService catalogService;

    @GetMapping
    public List<?> list() {
        return catalogService.resources();
    }

    @PostMapping
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public Object create(@Valid @RequestBody ResourceRequest request) {
        return catalogService.saveResource(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public Object update(@PathVariable Long id, @Valid @RequestBody ResourceRequest request) {
        return catalogService.updateResource(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        catalogService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
