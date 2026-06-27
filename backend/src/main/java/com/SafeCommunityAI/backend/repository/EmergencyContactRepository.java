package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.EmergencyContact;
import com.SafeCommunityAI.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, Long> {
    List<EmergencyContact> findByOwnerOrderByNameAsc(User owner);
    List<EmergencyContact> findByOwnerAndNotifyOnEmergencyTrue(User owner);
}
