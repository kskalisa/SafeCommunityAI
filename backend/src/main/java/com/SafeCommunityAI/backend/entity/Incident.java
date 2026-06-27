package com.SafeCommunityAI.backend.entity;

import com.SafeCommunityAI.backend.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Incident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String referenceNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PriorityLevel priority;

    private Integer priorityScore;
    private Double aiConfidenceScore;
    @Column(length = 1000)
    private String aiExplanation;
    private String resourceSuggestion;
    private String severity;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String manualLocation;

    @Column(length = 2000)
    private String description;

    private String witnessName;
    private String witnessPhone;
    private boolean anonymousReport;
    private Boolean emergencyContactsNotified;
    private String priorityOverrideReason;
    private Instant reportedAt;
    private Instant resolvedAt;

    @ManyToOne
    private User reporter;

    @OneToMany(mappedBy = "incident", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<IncidentAttachment> attachments = new ArrayList<>();

    @PrePersist
    void onCreate() {
        reportedAt = Instant.now();
    }
}
