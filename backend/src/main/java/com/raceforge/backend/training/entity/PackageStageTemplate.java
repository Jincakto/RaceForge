package com.raceforge.backend.training.entity;
import jakarta.persistence.*;
@Entity @Table(name="Package_Stage_Template")
public class PackageStageTemplate {
@Id @Column(name="stage_template_id",length=36) public String id;
 @Column(name="roadmap_template_id",length=36,nullable=false) public String roadmapId;
 @Column(name="stage_order",nullable=false) public int stageOrder;
 @Column(name="start_day",nullable=false) public int startDay;
 @Column(name="end_day",nullable=false) public int endDay;
 @Column(name="phase_code",length=50,nullable=false) public String phaseCode;
 @Column(length=150,nullable=false) @org.hibernate.annotations.Nationalized public String title;
 @Column(length=1000) @org.hibernate.annotations.Nationalized public String objective;
 @Column(name="activity_name",length=500,nullable=false) @org.hibernate.annotations.Nationalized public String activityName;
 @Column(length=30,nullable=false) public String intensity;
 @Column(name="weekdays_json",length=200,nullable=false) @org.hibernate.annotations.Nationalized public String weekdaysJson;
 @Column(name="session_time",nullable=false) public java.time.LocalTime sessionTime;
 @Column(name="session_end_time",nullable=false) public java.time.LocalTime sessionEndTime;
}
