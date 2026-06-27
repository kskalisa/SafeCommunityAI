package com.SafeCommunityAI.backend.dto;

import java.util.List;

public record RouteResponse(
        double originLatitude,
        double originLongitude,
        double destinationLatitude,
        double destinationLongitude,
        double distanceKm,
        int etaMinutes,
        String engine,
        List<RoutePoint> geometry,
        List<String> instructions
) {}
