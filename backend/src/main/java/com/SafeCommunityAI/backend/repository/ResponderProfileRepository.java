package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.ResponderProfile;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.ResponderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResponderProfileRepository extends JpaRepository<ResponderProfile, Long> {
    Optional<ResponderProfile> findByUser(User user);
    List<ResponderProfile> findByAvailabilityStatus(ResponderStatus status);
}
