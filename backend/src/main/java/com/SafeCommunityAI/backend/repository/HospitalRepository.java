package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {
    List<Hospital> findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(String name, String address);
}
