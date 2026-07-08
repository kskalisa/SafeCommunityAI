package com.SafeCommunityAI.backend.config;

import java.math.BigDecimal;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.SafeCommunityAI.backend.dto.IncidentRequest;
import com.SafeCommunityAI.backend.dto.RegisterRequest;
import com.SafeCommunityAI.backend.entity.Hospital;
import com.SafeCommunityAI.backend.entity.Resource;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.IncidentType;
import com.SafeCommunityAI.backend.enums.ResourceStatus;
import com.SafeCommunityAI.backend.enums.Role;
import com.SafeCommunityAI.backend.repository.HospitalRepository;
import com.SafeCommunityAI.backend.repository.ResourceRepository;
import com.SafeCommunityAI.backend.repository.UserRepository;
import com.SafeCommunityAI.backend.service.AuditService;
import com.SafeCommunityAI.backend.service.AuthService;
import com.SafeCommunityAI.backend.service.IncidentService;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {
    @Bean
    CommandLineRunner seed(UserRepository users, ResourceRepository resources, HospitalRepository hospitals, AuthService authService, IncidentService incidentService, PasswordEncoder passwordEncoder, AuditService auditService) {
        return args -> {
            if (users.count() > 0) return;
            User admin = users.save(User.builder()
                    .fullName("Administrator")
                    .email("admin@demo.com")
                    .password(passwordEncoder.encode("demo123"))
                    .role(Role.ADMIN)
                    .phone("+250700000000")
                    .locationPrivacyConsent(true)
                    .enabled(true)
                    .build());
            auditService.log("ADMIN_BOOTSTRAPPED", admin.getEmail(), "User", admin.getId(), "Initial demo administrator created");
            authService.register(new RegisterRequest("Demo Citizen", "citizen@demo.com", "demo123", Role.CITIZEN, "+250700000001", true, null, null, null));
            authService.register(new RegisterRequest("Demo Responder", "responder@demo.com", "demo123", Role.RESPONDER, "+250700000002", true, "Kigali EMS", "EMS-2026-001", "AMB-12"));
            authService.register(new RegisterRequest("Demo Dispatcher", "dispatcher@demo.com", "demo123", Role.DISPATCHER, "+250700000003", true, null, null, null));
            resources.save(Resource.builder().name("Ambulance 12").type("AMBULANCE").status(ResourceStatus.AVAILABLE).location("Nyarugenge").build());
            resources.save(Resource.builder().name("Fire Truck 4").type("FIRE_TRUCK").status(ResourceStatus.AVAILABLE).location("Kacyiru").build());
            hospitals.save(Hospital.builder().name("Kigali Central Hospital").address("KN 4 Ave").contact("+250788000000").latitude(new BigDecimal("-1.9500")).longitude(new BigDecimal("30.0588")).erBeds(12).icuBeds(4).generalBeds(30).traumaCenter(true).ambulanceDiversion(false).avgHandoffMinutes(9).patientsReceivedToday(3).handoffNotes("Main emergency receiving facility.").build());
            incidentService.createIncident(new IncidentRequest(IncidentType.MEDICAL, "high", new BigDecimal("-1.9441"), new BigDecimal("30.0619"), "Downtown Kigali", "Chest pain and difficulty breathing", false, null, null, true, java.util.List.of()), "citizen@demo.com");
        };
    }
}

