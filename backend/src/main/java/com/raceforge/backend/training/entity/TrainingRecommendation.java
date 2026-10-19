package com.raceforge.backend.training.entity;
import jakarta.persistence.*;
/** Maps Training_Recommendation; application writes are validated by the workflow services. */
@Entity @Table(name="Training_Recommendation")
public class TrainingRecommendation extends com.raceforge.backend.common.id.BusinessEntity {
 @Id @Column(name="recommendation_id",length=20) private String recommendationId;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="horse_package_id",nullable=false) private HorsePackage horsePackage;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="assignment_id",nullable=false) private TrainerAssignment assignment;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="medical_record_id",nullable=false) private com.raceforge.backend.medical.entity.MedicalRecord medicalRecord;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="protocol_id",nullable=false) private TrainingProtocol protocol;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="generated_by",nullable=false) private com.raceforge.backend.account.entity.User generatedBy;
 @org.hibernate.annotations.Nationalized @Column(name="snapshot_json",length=2147483647) private String snapshotJson;
 @Column(name="created_at") private java.time.LocalDateTime createdAt;
 public String getRecommendationId(){return recommendationId;}
 public HorsePackage getHorsePackage(){return horsePackage;}
 public TrainerAssignment getAssignment(){return assignment;}
 public com.raceforge.backend.medical.entity.MedicalRecord getMedicalRecord(){return medicalRecord;}
 public TrainingProtocol getProtocol(){return protocol;}
 public com.raceforge.backend.account.entity.User getGeneratedBy(){return generatedBy;}
 public String getSnapshotJson(){return snapshotJson;}
 public java.time.LocalDateTime getCreatedAt(){return createdAt;}
}
