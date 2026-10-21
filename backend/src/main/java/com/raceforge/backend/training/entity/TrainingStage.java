package com.raceforge.backend.training.entity;
import jakarta.persistence.*;
/** Maps Training_Stage; application writes are validated by the workflow services. */
// Training SQL TIME/DATETIME2 values are local wall times, shared with JDBC queries.
// Use JDBC 4.2 java.time binding so hibernate.jdbc.time_zone does not shift them.
@Entity @Table(name="Training_Stage")
public class TrainingStage extends com.raceforge.backend.training.entity.TrainingEntity {
 @Id @Column(name="stage_id",length=20) private String stageId;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="plan_id",nullable=false) private TrainingPlan plan;
 @Column(name="stage_order") private int stageOrder;
 @Column(name="start_day") private int startDay;
 @Column(name="end_day") private int endDay;
 @org.hibernate.annotations.Nationalized @Column(name="activity_name",length=500) private String activityName;
 @Column(name="intensity",length=30) private String intensity;
 @org.hibernate.annotations.Nationalized @Column(name="weekdays_json",length=200) private String weekdaysJson;
 @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LOCAL_TIME)
 @Column(name="session_time") private java.time.LocalTime sessionTime;
 @Column(name="phase_code",length=50) private String phaseCode;
 @org.hibernate.annotations.Nationalized @Column(name="title",length=150) private String title;
 @org.hibernate.annotations.Nationalized @Column(name="objective",length=1000) private String objective;
 public String getPhaseCode(){return phaseCode;}
 public String getTitle(){return title;}
 public String getObjective(){return objective;}
 @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LOCAL_TIME)
 @Column(name="session_end_time") private java.time.LocalTime sessionEndTime;
 public java.time.LocalTime getSessionEndTime(){return sessionEndTime;}
 public String getStageId(){return stageId;}
 public TrainingPlan getPlan(){return plan;}
 public int getStageOrder(){return stageOrder;}
 public int getStartDay(){return startDay;}
 public int getEndDay(){return endDay;}
 public String getActivityName(){return activityName;}
 public String getIntensity(){return intensity;}
 public String getWeekdaysJson(){return weekdaysJson;}
 public java.time.LocalTime getSessionTime(){return sessionTime;}
}
