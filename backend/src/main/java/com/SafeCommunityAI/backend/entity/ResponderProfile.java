package com.SafeCommunityAI.backend.entity;

import com.SafeCommunityAI.backend.enums.ResponderStatus;
import com.SafeCommunityAI.backend.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class ResponderProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    private User user;

    private String organization;
    private String certificationLicense;
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus;

    @Enumerated(EnumType.STRING)
    private ResponderStatus availabilityStatus;
}
