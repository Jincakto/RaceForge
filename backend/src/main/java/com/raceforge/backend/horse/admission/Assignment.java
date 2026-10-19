package com.raceforge.backend.horse.admission;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="Horse_Assignment")
public class Assignment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Integer id;
    @Column(name="horse_id", nullable=false, length=20) public String horseId;
    @Column(nullable=false, length=10) public String kind;
    @Column(name="assigned_by", nullable=false, length=20) public String assignedBy;
    @Column(name="assignee_id", nullable=false, length=20) public String assigneeId;
    @Column(nullable=false, length=20) public String status;
    @Column(length=1000) public String reason;
    @Column(name="created_at", nullable=false) public LocalDateTime createdAt;
    @Column(name="responded_at") public LocalDateTime respondedAt;
    @Column(name="medical_record_id", length=20) public String medicalRecordId;
}
