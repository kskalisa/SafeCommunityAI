package com.SafeCommunityAI.backend.entity;

import com.SafeCommunityAI.backend.enums.ResourceStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "community_resources")
public class Resource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type;

    @Enumerated(EnumType.STRING)
    private ResourceStatus status;

    private String location;

    @ManyToOne
    private Incident assignedIncident;
}
