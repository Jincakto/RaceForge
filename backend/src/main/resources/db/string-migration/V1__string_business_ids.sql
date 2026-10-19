SET QUOTED_IDENTIFIER ON;
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
 [admission_status] varchar(20) NOT NULL DEFAULT ('NOT_SUBMITTED'),
 [admission_note] nvarchar(500) NULL,
 CONSTRAINT [PK_Horse] PRIMARY KEY ([horse_id]),
 CONSTRAINT [CK_Horse_Admission] CHECK ([admission_status]='REJECTED' OR [admission_status]='APPROVED' OR [admission_status]='PENDING' OR [admission_status]='NOT_SUBMITTED')
);
CREATE TABLE dbo.[HORSE_PACKAGE] (
 [horse_package_id] varchar(32) NOT NULL,
 [horse_id] varchar(32) NOT NULL,
 [package_id] varchar(32) NOT NULL,
 [registered_at] datetime NOT NULL DEFAULT (getdate()),
 [start_date] date NULL,
 [end_date] date NULL,
 [status] varchar(20) NOT NULL DEFAULT ('PENDING'),
 [total_price] decimal(12,2) NOT NULL,
 [paused_at] datetime NULL,
 [pause_reason] nvarchar(255) NULL,
 [replaced_horse_package_id] varchar(32) NULL,
 [created_at] datetime NOT NULL DEFAULT (getdate()),
 [updated_at] datetime NOT NULL DEFAULT (getdate()),
 [payment_status] varchar(20) NOT NULL DEFAULT ('PENDING'),
 [paid_at] datetime NULL,
 [remaining_days] int NULL,
 CONSTRAINT [PK_HORSE_PACKAGE] PRIMARY KEY ([horse_package_id]),
 CONSTRAINT [CK_HORSE_PACKAGE_DATE] CHECK ([end_date] IS NULL OR [start_date] IS NULL OR [end_date]>=[start_date]),
 CONSTRAINT [CK_HORSE_PACKAGE_PRICE] CHECK ([total_price]>=(0)),
 CONSTRAINT [CK_HORSE_PACKAGE_STATUS] CHECK ([status]='CANCELLED' OR [status]='COMPLETED' OR [status]='PAUSED' OR [status]='ACTIVE' OR [status]='PENDING')
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
 [status] varchar(20) NOT NULL DEFAULT ('DRAFT'),
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
 [status] varchar(20) NOT NULL DEFAULT ('PENDING'),
 [reviewed_by] varchar(32) NULL,
 [reviewed_at] datetime2 NULL,
 [review_note] nvarchar(500) NULL,
 [created_at] datetime2 NOT NULL DEFAULT (sysutcdatetime()),
 CONSTRAINT [PK_Registration_Request] PRIMARY KEY ([request_id]),
 CONSTRAINT [CK_RegistrationRequest_Status] CHECK ([status]='REJECTED' OR [status]='APPROVED' OR [status]='PENDING')
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
 [status] varchar(20) NOT NULL DEFAULT ('ACTIVE'),
 [created_at] datetime NOT NULL DEFAULT (getdate()),
 [updated_at] datetime NOT NULL DEFAULT (getdate()),
 CONSTRAINT [PK_TRAINING_PACKAGE] PRIMARY KEY ([package_id]),
 CONSTRAINT [CK_TRAINING_PACKAGE_DURATION] CHECK ([duration_days]>(0)),
 CONSTRAINT [CK_TRAINING_PACKAGE_PRICE] CHECK ([price]>=(0)),
 CONSTRAINT [CK_TRAINING_PACKAGE_STATUS] CHECK ([status]='INACTIVE' OR [status]='ACTIVE'),
 CONSTRAINT [CK_TRAINING_PACKAGE_TYPE] CHECK ([package_type]='RECOVERY' OR [package_type]='PERFORMANCE' OR [package_type]='RACING' OR [package_type]='BASIC')
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
CREATE UNIQUE INDEX [UX_RegistrationRequest_User_Pending] ON dbo.[Registration_Request]([user_id]) WHERE ([status]='PENDING');
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
 bio nvarchar(1000) NULL,qualifications nvarchar(1000) NULL,status varchar(20) NOT NULL DEFAULT 'ACTIVE',
 created_at datetime2 NOT NULL DEFAULT SYSDATETIME(),CHECK(status IN ('ACTIVE','INACTIVE')));
CREATE TABLE dbo.Trainer_Assignment(
 assignment_id varchar(32) NOT NULL PRIMARY KEY,horse_package_id varchar(32) NOT NULL REFERENCES dbo.HORSE_PACKAGE(horse_package_id),
 trainer_id varchar(32) NOT NULL REFERENCES dbo.Trainer_Profile(trainer_id),assigned_by varchar(32) NOT NULL REFERENCES dbo.[User](user_id),
 status varchar(20) NOT NULL DEFAULT 'PENDING',assigned_at datetime2 NOT NULL DEFAULT SYSDATETIME(),responded_at datetime2 NULL,
 ended_at datetime2 NULL,reason nvarchar(1000) NULL,CHECK(status IN ('PENDING','ACCEPTED','REJECTED','ENDED')));
CREATE UNIQUE INDEX UX_TrainerAssignment_Open ON dbo.Trainer_Assignment(horse_package_id,trainer_id) WHERE status IN ('PENDING','ACCEPTED');
CREATE TABLE dbo.Training_Protocol(
 protocol_id varchar(32) NOT NULL PRIMARY KEY,protocol_name nvarchar(150) NOT NULL,package_type varchar(30) NOT NULL,
 min_weight decimal(8,2) NOT NULL,max_weight decimal(8,2) NOT NULL,stages_json nvarchar(max) NOT NULL,
 sources_json nvarchar(max) NOT NULL,rationale nvarchar(1000) NOT NULL,status varchar(20) NOT NULL,
 created_by varchar(32) NOT NULL REFERENCES dbo.[User](user_id),approved_by varchar(32) NULL REFERENCES dbo.[User](user_id),
 created_at datetime2 NOT NULL DEFAULT SYSDATETIME(),approved_at datetime2 NULL,
 CHECK(min_weight>0 AND max_weight>min_weight),CHECK(ISJSON(stages_json)=1 AND ISJSON(sources_json)=1),
 CHECK(status IN ('DRAFT','APPROVED','RETIRED')));
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
INSERT INTO dbo.Role(role_id,role_name) VALUES ('ROL-000001','CLUB_MANAGER'),('ROL-000002','HEAD_TRAINER'),('ROL-000003','VETERINARIAN'),('ROL-000004','GROOM'),('ROL-000005','HORSE_OWNER'),('ROL-000006','USER'),('ROL-000007','ADMIN');
INSERT INTO dbo.Id_Counter(prefix,next_value) VALUES ('ROL-',7),('USR-',0),('PER-',0),('HRS-',0),('RAC-',0),('PKG-',0),('HPG-',0),('PLN-',0),('SES-',0),('HLT-',0),('MED-',0),('VIT-',0),('CLN-',0),('LCK-',0),('NTF-',0),('AUD-',0),('RFT-',0),('RST-',0),('REQ-',0),('TR',0),('ASN-',0),('STG-',0),('REC-',0),('PRO-',0),('CAR-',0),('NUT-',0),('SUP-',0),('EXT-',0);
