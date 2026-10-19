:ON ERROR EXIT
-- CONSOLIDATED COPY; SQLCMD mode required. NOT executed/tested.
-- Change UPDATE_V10 to EMPTY only for an existing, completely empty database.
-- Neither mode converts an arbitrary existing group INT database.
-- This file does not update Flyway history. Prefer original Flyway migrations.
-- Back up before running. No CREATE DATABASE or DROP DATABASE.
IF DB_ID(N'RaceForge') IS NULL THROW 51060, 'RaceForge does not exist.', 1;
GO
USE [RaceForge];
GO
CREATE TABLE #DeliveryMode(mode varchar(20) NOT NULL);
INSERT #DeliveryMode VALUES ('UPDATE_V10');
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode NOT IN ('UPDATE_V10','EMPTY'))
 THROW 51061, 'Choose UPDATE_V10 or EMPTY.', 1;
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 AND EXISTS(SELECT 1 FROM sys.tables WHERE is_ms_shipped=0)
 THROW 51062, 'EMPTY requires no user tables. Existing data was not changed.', 1;
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='UPDATE_V10')
 AND NOT EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'RaceForge_GroupSchema_V10' AND CONVERT(nvarchar(50),value)=N'APPLIED')
 THROW 51063, 'UPDATE_V10 requires this project V10 schema, not the original group INT baseline.', 1;
GO

-- ===== V1__string_business_ids.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
CREATE TABLE dbo.[Audit_Log] (
 [audit_id] varchar(32) NOT NULL,
 [user_id] varchar(32) NULL,
 [horse_id] varchar(32) NULL,
 [action] varchar(100) NOT NULL,
 [entity_type] varchar(100) NULL,
 [entity_id] varchar(32) NULL,
 [result] varchar(50) NULL,
 [reason] nvarchar(1000) NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysdatetime()),
 CONSTRAINT [PK_Audit_Log] PRIMARY KEY ([audit_id])
);
CREATE TABLE dbo.[Care_Task] (
 [care_task_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [assigned_to] varchar(32) NOT NULL,
 [assigned_by] varchar(32) NOT NULL,
 [task_type] nvarchar(100) NOT NULL,
 [scheduled_at] datetime2 NOT NULL,
 [status] varchar(20) NOT NULL,
 [completed_at] datetime2 NULL,
 [notes] nvarchar(1000) NULL,
 CONSTRAINT [PK_Care_Task] PRIMARY KEY ([care_task_id])
);
CREATE TABLE dbo.[Email_Verification_OTP] (
 [user_id] varchar(32) NOT NULL,
 [otp_hash] varchar(64) NOT NULL,
 [expires_at] datetime2 NOT NULL,
 [sent_at] datetime2 NOT NULL,
 [attempt_count] int NOT NULL DEFAULT ((0)),
 CONSTRAINT [PK_Email_Verification_OTP] PRIMARY KEY ([user_id])
);
CREATE TABLE dbo.[Health_Profile] (
 [profile_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysdatetime()),
 [updated_at] datetime2 NOT NULL DEFAULT (sysdatetime()),
 CONSTRAINT [PK_Health_Profile] PRIMARY KEY ([profile_id])
);
CREATE TABLE dbo.[Horse] (
 [horse_id] varchar(32) NOT NULL,
 [owner_id] varchar(32) NOT NULL,
 [head_trainer_id] varchar(32) NULL,
 [horse_name] nvarchar(100) NOT NULL,
 [date_of_birth] date NULL,
 [gender] varchar(20) NULL,
 [breed] nvarchar(100) NULL,
 [coat_color] nvarchar(50) NULL,
 [sire] nvarchar(100) NULL,
 [dam] nvarchar(100) NULL,
 [dam_sire] nvarchar(100) NULL,
 [weight] decimal(8,2) NULL,
 [height] decimal(6,2) NULL,
 [background] nvarchar(1000) NULL,
 [declared_medical_history] nvarchar(1000) NULL,
 [image_url] nvarchar(500) NULL,
 [health_status] varchar(30) NULL,
 [training_locked] bit NOT NULL DEFAULT ((0)),
 [status] varchar(20) NOT NULL,
 [admission_status] varchar(20) NOT NULL DEFAULT (''NOT_SUBMITTED''),
 [admission_note] nvarchar(500) NULL,
 CONSTRAINT [PK_Horse] PRIMARY KEY ([horse_id]),
 CONSTRAINT [CK_Horse_Admission] CHECK ([admission_status]=''REJECTED'' OR [admission_status]=''APPROVED'' OR [admission_status]=''PENDING'' OR [admission_status]=''NOT_SUBMITTED'')
);
CREATE TABLE dbo.[HORSE_PACKAGE] (
 [horse_package_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [package_id] varchar(32) NOT NULL,
 [registered_at] datetime NOT NULL DEFAULT (getdate()),
 [start_date] date NULL,
 [end_date] date NULL,
 [status] varchar(20) NOT NULL DEFAULT (''PENDING''),
 [total_price] decimal(12,2) NOT NULL,
 [paused_at] datetime NULL,
 [pause_reason] nvarchar(255) NULL,
 [replaced_horse_package_id] varchar(32) NULL,
 [created_at] datetime NOT NULL DEFAULT (getdate()),
 [updated_at] datetime NOT NULL DEFAULT (getdate()),
 [payment_status] varchar(20) NOT NULL DEFAULT (''PENDING''),
 [paid_at] datetime NULL,
 [remaining_days] int NULL,
 CONSTRAINT [PK_HORSE_PACKAGE] PRIMARY KEY ([horse_package_id]),
 CONSTRAINT [CK_HORSE_PACKAGE_DATE] CHECK ([end_date] IS NULL OR [start_date] IS NULL OR [end_date]>=[start_date]),
 CONSTRAINT [CK_HORSE_PACKAGE_PRICE] CHECK ([total_price]>=(0)),
 CONSTRAINT [CK_HORSE_PACKAGE_STATUS] CHECK ([status]=''CANCELLED'' OR [status]=''COMPLETED'' OR [status]=''PAUSED'' OR [status]=''ACTIVE'' OR [status]=''PENDING'')
);
CREATE TABLE dbo.[Horse_Plan] (
 [plan_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [start_date] date NULL,
 [end_date] date NULL,
 [status] varchar(20) NOT NULL,
 [notes] nvarchar(1000) NULL,
 CONSTRAINT [PK_Horse_Plan] PRIMARY KEY ([plan_id],[horse_id])
);
CREATE TABLE dbo.[HORSE_RACE_HISTORY] (
 [race_history_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [race_name] nvarchar(150) NOT NULL,
 [race_date] date NULL,
 [distance] int NULL,
 [finish_position] int NULL,
 [completion_time] varchar(20) NULL,
 [racecourse] nvarchar(150) NULL,
 [jockey_name] nvarchar(100) NULL,
 [prize] decimal(15,2) NULL,
 [created_at] datetime NOT NULL DEFAULT (getdate()),
 [updated_at] datetime NOT NULL DEFAULT (getdate()),
 CONSTRAINT [PK_HORSE_RACE_HISTORY] PRIMARY KEY ([race_history_id]),
 CONSTRAINT [CK_RaceHistory_Distance] CHECK ([distance] IS NULL OR [distance]>(0)),
 CONSTRAINT [CK_RaceHistory_Position] CHECK ([finish_position] IS NULL OR [finish_position]>(0)),
 CONSTRAINT [CK_RaceHistory_Prize] CHECK ([prize] IS NULL OR [prize]>=(0))
);
CREATE TABLE dbo.[Medical_Clinical_Exam] (
 [clinical_exam_id] varchar(32) NOT NULL,
 [medical_record_id] varchar(32) NOT NULL,
 [examination_area] varchar(50) NOT NULL,
 [condition_status] varchar(20) NOT NULL,
 [abnormality_type] nvarchar(100) NULL,
 [severity] varchar(20) NULL,
 [notes] nvarchar(500) NULL,
 CONSTRAINT [PK_Medical_Clinical_Exam] PRIMARY KEY ([clinical_exam_id])
);
CREATE TABLE dbo.[Medical_Record] (
 [medical_record_id] varchar(32) NOT NULL,
 [profile_id] varchar(32) NOT NULL,
 [veterinarian_id] varchar(32) NOT NULL,
 [correction_of_id] varchar(32) NULL,
 [exam_type] varchar(30) NOT NULL,
 [examined_at] datetime2 NOT NULL DEFAULT (sysdatetime()),
 [health_status] varchar(30) NULL,
 [diagnosis] nvarchar(1000) NULL,
 [treatment] nvarchar(1000) NULL,
 [medication] nvarchar(1000) NULL,
 [care_recommendation] nvarchar(1000) NULL,
 [notes] nvarchar(1000) NULL,
 [system_note] nvarchar(1000) NULL,
 [training_note] nvarchar(1000) NULL,
 [status] varchar(20) NOT NULL DEFAULT (''DRAFT''),
 [confirmed_at] datetime2 NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysdatetime()),
 [updated_at] datetime2 NOT NULL DEFAULT (sysdatetime()),
 [training_eligible] bit NULL,
 [fitness_conclusion] nvarchar(1000) NULL,
 [ideal_weight] decimal(8,2) NULL,
 [body_condition_score] int NULL,
 CONSTRAINT [PK_Medical_Record] PRIMARY KEY ([medical_record_id])
);
CREATE TABLE dbo.[Medical_Vital_Sign] (
 [vital_sign_id] varchar(32) NOT NULL,
 [medical_record_id] varchar(32) NOT NULL,
 [body_temperature] decimal(4,1) NULL,
 [resting_heart_rate] int NULL,
 [resting_respiratory_rate] int NULL,
 CONSTRAINT [PK_Medical_Vital_Sign] PRIMARY KEY ([vital_sign_id])
);
CREATE TABLE dbo.[Notification] (
 [notification_id] varchar(32) NOT NULL,
 [user_id] varchar(32) NOT NULL,
 [notification_type] varchar(50) NOT NULL,
 [title] nvarchar(200) NOT NULL,
 [message] nvarchar(1000) NOT NULL,
 [is_read] bit NOT NULL DEFAULT ((0)),
 [created_at] datetime2 NOT NULL DEFAULT (sysdatetime()),
 CONSTRAINT [PK_Notification] PRIMARY KEY ([notification_id])
);
CREATE TABLE dbo.[Nutrition_Plan] (
 [nutrition_plan_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [created_by] varchar(32) NOT NULL,
 [plan_name] nvarchar(150) NOT NULL,
 [daily_amount] decimal(10,2) NULL,
 [feeding_frequency] int NULL,
 [start_date] date NULL,
 [end_date] date NULL,
 [status] varchar(20) NOT NULL,
 [notes] nvarchar(1000) NULL,
 CONSTRAINT [PK_Nutrition_Plan] PRIMARY KEY ([nutrition_plan_id])
);
CREATE TABLE dbo.[Password_Reset_Token] (
 [reset_token_id] varchar(32) NOT NULL,
 [user_id] varchar(32) NOT NULL,
 [token_hash] varchar(64) NOT NULL,
 [expires_at] datetime2 NOT NULL,
 [used_at] datetime2 NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysutcdatetime()),
 CONSTRAINT [PK_Password_Reset_Token] PRIMARY KEY ([reset_token_id])
);
CREATE TABLE dbo.[Permission] (
 [permission_id] varchar(32) NOT NULL,
 [permission_name] varchar(100) NOT NULL,
 [description] nvarchar(500) NULL,
 CONSTRAINT [PK_Permission] PRIMARY KEY ([permission_id])
);
CREATE TABLE dbo.[Refresh_Token] (
 [refresh_token_id] varchar(32) NOT NULL,
 [user_id] varchar(32) NOT NULL,
 [token_hash] varchar(64) NOT NULL,
 [expires_at] datetime2 NOT NULL,
 [revoked_at] datetime2 NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysutcdatetime()),
 CONSTRAINT [PK_Refresh_Token] PRIMARY KEY ([refresh_token_id])
);
CREATE TABLE dbo.[Registration_Request] (
 [request_id] varchar(32) NOT NULL,
 [user_id] varchar(32) NOT NULL,
 [requested_role_id] varchar(32) NOT NULL,
 [status] varchar(20) NOT NULL DEFAULT (''PENDING''),
 [reviewed_by] varchar(32) NULL,
 [reviewed_at] datetime2 NULL,
 [review_note] nvarchar(500) NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysutcdatetime()),
 CONSTRAINT [PK_Registration_Request] PRIMARY KEY ([request_id]),
 CONSTRAINT [CK_RegistrationRequest_Status] CHECK ([status]=''REJECTED'' OR [status]=''APPROVED'' OR [status]=''PENDING'')
);
CREATE TABLE dbo.[Role] (
 [role_id] varchar(32) NOT NULL,
 [role_name] varchar(50) NOT NULL,
 CONSTRAINT [PK_Role] PRIMARY KEY ([role_id])
);
CREATE TABLE dbo.[Role_Permission] (
 [role_id] varchar(32) NOT NULL,
 [permission_id] varchar(32) NOT NULL,
 CONSTRAINT [PK_Role_Permission] PRIMARY KEY ([role_id],[permission_id])
);
CREATE TABLE dbo.[Supply_Item] (
 [supply_item_id] varchar(32) NOT NULL,
 [item_name] nvarchar(150) NOT NULL,
 [category] nvarchar(100) NULL,
 [unit] nvarchar(30) NULL,
 [current_quantity] decimal(10,2) NOT NULL DEFAULT ((0)),
 [minimum_threshold] decimal(10,2) NULL,
 [status] varchar(20) NOT NULL,
 CONSTRAINT [PK_Supply_Item] PRIMARY KEY ([supply_item_id])
);
CREATE TABLE dbo.[Training_Lock] (
 [lock_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [medical_record_id] varchar(32) NULL,
 [locked_by] varchar(32) NOT NULL,
 [unlocked_by] varchar(32) NULL,
 [locked_at] datetime2 NOT NULL,
 [lock_reason] nvarchar(1000) NOT NULL,
 [unlocked_at] datetime2 NULL,
 [unlock_reason] nvarchar(1000) NULL,
 CONSTRAINT [PK_Training_Lock] PRIMARY KEY ([lock_id])
);
CREATE TABLE dbo.[TRAINING_PACKAGE] (
 [package_id] varchar(32) NOT NULL,
 [package_name] nvarchar(100) NOT NULL,
 [package_type] varchar(30) NOT NULL,
 [description] nvarchar(500) NULL,
 [duration_days] int NOT NULL,
 [price] decimal(12,2) NOT NULL,
 [status] varchar(20) NOT NULL DEFAULT (''ACTIVE''),
 [created_at] datetime NOT NULL DEFAULT (getdate()),
 [updated_at] datetime NOT NULL DEFAULT (getdate()),
 CONSTRAINT [PK_TRAINING_PACKAGE] PRIMARY KEY ([package_id]),
 CONSTRAINT [CK_TRAINING_PACKAGE_DURATION] CHECK ([duration_days]>(0)),
 CONSTRAINT [CK_TRAINING_PACKAGE_PRICE] CHECK ([price]>=(0)),
 CONSTRAINT [CK_TRAINING_PACKAGE_STATUS] CHECK ([status]=''INACTIVE'' OR [status]=''ACTIVE''),
 CONSTRAINT [CK_TRAINING_PACKAGE_TYPE] CHECK ([package_type]=''RECOVERY'' OR [package_type]=''PERFORMANCE'' OR [package_type]=''RACING'' OR [package_type]=''BASIC'')
);
CREATE TABLE dbo.[Training_Plan] (
 [plan_id] varchar(32) NOT NULL,
 [created_by] varchar(32) NOT NULL,
 [plan_name] nvarchar(150) NOT NULL,
 [goal] nvarchar(500) NULL,
 [duration] int NULL,
 [status] varchar(20) NOT NULL,
 [notes] nvarchar(1000) NULL,
 [horse_package_id] varchar(32) NULL,
 [trainer_assignment_id] varchar(32) NULL,
 [recommendation_id] varchar(32) NULL,
 CONSTRAINT [PK_Training_Plan] PRIMARY KEY ([plan_id])
);
CREATE TABLE dbo.[Training_Session] (
 [session_id] varchar(32) NOT NULL,
 [plan_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [scheduled_start] datetime2 NOT NULL,
 [scheduled_end] datetime2 NULL,
 [distance] decimal(8,2) NULL,
 [intensity] varchar(30) NULL,
 [surface] nvarchar(100) NULL,
 [status] varchar(20) NOT NULL,
 [actual_start] datetime2 NULL,
 [actual_end] datetime2 NULL,
 [evaluation] nvarchar(1000) NULL,
 [notes] nvarchar(1000) NULL,
 [heart_rate] int NULL,
 [avg_speed] float NULL,
 [max_speed] float NULL,
 [recorded_by] varchar(32) NULL,
 CONSTRAINT [PK_Training_Session] PRIMARY KEY ([session_id])
);
CREATE TABLE dbo.[User] (
 [user_id] varchar(32) NOT NULL,
 [role_id] varchar(32) NOT NULL DEFAULT ((6)),
 [full_name] nvarchar(150) NOT NULL,
 [email] varchar(255) NOT NULL,
 [password] varchar(255) NULL,
 [phone] varchar(20) NULL,
 [status] varchar(20) NOT NULL,
 [email_verified] bit NOT NULL DEFAULT ((0)),
 [avatar_url] nvarchar(500) NULL,
 [requested_role_id] varchar(32) NULL,
 CONSTRAINT [PK_User] PRIMARY KEY ([user_id])
);
CREATE TABLE dbo.[User_External_Login] (
 [external_login_id] varchar(32) NOT NULL,
 [user_id] varchar(32) NOT NULL,
 [provider] varchar(20) NOT NULL,
 [provider_user_id] varchar(255) NOT NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysutcdatetime()),
 CONSTRAINT [PK_User_External_Login] PRIMARY KEY ([external_login_id])
);
ALTER TABLE dbo.[Audit_Log] ADD CONSTRAINT [FK_AuditLog_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
ALTER TABLE dbo.[Audit_Log] ADD CONSTRAINT [FK_AuditLog_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Care_Task] ADD CONSTRAINT [FK_CareTask_AssignedBy] FOREIGN KEY ([assigned_by]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Care_Task] ADD CONSTRAINT [FK_CareTask_AssignedTo] FOREIGN KEY ([assigned_to]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Care_Task] ADD CONSTRAINT [FK_CareTask_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
ALTER TABLE dbo.[Email_Verification_OTP] ADD CONSTRAINT [FK_EmailVerificationOtp_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]);
CREATE UNIQUE INDEX [UQ__Health_P__DE0BA8A3225D94BC] ON dbo.[Health_Profile]([horse_id]);
ALTER TABLE dbo.[Health_Profile] ADD CONSTRAINT [FK_HealthProfile_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
ALTER TABLE dbo.[Horse] ADD CONSTRAINT [FK_Horse_HeadTrainer] FOREIGN KEY ([head_trainer_id]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Horse] ADD CONSTRAINT [FK_Horse_Owner] FOREIGN KEY ([owner_id]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[HORSE_PACKAGE] ADD CONSTRAINT [FK_HORSE_PACKAGE_HORSE] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
ALTER TABLE dbo.[HORSE_PACKAGE] ADD CONSTRAINT [FK_HORSE_PACKAGE_PACKAGE] FOREIGN KEY ([package_id]) REFERENCES dbo.[TRAINING_PACKAGE]([package_id]);
ALTER TABLE dbo.[HORSE_PACKAGE] ADD CONSTRAINT [FK_HORSE_PACKAGE_REPLACED] FOREIGN KEY ([replaced_horse_package_id]) REFERENCES dbo.[HORSE_PACKAGE]([horse_package_id]);
ALTER TABLE dbo.[Horse_Plan] ADD CONSTRAINT [FK_HorsePlan_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
ALTER TABLE dbo.[Horse_Plan] ADD CONSTRAINT [FK_HorsePlan_Plan] FOREIGN KEY ([plan_id]) REFERENCES dbo.[Training_Plan]([plan_id]);
ALTER TABLE dbo.[HORSE_RACE_HISTORY] ADD CONSTRAINT [FK_RaceHistory_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
ALTER TABLE dbo.[Medical_Clinical_Exam] ADD CONSTRAINT [FK_MedicalClinicalExam_Record] FOREIGN KEY ([medical_record_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]);
ALTER TABLE dbo.[Medical_Record] ADD CONSTRAINT [FK_MedicalRecord_Correction] FOREIGN KEY ([correction_of_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]);
ALTER TABLE dbo.[Medical_Record] ADD CONSTRAINT [FK_MedicalRecord_Profile] FOREIGN KEY ([profile_id]) REFERENCES dbo.[Health_Profile]([profile_id]);
ALTER TABLE dbo.[Medical_Record] ADD CONSTRAINT [FK_MedicalRecord_Veterinarian] FOREIGN KEY ([veterinarian_id]) REFERENCES dbo.[User]([user_id]);
CREATE UNIQUE INDEX [UQ__Medical___05C4C30BC5C7B0E4] ON dbo.[Medical_Vital_Sign]([medical_record_id]);
ALTER TABLE dbo.[Medical_Vital_Sign] ADD CONSTRAINT [FK_MedicalVitalSign_Record] FOREIGN KEY ([medical_record_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]);
ALTER TABLE dbo.[Notification] ADD CONSTRAINT [FK_Notification_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Nutrition_Plan] ADD CONSTRAINT [FK_NutritionPlan_CreatedBy] FOREIGN KEY ([created_by]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Nutrition_Plan] ADD CONSTRAINT [FK_NutritionPlan_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
CREATE UNIQUE INDEX [UQ__Password__9F6BDB130699E4B3] ON dbo.[Password_Reset_Token]([token_hash]);
ALTER TABLE dbo.[Password_Reset_Token] ADD CONSTRAINT [FK_PasswordResetToken_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]);
CREATE UNIQUE INDEX [UQ__Permissi__81C0F5A2CCA36885] ON dbo.[Permission]([permission_name]);
CREATE UNIQUE INDEX [UQ__Refresh___9F6BDB1329F7A3FB] ON dbo.[Refresh_Token]([token_hash]);
ALTER TABLE dbo.[Refresh_Token] ADD CONSTRAINT [FK_RefreshToken_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]);
CREATE UNIQUE INDEX [UX_RegistrationRequest_User_Pending] ON dbo.[Registration_Request]([user_id]) WHERE ([status]=''PENDING'');
ALTER TABLE dbo.[Registration_Request] ADD CONSTRAINT [FK_RegistrationRequest_Reviewer] FOREIGN KEY ([reviewed_by]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Registration_Request] ADD CONSTRAINT [FK_RegistrationRequest_Role] FOREIGN KEY ([requested_role_id]) REFERENCES dbo.[Role]([role_id]);
ALTER TABLE dbo.[Registration_Request] ADD CONSTRAINT [FK_RegistrationRequest_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]);
CREATE UNIQUE INDEX [UQ__Role__783254B10B6F6CDC] ON dbo.[Role]([role_name]);
ALTER TABLE dbo.[Role_Permission] ADD CONSTRAINT [FK_RolePermission_Permission] FOREIGN KEY ([permission_id]) REFERENCES dbo.[Permission]([permission_id]);
ALTER TABLE dbo.[Role_Permission] ADD CONSTRAINT [FK_RolePermission_Role] FOREIGN KEY ([role_id]) REFERENCES dbo.[Role]([role_id]);
ALTER TABLE dbo.[Training_Lock] ADD CONSTRAINT [FK_TrainingLock_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]);
ALTER TABLE dbo.[Training_Lock] ADD CONSTRAINT [FK_TrainingLock_LockedBy] FOREIGN KEY ([locked_by]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Training_Lock] ADD CONSTRAINT [FK_TrainingLock_MedicalRecord] FOREIGN KEY ([medical_record_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]);
ALTER TABLE dbo.[Training_Lock] ADD CONSTRAINT [FK_TrainingLock_UnlockedBy] FOREIGN KEY ([unlocked_by]) REFERENCES dbo.[User]([user_id]);
ALTER TABLE dbo.[Training_Plan] ADD CONSTRAINT [FK_TrainingPlan_CreatedBy] FOREIGN KEY ([created_by]) REFERENCES dbo.[User]([user_id]);
CREATE UNIQUE INDEX [UX_TrainingSession_HorseStart] ON dbo.[Training_Session]([horse_id],[scheduled_start]);
ALTER TABLE dbo.[Training_Session] ADD CONSTRAINT [FK_TrainingSession_HorsePlan] FOREIGN KEY ([plan_id],[horse_id]) REFERENCES dbo.[Horse_Plan]([plan_id],[horse_id]);
ALTER TABLE dbo.[Training_Session] ADD CONSTRAINT [FK_TrainingSession_RecordedBy] FOREIGN KEY ([recorded_by]) REFERENCES dbo.[User]([user_id]);
CREATE UNIQUE INDEX [UQ__User__AB6E616435708F9A] ON dbo.[User]([email]);
ALTER TABLE dbo.[User] ADD CONSTRAINT [FK_User_RequestedRole] FOREIGN KEY ([requested_role_id]) REFERENCES dbo.[Role]([role_id]);
ALTER TABLE dbo.[User] ADD CONSTRAINT [FK_User_Role] FOREIGN KEY ([role_id]) REFERENCES dbo.[Role]([role_id]);
CREATE UNIQUE INDEX [UX_UserExternalLogin_UserProvider] ON dbo.[User_External_Login]([user_id],[provider]);
CREATE UNIQUE INDEX [UX_UserExternalLogin_ProviderUser] ON dbo.[User_External_Login]([provider],[provider_user_id]);
ALTER TABLE dbo.[User_External_Login] ADD CONSTRAINT [FK_UserExternalLogin_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]);

CREATE TABLE dbo.Id_Counter(prefix varchar(16) NOT NULL PRIMARY KEY,next_value bigint NOT NULL CHECK(next_value>=0));
CREATE TABLE dbo.Trainer_Profile(
 trainer_id varchar(32) NOT NULL PRIMARY KEY,user_id varchar(32) NOT NULL UNIQUE REFERENCES dbo.[User](user_id),
 bio nvarchar(1000) NULL,qualifications nvarchar(1000) NULL,status varchar(20) NOT NULL DEFAULT ''ACTIVE'',
 created_at datetime2 NOT NULL DEFAULT SYSDATETIME(),CHECK(status IN (''ACTIVE'',''INACTIVE'')));
CREATE TABLE dbo.Trainer_Assignment(
 assignment_id varchar(32) NOT NULL PRIMARY KEY,horse_package_id varchar(32) NOT NULL REFERENCES dbo.HORSE_PACKAGE(horse_package_id),
 trainer_id varchar(32) NOT NULL REFERENCES dbo.Trainer_Profile(trainer_id),assigned_by varchar(32) NOT NULL REFERENCES dbo.[User](user_id),
 status varchar(20) NOT NULL DEFAULT ''PENDING'',assigned_at datetime2 NOT NULL DEFAULT SYSDATETIME(),responded_at datetime2 NULL,
 ended_at datetime2 NULL,reason nvarchar(1000) NULL,CHECK(status IN (''PENDING'',''ACCEPTED'',''REJECTED'',''ENDED'')));
CREATE UNIQUE INDEX UX_TrainerAssignment_Open ON dbo.Trainer_Assignment(horse_package_id,trainer_id) WHERE status IN (''PENDING'',''ACCEPTED'');
CREATE TABLE dbo.Training_Protocol(
 protocol_id varchar(32) NOT NULL PRIMARY KEY,protocol_name nvarchar(150) NOT NULL,package_type varchar(30) NOT NULL,
 min_weight decimal(8,2) NOT NULL,max_weight decimal(8,2) NOT NULL,stages_json nvarchar(max) NOT NULL,
 sources_json nvarchar(max) NOT NULL,rationale nvarchar(1000) NOT NULL,status varchar(20) NOT NULL,
 created_by varchar(32) NOT NULL REFERENCES dbo.[User](user_id),approved_by varchar(32) NULL REFERENCES dbo.[User](user_id),
 created_at datetime2 NOT NULL DEFAULT SYSDATETIME(),approved_at datetime2 NULL,
 CHECK(min_weight>0 AND max_weight>min_weight),CHECK(ISJSON(stages_json)=1 AND ISJSON(sources_json)=1),
 CHECK(status IN (''DRAFT'',''APPROVED'',''RETIRED'')));
CREATE TABLE dbo.Training_Recommendation(
 recommendation_id varchar(32) NOT NULL PRIMARY KEY,horse_package_id varchar(32) NOT NULL REFERENCES dbo.HORSE_PACKAGE(horse_package_id),
 assignment_id varchar(32) NOT NULL REFERENCES dbo.Trainer_Assignment(assignment_id),
 medical_record_id varchar(32) NOT NULL REFERENCES dbo.Medical_Record(medical_record_id),
 protocol_id varchar(32) NOT NULL REFERENCES dbo.Training_Protocol(protocol_id),
 generated_by varchar(32) NOT NULL REFERENCES dbo.[User](user_id),snapshot_json nvarchar(max) NOT NULL,
 created_at datetime2 NOT NULL DEFAULT SYSDATETIME(),CHECK(ISJSON(snapshot_json)=1));
CREATE TABLE dbo.Training_Stage(
 stage_id varchar(32) NOT NULL PRIMARY KEY,plan_id varchar(32) NOT NULL REFERENCES dbo.Training_Plan(plan_id),
 stage_order int NOT NULL,start_day int NOT NULL,end_day int NOT NULL,activity_name nvarchar(500) NOT NULL,
 intensity varchar(30) NOT NULL,weekdays_json nvarchar(200) NOT NULL,session_time time NOT NULL,
 CHECK(stage_order>0 AND start_day>0 AND end_day>=start_day),CHECK(ISJSON(weekdays_json)=1),
 CONSTRAINT UX_TrainingStage_Order UNIQUE(plan_id,stage_order));
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_TrainingPlan_Package FOREIGN KEY(horse_package_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_TrainingPlan_Assignment FOREIGN KEY(trainer_assignment_id) REFERENCES dbo.Trainer_Assignment(assignment_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_TrainingPlan_Recommendation FOREIGN KEY(recommendation_id) REFERENCES dbo.Training_Recommendation(recommendation_id);
ALTER TABLE dbo.Medical_Record ADD CONSTRAINT CK_Medical_WeightBCS CHECK((ideal_weight IS NULL OR ideal_weight>0) AND (body_condition_score IS NULL OR body_condition_score BETWEEN 1 AND 9));
INSERT INTO dbo.Role(role_id,role_name) VALUES (''ROL-000001'',''CLUB_MANAGER''),(''ROL-000002'',''HEAD_TRAINER''),(''ROL-000003'',''VETERINARIAN''),(''ROL-000004'',''GROOM''),(''ROL-000005'',''HORSE_OWNER''),(''ROL-000006'',''USER''),(''ROL-000007'',''ADMIN'');
INSERT INTO dbo.Id_Counter(prefix,next_value) VALUES (''ROL-'',7),(''USR-'',0),(''PER-'',0),(''HRS-'',0),(''RAC-'',0),(''PKG-'',0),(''HPG-'',0),(''PLN-'',0),(''SES-'',0),(''HLT-'',0),(''MED-'',0),(''VIT-'',0),(''CLN-'',0),(''LCK-'',0),(''NTF-'',0),(''AUD-'',0),(''RFT-'',0),(''RST-'',0),(''REQ-'',0),(''TR'',0),(''ASN-'',0),(''STG-'',0),(''REC-'',0),(''PRO-'',0),(''CAR-'',0),(''NUT-'',0),(''SUP-'',0),(''EXT-'',0);
';
GO

-- ===== V2__package_assignment_integrity.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'-- All test records are recreated; no legacy NULL package plans are supported by this schema.
ALTER TABLE dbo.Training_Plan ALTER COLUMN horse_package_id varchar(32) NOT NULL;
ALTER TABLE dbo.Training_Plan ALTER COLUMN trainer_assignment_id varchar(32) NOT NULL;
ALTER TABLE dbo.Training_Plan ADD horse_id varchar(32) NULL;
';
GO
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'
UPDATE p SET horse_id=hp.horse_id FROM dbo.Training_Plan p JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=p.horse_package_id;
ALTER TABLE dbo.Training_Plan ALTER COLUMN horse_id varchar(32) NOT NULL;
ALTER TABLE dbo.HORSE_PACKAGE ADD CONSTRAINT UQ_HorsePackage_Horse UNIQUE(horse_package_id,horse_id);
ALTER TABLE dbo.Trainer_Assignment ADD CONSTRAINT UQ_Assignment_Package UNIQUE(assignment_id,horse_package_id);
ALTER TABLE dbo.Training_Recommendation ADD CONSTRAINT UQ_Recommendation_Package UNIQUE(recommendation_id,horse_package_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT UQ_TrainingPlan_Horse UNIQUE(plan_id,horse_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_Plan_PackageHorse FOREIGN KEY(horse_package_id,horse_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id,horse_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_Plan_AssignmentPackage FOREIGN KEY(trainer_assignment_id,horse_package_id) REFERENCES dbo.Trainer_Assignment(assignment_id,horse_package_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_Plan_RecommendationPackage FOREIGN KEY(recommendation_id,horse_package_id) REFERENCES dbo.Training_Recommendation(recommendation_id,horse_package_id);
ALTER TABLE dbo.Training_Recommendation ADD CONSTRAINT FK_Recommendation_AssignmentPackage FOREIGN KEY(assignment_id,horse_package_id) REFERENCES dbo.Trainer_Assignment(assignment_id,horse_package_id);
ALTER TABLE dbo.Horse_Plan ADD CONSTRAINT FK_HorsePlan_PlanHorse FOREIGN KEY(plan_id,horse_id) REFERENCES dbo.Training_Plan(plan_id,horse_id);
CREATE INDEX IX_Assignment_TrainerStatus ON dbo.Trainer_Assignment(trainer_id,status,horse_package_id);
CREATE INDEX IX_TrainingPlan_Package ON dbo.Training_Plan(horse_package_id);

-- Retire the old one-trainer-on-Horse relation; assignments now exclusively go through Horse_Package.
DECLARE @sql nvarchar(max)=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.Horse DROP CONSTRAINT ''+QUOTENAME(fk.name)+N'';''
FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
WHERE fk.parent_object_id=OBJECT_ID(''dbo.Horse'') AND COL_NAME(fc.parent_object_id,fc.parent_column_id)=''head_trainer_id'';
EXEC sp_executesql @sql;
ALTER TABLE dbo.Horse DROP COLUMN head_trainer_id;
';
GO

-- ===== V3__measured_weight_for_training.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'ALTER TABLE dbo.Medical_Record ADD measured_weight decimal(8,2) NULL;
';
GO
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'
ALTER TABLE dbo.Medical_Record ADD CONSTRAINT CK_Medical_MeasuredWeight CHECK(measured_weight IS NULL OR measured_weight>0);
ALTER TABLE dbo.Medical_Record ADD CONSTRAINT CK_Medical_ConfirmedFitness CHECK(
 status<>''CONFIRMED'' OR (
  training_eligible IS NOT NULL AND NULLIF(LTRIM(RTRIM(fitness_conclusion)),N'''') IS NOT NULL
  AND (training_eligible=0 OR (measured_weight IS NOT NULL AND measured_weight>0 AND health_status IS NOT NULL AND health_status=''READY''))
 )
);
';
GO

-- ===== V4__three_digit_ids_and_role_profiles.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;

-- Refuse conversion instead of truncating/reusing a committed code.
IF EXISTS (SELECT 1 FROM dbo.Id_Counter WHERE next_value NOT BETWEEN 0 AND 999)
    THROW 51000, ''Three-digit conversion requires every ID counter to be between 0 and 999.'', 1;

CREATE TABLE #CodeMap (old_code varchar(32) NOT NULL PRIMARY KEY, new_code varchar(32) NOT NULL UNIQUE);
;WITH numbers AS (
    SELECT 1 AS n UNION ALL SELECT n+1 FROM numbers WHERE n<999
)
INSERT #CodeMap(old_code,new_code)
SELECT c.prefix+RIGHT(''000000''+CAST(n.n AS varchar(6)),6),
       CASE c.prefix WHEN ''HRS-'' THEN ''HOR-'' WHEN ''TR'' THEN ''HTR-'' ELSE c.prefix END
       +RIGHT(''000''+CAST(n.n AS varchar(3)),3)
FROM dbo.Id_Counter c JOIN numbers n ON n.n<=c.next_value
OPTION (MAXRECURSION 1000);

-- All operations are in Flyway''s migration transaction. Restore trusted FKs before completion.
DECLARE @sql nvarchar(max)=N'''';
SELECT @sql=@sql+N''ALTER TABLE ''+QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))+N''.''
    +QUOTENAME(OBJECT_NAME(parent_object_id))+N'' NOCHECK CONSTRAINT ''+QUOTENAME(name)+N'';''
FROM sys.foreign_keys WHERE OBJECT_SCHEMA_NAME(parent_object_id)=''dbo'';
EXEC sys.sp_executesql @sql;

-- Domain PKs and FKs are varchar(32), including audit entity_id and OTP user_id.
SET @sql=N'''';
SELECT @sql=@sql+N''UPDATE t SET ''+QUOTENAME(c.name)+N''=m.new_code FROM dbo.''+QUOTENAME(t.name)
    +N'' t JOIN #CodeMap m ON t.''+QUOTENAME(c.name)+N''=m.old_code;''
FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
WHERE SCHEMA_NAME(t.schema_id)=''dbo'' AND TYPE_NAME(c.user_type_id)=''varchar'' AND c.max_length=32
    AND t.name NOT LIKE ''flyway%'' AND t.name<>''Id_Counter'';
EXEC sys.sp_executesql @sql;

-- Update structured identifier references in saved recommendation snapshots, not free-text history.
DECLARE @old varchar(32),@new varchar(32);
DECLARE codes CURSOR LOCAL FAST_FORWARD FOR SELECT old_code,new_code FROM #CodeMap;
OPEN codes; FETCH NEXT FROM codes INTO @old,@new;
WHILE @@FETCH_STATUS=0
BEGIN
    UPDATE dbo.Training_Recommendation
    SET snapshot_json=REPLACE(snapshot_json,''"''+@old+''"'',''"''+@new+''"'')
    WHERE CHARINDEX(''"''+@old+''"'',snapshot_json)>0;
    FETCH NEXT FROM codes INTO @old,@new;
END;
CLOSE codes; DEALLOCATE codes;

UPDATE dbo.Id_Counter SET prefix=''HOR-'' WHERE prefix=''HRS-'';
UPDATE dbo.Id_Counter SET prefix=''HTR-'' WHERE prefix=''TR'';
INSERT dbo.Id_Counter(prefix,next_value) VALUES (''OWN-'',0),(''VET-'',0),(''CM-'',0);
ALTER TABLE dbo.Id_Counter ADD CONSTRAINT CK_IdCounter_ThreeDigits CHECK (next_value BETWEEN 0 AND 999);

CREATE TABLE dbo.Account_Role_Profile (
    profile_id varchar(32) NOT NULL CONSTRAINT PK_AccountRoleProfile PRIMARY KEY,
    user_id varchar(32) NOT NULL,
    role_name varchar(50) NOT NULL,
    CONSTRAINT UQ_AccountRoleProfile_UserRole UNIQUE(user_id,role_name),
    CONSTRAINT FK_AccountRoleProfile_User FOREIGN KEY(user_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_AccountRoleProfile_Role FOREIGN KEY(role_name) REFERENCES dbo.Role(role_name),
    CONSTRAINT CK_AccountRoleProfile_Code CHECK (
        (role_name=''HORSE_OWNER'' AND profile_id LIKE ''OWN-[0-9][0-9][0-9]'' AND profile_id<>''OWN-000'')
        OR (role_name=''VETERINARIAN'' AND profile_id LIKE ''VET-[0-9][0-9][0-9]'' AND profile_id<>''VET-000'')
        OR (role_name=''CLUB_MANAGER'' AND profile_id LIKE ''CM-[0-9][0-9][0-9]'' AND profile_id<>''CM-000'')
    )
);

-- Backfill independent profiles for existing accounts without changing USR identity.
;WITH ranked AS (
    SELECT u.user_id,r.role_name,
        CASE r.role_name WHEN ''HORSE_OWNER'' THEN ''OWN-'' WHEN ''VETERINARIAN'' THEN ''VET-'' ELSE ''CM-'' END AS prefix,
        ROW_NUMBER() OVER(PARTITION BY r.role_name ORDER BY u.user_id) AS ordinal
    FROM dbo.[User] u JOIN dbo.Role r ON r.role_id=u.role_id
    WHERE r.role_name IN (''HORSE_OWNER'',''VETERINARIAN'',''CLUB_MANAGER'')
)
INSERT dbo.Account_Role_Profile(profile_id,user_id,role_name)
SELECT prefix+RIGHT(''000''+CAST(ordinal AS varchar(3)),3),user_id,role_name FROM ranked;
UPDATE c SET next_value=(SELECT COUNT(*) FROM dbo.Account_Role_Profile p WHERE p.profile_id LIKE c.prefix+''%'')
FROM dbo.Id_Counter c WHERE c.prefix IN (''OWN-'',''VET-'',''CM-'');

SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE ''+QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))+N''.''
    +QUOTENAME(OBJECT_NAME(parent_object_id))+N'' WITH CHECK CHECK CONSTRAINT ''+QUOTENAME(name)+N'';''
FROM sys.foreign_keys WHERE OBJECT_SCHEMA_NAME(parent_object_id)=''dbo'';
EXEC sys.sp_executesql @sql;
DROP TABLE #CodeMap;
';
GO

-- ===== V5__remove_horse_package_paid_at.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'IF COL_LENGTH(''dbo.HORSE_PACKAGE'', ''paid_at'') IS NOT NULL
    ALTER TABLE dbo.HORSE_PACKAGE DROP COLUMN paid_at;
';
GO

-- ===== V6__package_specific_roadmaps.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'ALTER TABLE dbo.Training_Plan ADD package_type varchar(30) NULL, roadmap_version varchar(50) NULL;
';
GO
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'
ALTER TABLE dbo.Training_Stage ADD phase_code varchar(50) NULL, title nvarchar(150) NULL, objective nvarchar(1000) NULL;
';
GO
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'
ALTER TABLE dbo.Training_Session ADD training_stage_id varchar(32) NULL;
';
GO
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'
CREATE UNIQUE INDEX UX_TrainingStage_PlanStage ON dbo.Training_Stage(stage_id,plan_id);
ALTER TABLE dbo.Training_Session ADD CONSTRAINT FK_TrainingSession_PlanStage
    FOREIGN KEY(training_stage_id,plan_id) REFERENCES dbo.Training_Stage(stage_id,plan_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT CK_TrainingPlan_PackageType
    CHECK(package_type IS NULL OR package_type IN (''BASIC'',''RACING'',''PERFORMANCE'',''RECOVERY''));
';
GO

-- ===== V7__session_windows_and_weekdays.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'ALTER TABLE dbo.Training_Stage ADD session_end_time time(7) NULL;
';
GO
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'
ALTER TABLE dbo.Training_Stage ADD CONSTRAINT CK_TrainingStage_TimeWindow
    CHECK(session_end_time IS NULL OR session_end_time>session_time);
ALTER TABLE dbo.Training_Session ADD CONSTRAINT CK_TrainingSession_PlannedWindow
    CHECK(scheduled_end IS NULL OR (scheduled_end>scheduled_start AND CONVERT(date,scheduled_end)=CONVERT(date,scheduled_start)));
';
GO

-- ===== V8__session_results_and_recovery.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'-- Additive, idempotent: may be applied with sqlcmd, then registered by Flyway on startup.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH(''dbo.Training_Session'',''resting_heart_rate'') IS NULL
BEGIN
 ALTER TABLE dbo.Training_Session ADD
  resting_heart_rate int NULL,
  end_exercise_heart_rate int NULL,
  recovery_heart_rate_2_min int NULL,
  recovery_measured_at datetime2 NULL,
  resting_medical_record_id varchar(32) NULL,
  resting_measured_at datetime2 NULL;
END;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=''CK_TrainingSession_RecoveryResults'' AND parent_object_id=OBJECT_ID(''dbo.Training_Session''))
 EXEC(N''ALTER TABLE dbo.Training_Session WITH CHECK ADD CONSTRAINT CK_TrainingSession_RecoveryResults CHECK(
 (resting_heart_rate IS NULL OR resting_heart_rate>0) AND
 (end_exercise_heart_rate IS NULL OR end_exercise_heart_rate>0) AND
 (recovery_heart_rate_2_min IS NULL OR recovery_heart_rate_2_min>0) AND
 (distance IS NULL OR distance>=0) AND
 (actual_end IS NULL OR (actual_start IS NOT NULL AND actual_end>actual_start)) AND
 (recovery_measured_at IS NULL OR (actual_end IS NOT NULL AND recovery_measured_at>=DATEADD(minute,2,actual_end))))'');
-- Resting medical ID is a historical snapshot reference, no changes to Medical tables.
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=''FK_TrainingSession_RestingMedical'')
 EXEC(N''ALTER TABLE dbo.Training_Session WITH CHECK ADD CONSTRAINT FK_TrainingSession_RestingMedical
 FOREIGN KEY(resting_medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id)'');
EXEC(N''CREATE OR ALTER TRIGGER dbo.TR_TrainingSession_PackageBoundary
ON dbo.Training_Session AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.session_id=i.session_id WHERE i.plan_id<>d.plan_id OR i.horse_id<>d.horse_id)
  THROW 51010,''''A session cannot be reassigned to another horse or plan.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Training_Plan p ON p.plan_id=i.plan_id JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=p.horse_package_id
  WHERE i.horse_id<>hp.horse_id OR hp.start_date IS NULL OR hp.end_date IS NULL OR CONVERT(date,i.scheduled_start)<hp.start_date OR CONVERT(date,i.scheduled_start)>hp.end_date OR (i.scheduled_end IS NOT NULL AND CONVERT(date,i.scheduled_end)>hp.end_date))
  THROW 51011,''''Session dates must remain within its registered horse package.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.session_id=i.session_id
  JOIN dbo.Horse h WITH(UPDLOCK,HOLDLOCK) ON h.horse_id=i.horse_id
  WHERE (h.training_locked=1 OR EXISTS(SELECT 1 FROM dbo.Training_Lock l WHERE l.horse_id=i.horse_id AND l.unlocked_at IS NULL))
   AND (d.session_id IS NULL OR (i.actual_start IS NOT NULL AND d.actual_start IS NULL) OR (i.actual_end IS NOT NULL AND d.actual_end IS NULL) OR (i.status=''''COMPLETED'''' AND d.status<>''''COMPLETED'''')))
  THROW 51012,''''Medical training lock blocks session creation, start, stop and completion.'''',1;
END'');
EXEC(N''CREATE OR ALTER TRIGGER dbo.TR_TrainingPlan_FixedRegisteredPackage
ON dbo.Training_Plan AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.plan_id=i.plan_id WHERE i.horse_package_id<>d.horse_package_id AND EXISTS(SELECT 1 FROM dbo.Training_Session s WHERE s.plan_id=i.plan_id))
  THROW 51013,''''A plan with sessions cannot move to another registered package.'''',1;
END'');
COMMIT TRANSACTION;
';
GO

-- ===== V9__team_horse_medical_additions.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'-- Non-destructive portion of the team''s proposed schema.
-- Does not replace Trainer_Profile/Trainer_Assignment or drop columns used by the current backend.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(''dbo.Horse_Admission'',''U'') IS NULL
BEGIN
 CREATE TABLE dbo.Horse_Admission (
  horse_id varchar(32) NOT NULL CONSTRAINT PK_Horse_Admission PRIMARY KEY,
  status varchar(50) NOT NULL,
  medical_record_id varchar(32) NULL,
  decision_by varchar(32) NULL,
  decision_reason nvarchar(1000) NULL,
  decided_at datetime2(7) NULL,
  created_at datetime2(7) NOT NULL,
  CONSTRAINT FK_TeamAdmission_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
  CONSTRAINT FK_TeamAdmission_Medical FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id),
  CONSTRAINT FK_TeamAdmission_DecisionUser FOREIGN KEY(decision_by) REFERENCES dbo.[User](user_id)
 );
END;
IF OBJECT_ID(''dbo.Horse_Assignment'',''U'') IS NULL
BEGIN
 CREATE TABLE dbo.Horse_Assignment (
  id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Horse_Assignment PRIMARY KEY,
  horse_id varchar(32) NOT NULL,
  kind varchar(10) NOT NULL,
  assigned_by varchar(32) NOT NULL,
  assignee_id varchar(32) NOT NULL,
  status varchar(20) NOT NULL,
  reason nvarchar(1000) NULL,
  created_at datetime2(7) NOT NULL,
  responded_at datetime2(7) NULL,
  medical_record_id varchar(32) NULL,
  CONSTRAINT FK_TeamAssignment_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
  CONSTRAINT FK_TeamAssignment_AssignedBy FOREIGN KEY(assigned_by) REFERENCES dbo.[User](user_id),
  CONSTRAINT FK_TeamAssignment_Assignee FOREIGN KEY(assignee_id) REFERENCES dbo.[User](user_id),
  CONSTRAINT FK_TeamAssignment_Medical FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id)
 );
END;
IF COL_LENGTH(''dbo.Medical_Record'',''training_eligible'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Record ADD training_eligible bit NULL'');
IF COL_LENGTH(''dbo.Medical_Record'',''eligibility_reason'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Record ADD eligibility_reason nvarchar(1000) NULL'');
IF COL_LENGTH(''dbo.Horse'',''registration_number'') IS NULL
 EXEC(N''ALTER TABLE dbo.Horse ADD registration_number varchar(100) NULL'');
IF COL_LENGTH(''dbo.Horse'',''document_type'') IS NULL
 EXEC(N''ALTER TABLE dbo.Horse ADD document_type varchar(50) NULL'');
IF COL_LENGTH(''dbo.Horse'',''document_url'') IS NULL
 EXEC(N''ALTER TABLE dbo.Horse ADD document_url nvarchar(500) NULL'');
IF COL_LENGTH(''dbo.Medical_Vital_Sign'',''weight'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Vital_Sign ADD weight decimal(7,2) NULL'');
IF COL_LENGTH(''dbo.Medical_Record'',''suggested_conclusion'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Record ADD suggested_conclusion varchar(30) NULL'');
IF COL_LENGTH(''dbo.Medical_Record'',''final_conclusion'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Record ADD final_conclusion varchar(30) NULL'');
IF COL_LENGTH(''dbo.Medical_Record'',''override_reason'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Record ADD override_reason nvarchar(1000) NULL'');
IF COL_LENGTH(''dbo.Medical_Record'',''monitoring_note'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Record ADD monitoring_note nvarchar(1000) NULL'');
IF COL_LENGTH(''dbo.Medical_Record'',''training_lock_reason'') IS NULL
 EXEC(N''ALTER TABLE dbo.Medical_Record ADD training_lock_reason nvarchar(1000) NULL'');
COMMIT TRANSACTION;
';
GO

-- ===== V10__align_group_horse_medical_trainer.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY')
 EXEC sys.sp_executesql N'-- Group schema is authoritative. Existing data is translated, not reset.
-- V9 provides Horse_Admission, Horse_Assignment and the additive medical fields.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N''RaceForge_GroupSchema_V10'' AND CONVERT(nvarchar(50),value)=N''APPLIED'') RETURN;
BEGIN TRANSACTION;
IF OBJECT_ID(''dbo.Trainer_Profile'',''U'') IS NULL OR OBJECT_ID(''dbo.Trainer_Assignment'',''U'') IS NULL
 THROW 51020,''Expected legacy training tables are missing; do not guess a migration mapping.'',1;

-- Capture constraints before replacing key types. Recreate with WITH CHECK, never disable trust.
CREATE TABLE #FK (ddl nvarchar(max));
INSERT #FK SELECT N''ALTER TABLE ''+QUOTENAME(OBJECT_SCHEMA_NAME(f.parent_object_id))+N''.''+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N'' WITH CHECK ADD CONSTRAINT ''+QUOTENAME(f.name)+N'' FOREIGN KEY (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.parent_object_id,fc.parent_column_id))),N'','') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N'') REFERENCES ''+QUOTENAME(OBJECT_SCHEMA_NAME(f.referenced_object_id))+N''.''+QUOTENAME(OBJECT_NAME(f.referenced_object_id))+N'' (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.referenced_object_id,fc.referenced_column_id))),N'','') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N'')''+
 CASE f.delete_referential_action WHEN 1 THEN N'' ON DELETE CASCADE'' WHEN 2 THEN N'' ON DELETE SET NULL'' WHEN 3 THEN N'' ON DELETE SET DEFAULT'' ELSE N'''' END+
 CASE f.update_referential_action WHEN 1 THEN N'' ON UPDATE CASCADE'' WHEN 2 THEN N'' ON UPDATE SET NULL'' WHEN 3 THEN N'' ON UPDATE SET DEFAULT'' ELSE N'''' END+N'';''
 FROM sys.foreign_keys f WHERE OBJECT_SCHEMA_NAME(f.parent_object_id)=''dbo'' AND OBJECT_NAME(f.parent_object_id) NOT IN (''Trainer_Profile'',''Trainer_Assignment'');
UPDATE #FK SET ddl=REPLACE(ddl,N''REFERENCES [dbo].[Trainer_Assignment] ([assignment_id]'',N''REFERENCES [dbo].[Horse_Assignment] ([id]'');

CREATE TABLE #Keys(ddl nvarchar(max));
INSERT #Keys SELECT N''ALTER TABLE dbo.''+QUOTENAME(t.name)+N'' ADD CONSTRAINT ''+QUOTENAME(k.name)+CASE k.type WHEN ''PK'' THEN N'' PRIMARY KEY '' ELSE N'' UNIQUE '' END+CASE i.type WHEN 1 THEN N''CLUSTERED '' ELSE N''NONCLUSTERED '' END+N'' (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)+CASE ic.is_descending_key WHEN 1 THEN N'' DESC'' ELSE N'' ASC'' END),N'','') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)+N'');''
 FROM sys.key_constraints k JOIN sys.tables t ON t.object_id=k.parent_object_id JOIN sys.indexes i ON i.object_id=t.object_id AND i.index_id=k.unique_index_id
 WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'' AND t.name NOT IN (''Trainer_Profile'',''Trainer_Assignment'');
CREATE TABLE #Checks(ddl nvarchar(max));
INSERT #Checks SELECT N''ALTER TABLE dbo.''+QUOTENAME(t.name)+N'' WITH CHECK ADD CONSTRAINT ''+QUOTENAME(c.name)+N'' CHECK ''+c.definition+N'';''
 FROM sys.check_constraints c JOIN sys.tables t ON t.object_id=c.parent_object_id
 WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT IN (''Trainer_Profile'',''Trainer_Assignment'')
 AND NOT(t.name=''Horse'' AND (c.definition LIKE ''%admission_status%'' OR c.definition LIKE ''%dam_sire%'' OR c.definition LIKE ''%background%'' OR c.definition LIKE ''%weight%''))
 AND NOT(t.name=''Medical_Record'' AND (c.definition LIKE ''%measured_weight%'' OR c.definition LIKE ''%fitness_conclusion%''))
 AND NOT(t.name=''Medical_Clinical_Exam'' AND (c.definition LIKE ''%severity%'' OR c.definition LIKE ''%abnormality_type%''));
CREATE TABLE #Indexes(ddl nvarchar(max));
INSERT #Indexes SELECT N''CREATE ''+CASE i.is_unique WHEN 1 THEN N''UNIQUE '' ELSE N'''' END+N''NONCLUSTERED INDEX ''+QUOTENAME(i.name)+N'' ON dbo.''+QUOTENAME(t.name)+N'' (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)+CASE ic.is_descending_key WHEN 1 THEN N'' DESC'' ELSE N'' ASC'' END),N'','') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)+N'')''+
 CASE WHEN EXISTS(SELECT 1 FROM sys.index_columns ic WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1) THEN N'' INCLUDE (''+(SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)),N'','') WITHIN GROUP(ORDER BY ic.index_column_id) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1)+N'')'' ELSE N'''' END+
 CASE i.has_filter WHEN 1 THEN N'' WHERE ''+i.filter_definition ELSE N'''' END+N'';''
 FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'' AND t.name NOT IN (''Trainer_Profile'',''Trainer_Assignment'') AND i.type=2 AND i.is_primary_key=0 AND i.is_unique_constraint=0;

DECLARE @sql nvarchar(max)=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(name)+N'';'' FROM sys.foreign_keys WHERE OBJECT_SCHEMA_NAME(parent_object_id)=''dbo'';
EXEC sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''DROP INDEX ''+QUOTENAME(i.name)+N'' ON dbo.''+QUOTENAME(t.name)+N'';'' FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'' AND i.type=2 AND i.is_primary_key=0 AND i.is_unique_constraint=0;
EXEC sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(t.name)+N'' DROP CONSTRAINT ''+QUOTENAME(k.name)+N'';'' FROM sys.key_constraints k JOIN sys.tables t ON t.object_id=k.parent_object_id WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'';
EXEC sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(name)+N'';'' FROM sys.check_constraints WHERE OBJECT_SCHEMA_NAME(parent_object_id)=''dbo'';
EXEC sp_executesql @sql;

-- Keep optional trainer biography/history without changing the group''s Trainer core definition.
CREATE TABLE dbo.Trainer (trainer_id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Trainer PRIMARY KEY,user_id varchar(20) NOT NULL CONSTRAINT UQ_Trainer_User UNIQUE);
CREATE TABLE dbo.Trainer_Detail (trainer_id int NOT NULL CONSTRAINT PK_Trainer_Detail PRIMARY KEY,bio nvarchar(1000) NULL,qualifications nvarchar(1000) NULL,status varchar(20) NOT NULL DEFAULT ''ACTIVE'',created_at datetime2(7) NOT NULL DEFAULT SYSDATETIME());
CREATE TABLE dbo.Horse_Trainer (horse_id varchar(20) NOT NULL,trainer_id int NOT NULL,CONSTRAINT PK_Horse_Trainer PRIMARY KEY(horse_id,trainer_id));
CREATE TABLE #TrainerMap(old_id varchar(32) NOT NULL,new_id int NOT NULL,user_id varchar(32) NOT NULL);
MERGE dbo.Trainer AS target USING (SELECT trainer_id,user_id FROM dbo.Trainer_Profile) AS source ON 1=0
 WHEN NOT MATCHED THEN INSERT(user_id) VALUES(source.user_id)
 OUTPUT source.trainer_id,inserted.trainer_id,source.user_id INTO #TrainerMap;
INSERT dbo.Trainer_Detail(trainer_id,bio,qualifications,status,created_at)
 SELECT m.new_id,p.bio,p.qualifications,p.status,p.created_at FROM dbo.Trainer_Profile p JOIN #TrainerMap m ON m.old_id=p.trainer_id;

ALTER TABLE dbo.Horse_Assignment ADD horse_package_id varchar(20) NULL,ended_at datetime2(7) NULL;
CREATE TABLE #AssignmentMap(old_id varchar(32) NOT NULL,new_id int NOT NULL);
EXEC(N''MERGE dbo.Horse_Assignment AS target USING (
 SELECT a.*,hp.horse_id,m.user_id FROM dbo.Trainer_Assignment a JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=a.horse_package_id JOIN #TrainerMap m ON m.old_id=a.trainer_id
) AS source ON 1=0
 WHEN NOT MATCHED THEN INSERT(horse_id,kind,assigned_by,assignee_id,status,reason,created_at,responded_at,horse_package_id,ended_at)
 VALUES(source.horse_id,''''TRAINER'''',source.assigned_by,source.user_id,CASE source.status WHEN ''''PENDING'''' THEN ''''ASSIGNED'''' WHEN ''''REJECTED'''' THEN ''''DECLINED'''' WHEN ''''ENDED'''' THEN ''''CANCELLED'''' ELSE source.status END,source.reason,source.assigned_at,source.responded_at,source.horse_package_id,source.ended_at)
 OUTPUT source.assignment_id,inserted.id INTO #AssignmentMap;'');
-- Disable only our immutable-package trigger while translating FK values; restored before COMMIT.
DISABLE TRIGGER dbo.TR_TrainingPlan_FixedRegisteredPackage ON dbo.Training_Plan;
UPDATE p SET trainer_assignment_id=CONVERT(varchar(32),m.new_id) FROM dbo.Training_Plan p JOIN #AssignmentMap m ON m.old_id=p.trainer_assignment_id;
UPDATE r SET assignment_id=CONVERT(varchar(32),m.new_id) FROM dbo.Training_Recommendation r JOIN #AssignmentMap m ON m.old_id=r.assignment_id;
IF EXISTS(SELECT 1 FROM dbo.Training_Plan WHERE TRY_CONVERT(int,trainer_assignment_id) IS NULL) OR EXISTS(SELECT 1 FROM dbo.Training_Recommendation WHERE TRY_CONVERT(int,assignment_id) IS NULL)
 THROW 51021,''Unmapped trainer assignment; migration rolled back.'',1;
ALTER TABLE dbo.Training_Plan ALTER COLUMN trainer_assignment_id int NOT NULL;
ALTER TABLE dbo.Training_Recommendation ALTER COLUMN assignment_id int NOT NULL;
EXEC(N''INSERT dbo.Horse_Trainer(horse_id,trainer_id) SELECT DISTINCT a.horse_id,t.trainer_id FROM dbo.Horse_Assignment a JOIN dbo.Trainer t ON t.user_id=a.assignee_id JOIN dbo.Trainer_Detail d ON d.trainer_id=t.trainer_id WHERE a.kind=''''TRAINER'''' AND a.status=''''ACCEPTED'''' AND d.status=''''ACTIVE'''';'');
DROP TABLE dbo.Trainer_Assignment;
DROP TABLE dbo.Trainer_Profile;

-- Health_Profile INT IDENTITY and matching Medical_Record.profile_id, without deleting examinations.
ALTER TABLE dbo.Health_Profile ADD group_profile_id int IDENTITY(1,1) NOT NULL;
CREATE TABLE #HealthMap(old_id varchar(32),new_id int);
EXEC(N''INSERT #HealthMap SELECT profile_id,group_profile_id FROM dbo.Health_Profile;'');
UPDATE mr SET profile_id=CONVERT(varchar(32),m.new_id) FROM dbo.Medical_Record mr JOIN #HealthMap m ON m.old_id=mr.profile_id;
IF EXISTS(SELECT 1 FROM dbo.Medical_Record WHERE TRY_CONVERT(int,profile_id) IS NULL) THROW 51022,''Unmapped health profile; migration rolled back.'',1;
ALTER TABLE dbo.Medical_Record ALTER COLUMN profile_id int NOT NULL;
ALTER TABLE dbo.Health_Profile DROP COLUMN profile_id;
EXEC sp_rename ''dbo.Health_Profile.group_profile_id'',''profile_id'',''COLUMN'';

-- Admission is authoritative. Preserve every existing horse''s current decision before dropping duplicates.
INSERT dbo.Horse_Admission(horse_id,status,decision_reason,created_at)
 SELECT h.horse_id,h.admission_status,h.admission_note,SYSDATETIME() FROM dbo.Horse h WHERE NOT EXISTS(SELECT 1 FROM dbo.Horse_Admission a WHERE a.horse_id=h.horse_id);
-- Canonical measured weight belongs to the examination vital signs; do not invent readings.
UPDATE v SET weight=mr.measured_weight FROM dbo.Medical_Vital_Sign v JOIN dbo.Medical_Record mr ON mr.medical_record_id=v.medical_record_id WHERE v.weight IS NULL AND mr.measured_weight IS NOT NULL;
-- If a historical record has no vital-sign row, create a weight-only row using the normal String counter.
DECLARE @record varchar(32),@weight decimal(8,2),@next int;
DECLARE missing_vitals CURSOR LOCAL FAST_FORWARD FOR SELECT mr.medical_record_id,mr.measured_weight FROM dbo.Medical_Record mr WHERE mr.measured_weight IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Medical_Vital_Sign v WHERE v.medical_record_id=mr.medical_record_id);
OPEN missing_vitals;FETCH NEXT FROM missing_vitals INTO @record,@weight;
WHILE @@FETCH_STATUS=0
BEGIN
 SELECT @next=next_value+1 FROM dbo.Id_Counter WITH(UPDLOCK,HOLDLOCK) WHERE prefix=''VIT-'';
 IF @next IS NULL OR @next>999 THROW 51023,''Vital-sign ID range exhausted while preserving old weight data.'',1;
 UPDATE dbo.Id_Counter SET next_value=@next WHERE prefix=''VIT-'';
 INSERT dbo.Medical_Vital_Sign(vital_sign_id,medical_record_id,weight) VALUES(''VIT-''+RIGHT(''000''+CONVERT(varchar(3),@next),3),@record,@weight);
 FETCH NEXT FROM missing_vitals INTO @record,@weight;
END;
CLOSE missing_vitals;DEALLOCATE missing_vitals;
UPDATE dbo.Medical_Record SET eligibility_reason=COALESCE(eligibility_reason,fitness_conclusion),
 final_conclusion=COALESCE(final_conclusion,CASE training_eligible WHEN 1 THEN ''FIT'' WHEN 0 THEN ''NOT_FIT'' END);
-- Existing unconfirmed/legacy conclusions remain explicit; do not generate suggested_conclusion from old data.
ALTER TABLE dbo.Medical_Record DROP COLUMN measured_weight,fitness_conclusion;

-- The default/check bound to removed Horse columns must be dropped before the columns.
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.Horse DROP CONSTRAINT ''+QUOTENAME(dc.name)+N'';'' FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id WHERE dc.parent_object_id=OBJECT_ID(''dbo.Horse'') AND c.name IN (''dam_sire'',''background'',''weight'',''head_trainer_id'',''admission_status'',''admission_note'');
EXEC sp_executesql @sql;
ALTER TABLE dbo.Horse DROP COLUMN dam_sire,background,weight,admission_status,admission_note;
IF COL_LENGTH(''dbo.Horse'',''head_trainer_id'') IS NOT NULL EXEC(N''ALTER TABLE dbo.Horse DROP COLUMN head_trainer_id'');
UPDATE dbo.Medical_Clinical_Exam SET condition_status=''ABNORMAL'' WHERE condition_status=''CRITICAL'';
-- Preserve removed clinical descriptors in notes, rather than silently discarding findings.
IF EXISTS(SELECT 1 FROM dbo.Medical_Clinical_Exam WHERE (severity IS NOT NULL OR abnormality_type IS NOT NULL) AND LEN(COALESCE(notes,N''''))+LEN(COALESCE(severity,N''''))+LEN(COALESCE(abnormality_type,N''''))+60>500)
 THROW 51024,''Clinical notes would be truncated while preserving old descriptors; resolve before migration.'',1;
UPDATE dbo.Medical_Clinical_Exam SET notes=CONCAT(COALESCE(notes,N''''),CASE WHEN severity IS NOT NULL THEN N'' [Legacy severity: ''+severity+N'']'' ELSE N'''' END,CASE WHEN abnormality_type IS NOT NULL THEN N'' [Legacy abnormality: ''+abnormality_type+N'']'' ELSE N'''' END) WHERE severity IS NOT NULL OR abnormality_type IS NOT NULL;
ALTER TABLE dbo.Medical_Clinical_Exam DROP COLUMN severity,abnormality_type;

-- Exact group VARCHAR(20) width, including every dependent String key, never truncate existing values.
DECLARE @table sysname,@column sysname,@nullable bit;
DECLARE widths CURSOR LOCAL FAST_FORWARD FOR SELECT t.name,c.name,c.is_nullable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'' AND ty.name=''varchar'' AND c.max_length=32;
OPEN widths;FETCH NEXT FROM widths INTO @table,@column,@nullable;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @sql=N''IF EXISTS(SELECT 1 FROM dbo.''+QUOTENAME(@table)+N'' WHERE DATALENGTH(''+QUOTENAME(@column)+N'')>20) THROW 51025,''''An existing ID exceeds VARCHAR(20); migration will not truncate it.'''',1; ALTER TABLE dbo.''+QUOTENAME(@table)+N'' ALTER COLUMN ''+QUOTENAME(@column)+N'' varchar(20) ''+CASE @nullable WHEN 1 THEN N''NULL'' ELSE N''NOT NULL'' END+N'';'';
 EXEC sp_executesql @sql;
 FETCH NEXT FROM widths INTO @table,@column,@nullable;
END;
CLOSE widths;DEALLOCATE widths;

DECLARE restore_keys CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Keys;
OPEN restore_keys;FETCH NEXT FROM restore_keys INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_keys INTO @sql;END;
CLOSE restore_keys;DEALLOCATE restore_keys;
EXEC(N''ALTER TABLE dbo.Horse_Assignment ADD CONSTRAINT UQ_HorseAssignment_Package UNIQUE(id,horse_package_id);'');
EXEC(N''ALTER TABLE dbo.Horse_Assignment ADD CONSTRAINT FK_HorseAssignment_PackageHorse FOREIGN KEY(horse_package_id,horse_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id,horse_id);'');
ALTER TABLE dbo.Trainer ADD CONSTRAINT FK_Trainer_User FOREIGN KEY(user_id) REFERENCES dbo.[User](user_id);
ALTER TABLE dbo.Trainer_Detail ADD CONSTRAINT FK_TrainerDetail_Trainer FOREIGN KEY(trainer_id) REFERENCES dbo.Trainer(trainer_id);
ALTER TABLE dbo.Horse_Trainer ADD CONSTRAINT FK_HorseTrainer_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),CONSTRAINT FK_HorseTrainer_Trainer FOREIGN KEY(trainer_id) REFERENCES dbo.Trainer(trainer_id);
-- FK targets may be unique indexes rather than UNIQUE constraints (e.g. Role.role_name).
DECLARE restore_indexes CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Indexes;
OPEN restore_indexes;FETCH NEXT FROM restore_indexes INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_indexes INTO @sql;END;
CLOSE restore_indexes;DEALLOCATE restore_indexes;
DECLARE restore_fk CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #FK;
OPEN restore_fk;FETCH NEXT FROM restore_fk INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_fk INTO @sql;END;
CLOSE restore_fk;DEALLOCATE restore_fk;
DECLARE restore_checks CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Checks;
OPEN restore_checks;FETCH NEXT FROM restore_checks INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_checks INTO @sql;END;
CLOSE restore_checks;DEALLOCATE restore_checks;
EXEC(N''ALTER TABLE dbo.Horse_Assignment WITH CHECK ADD CONSTRAINT CK_HorseAssignment_KindPackage CHECK((kind=''''VET'''' AND horse_package_id IS NULL) OR (kind=''''TRAINER'''' AND horse_package_id IS NOT NULL));'');
ALTER TABLE dbo.Horse_Assignment WITH CHECK ADD CONSTRAINT CK_HorseAssignment_Status CHECK(status IN (''ASSIGNED'',''ACCEPTED'',''DECLINED'',''COMPLETED'',''REASSIGNED'',''CANCELLED''));
ALTER TABLE dbo.Medical_Clinical_Exam WITH CHECK ADD CONSTRAINT CK_ClinicalExam_GroupCondition CHECK(condition_status IN (''NORMAL'',''ABNORMAL''));
ALTER TABLE dbo.Medical_Record WITH CHECK ADD CONSTRAINT CK_Medical_GroupConclusion CHECK(final_conclusion IS NULL OR final_conclusion IN (''FIT'',''FIT_WITH_MONITORING'',''NOT_FIT''));
ALTER TABLE dbo.Medical_Record WITH CHECK ADD CONSTRAINT CK_Medical_GroupStatus CHECK(status IN (''DRAFT'',''CONFIRMED'',''CANCELLED''));
ALTER TABLE dbo.Medical_Vital_Sign WITH CHECK ADD CONSTRAINT CK_MedicalVitalSign_GroupWeight CHECK(weight IS NULL OR weight>0);
-- No manually requested schema reset; retain all mapped business records and relationships.
DECLARE @horseNext bigint=(SELECT COALESCE(MAX(TRY_CONVERT(bigint,SUBSTRING(horse_id,5,20))),0)+1 FROM dbo.Horse WHERE horse_id LIKE ''HOR-%'');
IF @horseNext>999 SET @horseNext=999;
IF OBJECT_ID(''dbo.Horse_Id_Sequence'',''SO'') IS NULL
BEGIN
 SET @sql=N''CREATE SEQUENCE dbo.Horse_Id_Sequence AS bigint START WITH ''+CONVERT(nvarchar(20),@horseNext)+N'' INCREMENT BY 1 MINVALUE 1 MAXVALUE 999 NO CYCLE;'';EXEC sp_executesql @sql;
END;
ENABLE TRIGGER dbo.TR_TrainingPlan_FixedRegisteredPackage ON dbo.Training_Plan;
EXEC sys.sp_addextendedproperty @name=N''RaceForge_GroupSchema_V10'',@value=N''APPLIED'';
COMMIT TRANSACTION;
-- Deployment log only: retain ID translations for dependent clients without exporting account data.
SELECT ''Trainer'' AS entity,old_id,CONVERT(varchar(20),new_id) AS new_id FROM #TrainerMap
UNION ALL SELECT ''Horse_Assignment'',old_id,CONVERT(varchar(20),new_id) FROM #AssignmentMap
UNION ALL SELECT ''Health_Profile'',old_id,CONVERT(varchar(20),new_id) FROM #HealthMap;
';
GO

-- ===== V11__isolate_training_extensions.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY' OR mode='UPDATE_V10')
 EXEC sys.sp_executesql N'-- Restore the shared tables to the team''s columns; put Training extensions in its own tables.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N''RaceForge_TrainingIsolation_V11'') RETURN;
BEGIN TRANSACTION;
CREATE TABLE dbo.Training_Assignment(
 assignment_id int NOT NULL CONSTRAINT PK_Training_Assignment PRIMARY KEY,
 horse_package_id varchar(20) NOT NULL,
 ended_at datetime2(7) NULL,
 CONSTRAINT UQ_TrainingAssignment_Package UNIQUE(assignment_id,horse_package_id),
 CONSTRAINT FK_TrainingAssignment_Request FOREIGN KEY(assignment_id) REFERENCES dbo.Horse_Assignment(id),
 CONSTRAINT FK_TrainingAssignment_Package FOREIGN KEY(horse_package_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id)
);
INSERT dbo.Training_Assignment(assignment_id,horse_package_id,ended_at)
 SELECT id,horse_package_id,ended_at FROM dbo.Horse_Assignment WHERE kind=''TRAINER'';
-- Retarget only Training-owned FKs that used the extension on the shared table.
DECLARE @sql nvarchar(max)=N'''';
DECLARE @restore TABLE(ddl nvarchar(max));
INSERT @restore SELECT N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N'' WITH CHECK ADD CONSTRAINT ''+QUOTENAME(f.name)+N'' FOREIGN KEY (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.parent_object_id,fc.parent_column_id))),N'','') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N'') REFERENCES dbo.Training_Assignment (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(CASE COL_NAME(fc.referenced_object_id,fc.referenced_column_id) WHEN ''id'' THEN ''assignment_id'' ELSE COL_NAME(fc.referenced_object_id,fc.referenced_column_id) END)),N'','') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N'');''
 FROM sys.foreign_keys f WHERE f.referenced_object_id=OBJECT_ID(''dbo.Horse_Assignment'') AND f.parent_object_id IN (OBJECT_ID(''dbo.Training_Plan''),OBJECT_ID(''dbo.Training_Recommendation''));
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(f.name)+N'';'' FROM sys.foreign_keys f WHERE f.referenced_object_id=OBJECT_ID(''dbo.Horse_Assignment'') AND f.parent_object_id IN (OBJECT_ID(''dbo.Training_Plan''),OBJECT_ID(''dbo.Training_Recommendation''));
EXEC sp_executesql @sql;
DECLARE refs CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM @restore;
OPEN refs;FETCH NEXT FROM refs INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM refs INTO @sql;END;
CLOSE refs;DEALLOCATE refs;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT FK_HorseAssignment_PackageHorse;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT CK_HorseAssignment_KindPackage;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT UQ_HorseAssignment_Package;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT CK_HorseAssignment_Status;
ALTER TABLE dbo.Horse_Assignment DROP COLUMN horse_package_id,ended_at;
CREATE TABLE dbo.Training_Medical_Context(
 medical_record_id varchar(20) NOT NULL CONSTRAINT PK_Training_Medical_Context PRIMARY KEY,
 ideal_weight decimal(8,2) NULL,
 body_condition_score int NULL,
 CONSTRAINT FK_TrainingMedicalContext_Record FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id),
 CONSTRAINT CK_TrainingMedicalContext_Values CHECK((ideal_weight IS NULL OR ideal_weight>0) AND (body_condition_score IS NULL OR body_condition_score BETWEEN 1 AND 9))
);
INSERT dbo.Training_Medical_Context(medical_record_id,ideal_weight,body_condition_score)
 SELECT medical_record_id,ideal_weight,body_condition_score FROM dbo.Medical_Record WHERE ideal_weight IS NOT NULL OR body_condition_score IS NOT NULL;
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.Medical_Record DROP CONSTRAINT ''+QUOTENAME(name)+N'';'' FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(''dbo.Medical_Record'') AND (definition LIKE ''%ideal_weight%'' OR definition LIKE ''%body_condition_score%'');
EXEC sp_executesql @sql;
ALTER TABLE dbo.Medical_Record DROP COLUMN ideal_weight,body_condition_score;
-- Enforce the link on our table, without adding columns/constraints/triggers to the team''s request table.
EXEC(N''CREATE OR ALTER TRIGGER dbo.TR_TrainingAssignment_Request
ON dbo.Training_Assignment AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Horse_Assignment a ON a.id=i.assignment_id JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=i.horse_package_id WHERE a.kind<>''''TRAINER'''' OR a.horse_id<>hp.horse_id)
  THROW 51040,''''Training assignment must reference a TRAINER request for the same package horse.'''',1;
END'');
EXEC sys.sp_addextendedproperty @name=N''RaceForge_TrainingIsolation_V11'',@value=N''APPLIED'';
COMMIT TRANSACTION;
';
GO

-- ===== V12__all_business_ids_string.sql =====
IF EXISTS(SELECT 1 FROM #DeliveryMode WHERE mode='EMPTY' OR mode='UPDATE_V10')
 EXEC sys.sp_executesql N'-- V12: all remaining business identity keys become immutable PREFIX-001..999 strings.
-- Applies after V11 in this project''s migration chain; not a patch for an arbitrary legacy database.
SET XACT_ABORT ON; SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N''RaceForge_AllString_V12'') RETURN;
BEGIN TRANSACTION;
CREATE TABLE #Roots(table_name sysname,column_name sysname,prefix varchar(16));
INSERT #Roots VALUES(''Trainer'',''trainer_id'',''HTR-''),(''Horse_Assignment'',''id'',''ASN-''),(''Health_Profile'',''profile_id'',''HLT-'');
CREATE TABLE #IdColumns(object_id int,column_id int,table_name sysname,column_name sysname,prefix varchar(16),is_root bit,is_nullable bit,PRIMARY KEY(object_id,column_id));
INSERT #IdColumns SELECT t.object_id,c.column_id,t.name,c.name,r.prefix,1,c.is_nullable FROM #Roots r JOIN sys.tables t ON t.name=r.table_name AND t.schema_id=SCHEMA_ID(''dbo'') JOIN sys.columns c ON c.object_id=t.object_id AND c.name=r.column_name;
IF (SELECT COUNT(*) FROM #IdColumns)<>3 THROW 51050,''Expected three numeric business ID roots after V11.'',1;
DECLARE @added int=1;
WHILE @added>0
BEGIN
 INSERT #IdColumns SELECT DISTINCT fc.parent_object_id,fc.parent_column_id,OBJECT_NAME(fc.parent_object_id),COL_NAME(fc.parent_object_id,fc.parent_column_id),x.prefix,0,c.is_nullable
 FROM sys.foreign_key_columns fc JOIN #IdColumns x ON x.object_id=fc.referenced_object_id AND x.column_id=fc.referenced_column_id
 JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id
 WHERE NOT EXISTS(SELECT 1 FROM #IdColumns seen WHERE seen.object_id=fc.parent_object_id AND seen.column_id=fc.parent_column_id);
 SET @added=@@ROWCOUNT;
END;
DECLARE @guard nvarchar(max)=N'''';
SELECT @guard=@guard+N''IF EXISTS(SELECT 1 FROM dbo.''+QUOTENAME(table_name)+N'' WHERE ''+QUOTENAME(column_name)+N'' IS NOT NULL AND (TRY_CONVERT(int,''+QUOTENAME(column_name)+N'') IS NULL OR TRY_CONVERT(int,''+QUOTENAME(column_name)+N'') NOT BETWEEN 1 AND 999)) THROW 51051,''''An ID is outside 001..999; migration will not truncate or wrap.'''',1;'' FROM #IdColumns;
EXEC sp_executesql @guard;
DECLARE @EnabledTriggers TABLE(ddl nvarchar(max),restore_ddl nvarchar(max));
INSERT @EnabledTriggers SELECT N''DISABLE TRIGGER ''+QUOTENAME(OBJECT_SCHEMA_NAME(tr.object_id))+N''.''+QUOTENAME(tr.name)+N'' ON dbo.''+QUOTENAME(OBJECT_NAME(tr.parent_id))+N'';'',N''ENABLE TRIGGER ''+QUOTENAME(OBJECT_SCHEMA_NAME(tr.object_id))+N''.''+QUOTENAME(tr.name)+N'' ON dbo.''+QUOTENAME(OBJECT_NAME(tr.parent_id))+N'';'' FROM sys.triggers tr WHERE tr.is_disabled=0 AND tr.parent_class=1 AND OBJECT_SCHEMA_NAME(tr.parent_id)=''dbo'';
DECLARE @triggerSql nvarchar(max)=N'''';SELECT @triggerSql=@triggerSql+ddl FROM @EnabledTriggers;EXEC sp_executesql @triggerSql;
-- Capture constraints before replacing key types. Recreate with WITH CHECK, never disable trust.
CREATE TABLE #FK (ddl nvarchar(max));
INSERT #FK SELECT N''ALTER TABLE ''+QUOTENAME(OBJECT_SCHEMA_NAME(f.parent_object_id))+N''.''+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N'' WITH CHECK ADD CONSTRAINT ''+QUOTENAME(f.name)+N'' FOREIGN KEY (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.parent_object_id,fc.parent_column_id))),N'','') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N'') REFERENCES ''+QUOTENAME(OBJECT_SCHEMA_NAME(f.referenced_object_id))+N''.''+QUOTENAME(OBJECT_NAME(f.referenced_object_id))+N'' (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.referenced_object_id,fc.referenced_column_id))),N'','') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N'')''+
 CASE f.delete_referential_action WHEN 1 THEN N'' ON DELETE CASCADE'' WHEN 2 THEN N'' ON DELETE SET NULL'' WHEN 3 THEN N'' ON DELETE SET DEFAULT'' ELSE N'''' END+
 CASE f.update_referential_action WHEN 1 THEN N'' ON UPDATE CASCADE'' WHEN 2 THEN N'' ON UPDATE SET NULL'' WHEN 3 THEN N'' ON UPDATE SET DEFAULT'' ELSE N'''' END+N'';''
 FROM sys.foreign_keys f WHERE OBJECT_SCHEMA_NAME(f.parent_object_id)=''dbo'' AND OBJECT_NAME(f.parent_object_id) NOT IN (''Trainer_Profile'',''Trainer_Assignment'');
UPDATE #FK SET ddl=REPLACE(ddl,N''REFERENCES [dbo].[Trainer_Assignment] ([assignment_id]'',N''REFERENCES [dbo].[Horse_Assignment] ([id]'');

CREATE TABLE #Keys(ddl nvarchar(max));
INSERT #Keys SELECT N''ALTER TABLE dbo.''+QUOTENAME(t.name)+N'' ADD CONSTRAINT ''+QUOTENAME(k.name)+CASE k.type WHEN ''PK'' THEN N'' PRIMARY KEY '' ELSE N'' UNIQUE '' END+CASE i.type WHEN 1 THEN N''CLUSTERED '' ELSE N''NONCLUSTERED '' END+N'' (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)+CASE ic.is_descending_key WHEN 1 THEN N'' DESC'' ELSE N'' ASC'' END),N'','') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)+N'');''
 FROM sys.key_constraints k JOIN sys.tables t ON t.object_id=k.parent_object_id JOIN sys.indexes i ON i.object_id=t.object_id AND i.index_id=k.unique_index_id
 WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'' AND t.name NOT IN (''Trainer_Profile'',''Trainer_Assignment'');
CREATE TABLE #Checks(ddl nvarchar(max));
INSERT #Checks SELECT N''ALTER TABLE dbo.''+QUOTENAME(t.name)+N'' WITH CHECK ADD CONSTRAINT ''+QUOTENAME(c.name)+N'' CHECK ''+c.definition+N'';''
 FROM sys.check_constraints c JOIN sys.tables t ON t.object_id=c.parent_object_id
 WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT IN (''Trainer_Profile'',''Trainer_Assignment'')
 AND NOT(t.name=''Horse'' AND (c.definition LIKE ''%admission_status%'' OR c.definition LIKE ''%dam_sire%'' OR c.definition LIKE ''%background%'' OR c.definition LIKE ''%weight%''))
 AND NOT(t.name=''Medical_Record'' AND (c.definition LIKE ''%measured_weight%'' OR c.definition LIKE ''%fitness_conclusion%''))
 AND NOT(t.name=''Medical_Clinical_Exam'' AND (c.definition LIKE ''%severity%'' OR c.definition LIKE ''%abnormality_type%''));
CREATE TABLE #Indexes(ddl nvarchar(max));
INSERT #Indexes SELECT N''CREATE ''+CASE i.is_unique WHEN 1 THEN N''UNIQUE '' ELSE N'''' END+N''NONCLUSTERED INDEX ''+QUOTENAME(i.name)+N'' ON dbo.''+QUOTENAME(t.name)+N'' (''+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)+CASE ic.is_descending_key WHEN 1 THEN N'' DESC'' ELSE N'' ASC'' END),N'','') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)+N'')''+
 CASE WHEN EXISTS(SELECT 1 FROM sys.index_columns ic WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1) THEN N'' INCLUDE (''+(SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)),N'','') WITHIN GROUP(ORDER BY ic.index_column_id) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1)+N'')'' ELSE N'''' END+
 CASE i.has_filter WHEN 1 THEN N'' WHERE ''+i.filter_definition ELSE N'''' END+N'';''
 FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'' AND t.name NOT IN (''Trainer_Profile'',''Trainer_Assignment'') AND i.type=2 AND i.is_primary_key=0 AND i.is_unique_constraint=0;

DECLARE @sql nvarchar(max)=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(name)+N'';'' FROM sys.foreign_keys WHERE OBJECT_SCHEMA_NAME(parent_object_id)=''dbo'';
EXEC sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''DROP INDEX ''+QUOTENAME(i.name)+N'' ON dbo.''+QUOTENAME(t.name)+N'';'' FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'' AND i.type=2 AND i.is_primary_key=0 AND i.is_unique_constraint=0;
EXEC sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(t.name)+N'' DROP CONSTRAINT ''+QUOTENAME(k.name)+N'';'' FROM sys.key_constraints k JOIN sys.tables t ON t.object_id=k.parent_object_id WHERE t.schema_id=SCHEMA_ID(''dbo'') AND t.name NOT LIKE ''flyway%'';
EXEC sp_executesql @sql;
SET @sql=N'''';
SELECT @sql=@sql+N''ALTER TABLE dbo.''+QUOTENAME(OBJECT_NAME(parent_object_id))+N'' DROP CONSTRAINT ''+QUOTENAME(name)+N'';'' FROM sys.check_constraints WHERE OBJECT_SCHEMA_NAME(parent_object_id)=''dbo'';
EXEC sp_executesql @sql;


DECLARE @idTable sysname,@idColumn sysname,@prefix varchar(16),@root bit,@null bit;
DECLARE ids CURSOR LOCAL FAST_FORWARD FOR SELECT table_name,column_name,prefix,is_root,is_nullable FROM #IdColumns ORDER BY is_root,table_name,column_name;
OPEN ids;FETCH NEXT FROM ids INTO @idTable,@idColumn,@prefix,@root,@null;
WHILE @@FETCH_STATUS=0
BEGIN
 IF @root=0
 BEGIN
  SET @sql=N''ALTER TABLE dbo.''+QUOTENAME(@idTable)+N'' ALTER COLUMN ''+QUOTENAME(@idColumn)+N'' varchar(20) ''+CASE @null WHEN 1 THEN N''NULL'' ELSE N''NOT NULL'' END+N''; UPDATE dbo.''+QUOTENAME(@idTable)+N'' SET ''+QUOTENAME(@idColumn)+N''=''''''+@prefix+N''''''+RIGHT(''''000''''+CONVERT(varchar(3),TRY_CONVERT(int,''+QUOTENAME(@idColumn)+N'')),3) WHERE ''+QUOTENAME(@idColumn)+N'' IS NOT NULL;'';
  EXEC sp_executesql @sql;
 END
 ELSE
 BEGIN
  SET @sql=N''ALTER TABLE dbo.''+QUOTENAME(@idTable)+N'' ADD __string_id varchar(20) NULL;'';EXEC sp_executesql @sql;
  SET @sql=N''UPDATE dbo.''+QUOTENAME(@idTable)+N'' SET __string_id=''''''+@prefix+N''''''+RIGHT(''''000''''+CONVERT(varchar(3),''+QUOTENAME(@idColumn)+N''),3); ALTER TABLE dbo.''+QUOTENAME(@idTable)+N'' ALTER COLUMN __string_id varchar(20) NOT NULL; ALTER TABLE dbo.''+QUOTENAME(@idTable)+N'' DROP COLUMN ''+QUOTENAME(@idColumn)+N'';'';EXEC sp_executesql @sql;
  DECLARE @objectName nvarchar(300)=N''dbo.''+QUOTENAME(@idTable)+N''.[__string_id]'';
  EXEC sp_rename @objectName,@idColumn,''COLUMN'';
 END;
 FETCH NEXT FROM ids INTO @idTable,@idColumn,@prefix,@root,@null;
END;
CLOSE ids;DEALLOCATE ids;
DECLARE keys_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Keys;
OPEN keys_again;FETCH NEXT FROM keys_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM keys_again INTO @sql;END;
CLOSE keys_again;DEALLOCATE keys_again;
DECLARE indexes_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Indexes;
OPEN indexes_again;FETCH NEXT FROM indexes_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM indexes_again INTO @sql;END;
CLOSE indexes_again;DEALLOCATE indexes_again;
DECLARE fk_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #FK;
OPEN fk_again;FETCH NEXT FROM fk_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM fk_again INTO @sql;END;
CLOSE fk_again;DEALLOCATE fk_again;
DECLARE checks_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Checks;
OPEN checks_again;FETCH NEXT FROM checks_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM checks_again INTO @sql;END;
CLOSE checks_again;DEALLOCATE checks_again;
DECLARE root_counters CURSOR LOCAL FAST_FORWARD FOR SELECT table_name,column_name,prefix FROM #Roots;
OPEN root_counters;FETCH NEXT FROM root_counters INTO @idTable,@idColumn,@prefix;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @sql=N''DECLARE @value int=(SELECT COALESCE(MAX(TRY_CONVERT(int,RIGHT(''+QUOTENAME(@idColumn)+N'',3))),0) FROM dbo.''+QUOTENAME(@idTable)+N''); IF NOT EXISTS(SELECT 1 FROM dbo.Id_Counter WHERE prefix=''''''+@prefix+N'''''') INSERT dbo.Id_Counter(prefix,next_value) VALUES(''''''+@prefix+N'''''',@value); ELSE UPDATE dbo.Id_Counter SET next_value=CASE WHEN next_value<@value THEN @value ELSE next_value END WHERE prefix=''''''+@prefix+N'''''';'';EXEC sp_executesql @sql;
 FETCH NEXT FROM root_counters INTO @idTable,@idColumn,@prefix;
END;
CLOSE root_counters;DEALLOCATE root_counters;
SET @triggerSql=N'''';SELECT @triggerSql=@triggerSql+restore_ddl FROM @EnabledTriggers;EXEC sp_executesql @triggerSql;
EXEC sys.sp_addextendedproperty @name=N''RaceForge_AllString_V12'',@value=N''APPLIED'';
COMMIT TRANSACTION;
';
GO
DROP TABLE #DeliveryMode;
GO
