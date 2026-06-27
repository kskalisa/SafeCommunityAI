package com.SafeCommunityAI.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class IncidentAttachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Incident incident;

    private String fileName;
    private String contentType;
    private Long sizeBytes;
    private String url;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    private byte[] data;
}
