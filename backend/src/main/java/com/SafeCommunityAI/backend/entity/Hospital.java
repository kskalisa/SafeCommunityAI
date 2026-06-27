package com.SafeCommunityAI.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Hospital {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String address;
    private String contact;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer erBeds;
    private Integer icuBeds;
    private Integer generalBeds;
    private boolean traumaCenter;
    private boolean ambulanceDiversion;
    private Integer avgHandoffMinutes;
    private Integer patientsReceivedToday;
    @Column(length = 1200)
    private String handoffNotes;
}
