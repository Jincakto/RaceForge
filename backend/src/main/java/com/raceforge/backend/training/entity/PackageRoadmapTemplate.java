package com.raceforge.backend.training.entity;
import jakarta.persistence.*;
@Entity @Table(name="Package_Roadmap_Template")
public class PackageRoadmapTemplate {
@Id @Column(name="roadmap_template_id",length=36) public String id;
 @Column(name="package_id",length=20,nullable=false,unique=true) public String packageId;
 @Column(length=150,nullable=false) @org.hibernate.annotations.Nationalized public String title;
 @Column(length=500,nullable=false) @org.hibernate.annotations.Nationalized public String goal;
 @Column(name="template_revision",nullable=false) public int revision;
 @Column(name="created_at",nullable=false) public java.time.LocalDateTime createdAt;
 @Column(name="updated_at",nullable=false) public java.time.LocalDateTime updatedAt;
}
