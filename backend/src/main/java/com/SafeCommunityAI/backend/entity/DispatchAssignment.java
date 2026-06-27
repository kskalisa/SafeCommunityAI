package com.SafeCommunityAI.backend.entity;

import com.SafeCommunityAI.backend.enums.ResponderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class DispatchAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Incident incident;

    @ManyToOne(optional = false)
    private User responder;

    @Enumerated(EnumType.STRING)
    private ResponderStatus status;

    private Integer etaMinutes;
    private String rejectionReason;
    private Instant assignedAt;
    private Instant acceptedAt;
    private Instant completedAt;

    @PrePersist
    void onCreate() {
        assignedAt = Instant.now();
    }
}
