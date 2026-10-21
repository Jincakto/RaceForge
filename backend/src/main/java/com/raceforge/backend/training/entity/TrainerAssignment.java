package com.raceforge.backend.training.entity;
import jakarta.persistence.*;
/** TRAINER requests share Horse_Assignment with VET requests. Assignee is always User, not a profile code. */
@Entity @Table(name="Horse_Assignment")
@SecondaryTable(name="Training_Assignment",pkJoinColumns=@PrimaryKeyJoinColumn(name="assignment_id",referencedColumnName="id"))
public class TrainerAssignment extends com.raceforge.backend.training.entity.TrainingEntity {
 @Id @Column(name="id") private String assignmentId;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="horse_package_id",table="Training_Assignment") private HorsePackage horsePackage;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="horse_id",nullable=false) private com.raceforge.backend.horse.entity.Horse horse;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="assignee_id",nullable=false) private com.raceforge.backend.account.entity.User assignee;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="assigned_by",nullable=false) private com.raceforge.backend.account.entity.User assignedBy;
 @Column(name="kind",length=10,nullable=false) private String kind;
 @Column(name="status",length=20,nullable=false) private String status;
 @Column(name="created_at",nullable=false) private java.time.LocalDateTime assignedAt;
 @Column(name="responded_at") private java.time.LocalDateTime respondedAt;
 @Column(name="ended_at",table="Training_Assignment") private java.time.LocalDateTime endedAt;
 @org.hibernate.annotations.Nationalized @Column(name="reason",length=1000) private String reason;
 public String getAssignmentId(){return assignmentId;} public HorsePackage getHorsePackage(){return horsePackage;}
 public com.raceforge.backend.account.entity.User getAssignee(){return assignee;} public com.raceforge.backend.account.entity.User getAssignedBy(){return assignedBy;}
 public String getStatus(){return status;} public java.time.LocalDateTime getAssignedAt(){return assignedAt;} public java.time.LocalDateTime getRespondedAt(){return respondedAt;} public java.time.LocalDateTime getEndedAt(){return endedAt;} public String getReason(){return reason;}
}
