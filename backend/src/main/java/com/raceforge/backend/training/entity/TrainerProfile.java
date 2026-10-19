package com.raceforge.backend.training.entity;
import jakarta.persistence.*;
/** Trainer uses the agreed HTR-001 String identifier; optional biography is kept in its detail extension. */
@Entity @Table(name="Trainer")
@SecondaryTable(name="Trainer_Detail",pkJoinColumns=@PrimaryKeyJoinColumn(name="trainer_id"))
public class TrainerProfile extends com.raceforge.backend.common.id.BusinessEntity {
 @Id @Column(name="trainer_id") private String trainerId;
 @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false,unique=true) private com.raceforge.backend.account.entity.User user;
 @org.hibernate.annotations.Nationalized @Column(name="bio",table="Trainer_Detail",length=1000) private String bio;
 @org.hibernate.annotations.Nationalized @Column(name="qualifications",table="Trainer_Detail",length=1000) private String qualifications;
 @Column(name="status",table="Trainer_Detail",length=20) private String status;
 @Column(name="created_at",table="Trainer_Detail") private java.time.LocalDateTime createdAt;
 public String getTrainerId(){return trainerId;} public com.raceforge.backend.account.entity.User getUser(){return user;}
 public String getBio(){return bio;} public String getQualifications(){return qualifications;} public String getStatus(){return status;} public java.time.LocalDateTime getCreatedAt(){return createdAt;}
}
