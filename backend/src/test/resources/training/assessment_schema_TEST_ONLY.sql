-- Test fixture only: completes the canonical V12 fixture for existing Assessment mappings.
-- Executed exclusively inside a newly created RaceForgeLifecycleTest_<UUID> database.
CREATE TABLE dbo.Training_Session_Assessment (
 session_id varchar(20) NOT NULL PRIMARY KEY REFERENCES dbo.Training_Session(session_id),
 checklist_version varchar(40) NOT NULL, passed_count int NOT NULL,
 base_alert_level varchar(30) NOT NULL, alert_level varchar(30) NOT NULL,
 trigger_codes varchar(500) NOT NULL, review_status varchar(30) NOT NULL,
 notification_status varchar(40) NOT NULL, assessor_id varchar(20) NOT NULL REFERENCES dbo.[User](user_id),
 assessed_at datetime2 NOT NULL, linked_medical_record_id varchar(20) NULL REFERENCES dbo.Medical_Record(medical_record_id),
 reviewed_medical_record_id varchar(20) NULL REFERENCES dbo.Medical_Record(medical_record_id),
 reviewed_by varchar(20) NULL REFERENCES dbo.[User](user_id), resolved_at datetime2 NULL, version bigint NOT NULL
);
CREATE TABLE dbo.Training_Session_Assessment_Item (
 item_id varchar(36) NOT NULL PRIMARY KEY, session_id varchar(20) NOT NULL REFERENCES dbo.Training_Session_Assessment(session_id),
 criterion_code varchar(40) NOT NULL, passed bit NOT NULL, fail_note varchar(1000) NULL,
 CONSTRAINT UK_TrainingAssessmentItem_SessionCriterion UNIQUE(session_id,criterion_code)
);
CREATE TABLE dbo.Training_Assessment_Notification_Link (
 link_id varchar(36) NOT NULL PRIMARY KEY, session_id varchar(20) NOT NULL REFERENCES dbo.Training_Session_Assessment(session_id),
 notification_id int NULL, recipient_id varchar(20) NULL, notification_type varchar(50) NOT NULL,
 source varchar(10) NOT NULL, reason varchar(1000) NULL, delivery_status varchar(40) NOT NULL,
 created_at datetime2 NOT NULL, sent_at datetime2 NULL,
 CONSTRAINT UK_TrainingAssessmentNotification_RecipientType UNIQUE(session_id,recipient_id,notification_type)
);
