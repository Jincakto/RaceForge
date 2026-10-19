package com.raceforge.backend.horse.admission;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Horse_Admission")
public class Admission {
    @Id @Column(name="horse_id", length=20) public String horseId;
    @Column(nullable=false, length=50) public String status;
    @Column(name="medical_record_id", length=20) public String medicalRecordId;
    @Column(name="decision_by", length=20) public String decisionBy;
    @Column(name="decision_reason", length=1000) public String decisionReason;
    @Column(name="decided_at") public LocalDateTime decidedAt;
    @Column(name="created_at", nullable=false) public LocalDateTime createdAt;
}
