package com.SafeCommunityAI.backend.entity;

import com.SafeCommunityAI.backend.enums.ResponderStatus;
import com.SafeCommunityAI.backend.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;

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
    private String certificateFileName;
    private String certificateContentType;
    private Long certificateSizeBytes;

    @Column(columnDefinition = "text")
    private String certificateDataBase64;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "responder_profile_resources",
            joinColumns = @JoinColumn(name = "responder_profile_id"),
            inverseJoinColumns = @JoinColumn(name = "resource_id")
    )
    @Builder.Default
    private Set<Resource> resources = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus;

    @Enumerated(EnumType.STRING)
    private ResponderStatus availabilityStatus;
}
