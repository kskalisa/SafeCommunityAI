package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.LocationUpdate;
import com.SafeCommunityAI.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LocationUpdateRepository extends JpaRepository<LocationUpdate, Long> {
    Optional<LocationUpdate> findTopByUserOrderByCapturedAtDesc(User user);
    List<LocationUpdate> findTop25ByUserOrderByCapturedAtDesc(User user);
    List<LocationUpdate> findTop50ByOrderByCapturedAtDesc();
    List<LocationUpdate> findTop50ByConsentProvidedTrueOrderByCapturedAtDesc();
}

