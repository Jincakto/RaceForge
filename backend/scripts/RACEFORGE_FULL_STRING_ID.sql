-- RACEFORGE: FULL INTEGRATED DATABASE - STRING IDS 001..999
-- Includes team Horse/Medical and Training/Permission. Prepared 2026-10-19.
-- Run as normal SQL in SSMS. No SQLCMD mode required.
-- Fresh/empty database only; no existing records are deleted.
-- Prepared from source; not executed or tested against SQL Server.

IF DB_ID('RaceForge') IS NULL
BEGIN
    CREATE DATABASE RaceForge;
END;
GO

USE RaceForge;
GO

-- Prevent the remaining batches from running over an existing schema.
IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped = 0)
    OR EXISTS (SELECT 1 FROM sys.sequences WHERE is_ms_shipped = 0)
BEGIN
    RAISERROR(N'RaceForge already has tables/sequences. Use a new or empty database; existing data was not changed.', 16, 1);
    SET NOEXEC ON;
END;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
GO

-- ============================================================
-- 1. Role
-- ============================================================

CREATE TABLE Role (
    [role_id] VARCHAR(20) NOT NULL,
    [role_name] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK_Role] PRIMARY KEY ([role_id]),
    CONSTRAINT [UQ__Role__783254B10B6F6CDC] UNIQUE ([role_name]),
    CONSTRAINT [CK_Code_Role] CHECK(DATALENGTH([role_id])=7 AND [role_id] COLLATE Latin1_General_100_BIN2 LIKE 'ROL-[0-9][0-9][0-9]' AND [role_id]<>'ROL-000')
);
GO

-- ============================================================
-- 2. Permission
-- ============================================================

CREATE TABLE Permission (
    [permission_id] [VARCHAR](20) NOT NULL,
    [permission_name] [VARCHAR](100) NOT NULL,
    [description] [NVARCHAR](500) NULL,
    CONSTRAINT [PK_Permission] PRIMARY KEY CLUSTERED ([permission_id] ASC),
    CONSTRAINT [UQ__Permissi__81C0F5A2CCA36885] UNIQUE ([permission_name] ASC),
    CONSTRAINT [CK_Code_Permission] CHECK(DATALENGTH([permission_id])=7 AND [permission_id] COLLATE Latin1_General_100_BIN2 LIKE 'PER-[0-9][0-9][0-9]' AND [permission_id]<>'PER-000')
);
GO

-- ============================================================
-- 3. User
-- ============================================================

CREATE TABLE [User] (
    [user_id] VARCHAR(20) NOT NULL,
    [role_id] VARCHAR(20) NOT NULL DEFAULT ('ROL-006'),
    [full_name] NVARCHAR(150) NOT NULL,
    [email] VARCHAR(255) NOT NULL,
    [password] VARCHAR(255) NULL,
    [phone] VARCHAR(20) NULL,
    [status] VARCHAR(20) NOT NULL,
    [email_verified] BIT NOT NULL DEFAULT ((0)),
    [avatar_url] NVARCHAR(500) NULL,
    [requested_role_id] VARCHAR(20) NULL,
    CONSTRAINT [PK_User] PRIMARY KEY ([user_id]),
    CONSTRAINT [UQ__User__AB6E616435708F9A] UNIQUE ([email]),
    CONSTRAINT [FK_User_RequestedRole] FOREIGN KEY ([requested_role_id]) REFERENCES dbo.[Role]([role_id]),
    CONSTRAINT [FK_User_Role] FOREIGN KEY ([role_id]) REFERENCES dbo.[Role]([role_id]),
    CONSTRAINT [CK_Code_User] CHECK(DATALENGTH([user_id])=7 AND [user_id] COLLATE Latin1_General_100_BIN2 LIKE 'USR-[0-9][0-9][0-9]' AND [user_id]<>'USR-000')
);
GO

-- ============================================================
-- 4. Role_Permission
-- ============================================================

CREATE TABLE Role_Permission (
    [role_id] [VARCHAR](20) NOT NULL,
    [permission_id] [VARCHAR](20) NOT NULL,
    CONSTRAINT [PK_Role_Permission] PRIMARY KEY CLUSTERED ([role_id] ASC,[permission_id] ASC),
    CONSTRAINT [FK_RolePermission_Permission] FOREIGN KEY ([permission_id]) REFERENCES [dbo].[Permission] ([permission_id]),
    CONSTRAINT [FK_RolePermission_Role] FOREIGN KEY ([role_id]) REFERENCES [dbo].[Role] ([role_id])
);
GO

-- ============================================================
-- 5. Horse
-- ============================================================

CREATE TABLE Horse (
    [horse_id] VARCHAR(20) NOT NULL,
    [owner_id] VARCHAR(20) NOT NULL,
    [horse_name] NVARCHAR(100) NOT NULL,
    [date_of_birth] DATE NULL,
    [gender] VARCHAR(20) NULL,
    [breed] NVARCHAR(100) NULL,
    [coat_color] NVARCHAR(50) NULL,
    [sire] NVARCHAR(100) NULL,
    [dam] NVARCHAR(100) NULL,
    [height] DECIMAL(6,2) NULL,
    [declared_medical_history] NVARCHAR(1000) NULL,
    [image_url] NVARCHAR(500) NULL,
    [health_status] VARCHAR(30) NULL,
    [training_locked] BIT NOT NULL DEFAULT ((0)),
    [status] VARCHAR(20) NOT NULL,
    [registration_number] VARCHAR(100) NULL,
    [document_type] VARCHAR(50) NULL,
    [document_url] NVARCHAR(500) NULL,
    CONSTRAINT [PK_Horse] PRIMARY KEY ([horse_id]),
    CONSTRAINT [FK_Horse_Owner] FOREIGN KEY ([owner_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_Horse] CHECK(DATALENGTH([horse_id])=7 AND [horse_id] COLLATE Latin1_General_100_BIN2 LIKE 'HOR-[0-9][0-9][0-9]' AND [horse_id]<>'HOR-000')
);
GO

-- ============================================================
-- 6. HORSE_RACE_HISTORY
-- ============================================================

CREATE TABLE HORSE_RACE_HISTORY (
    [race_history_id] VARCHAR(20) NOT NULL,
    [horse_id] VARCHAR(20) NOT NULL,
    [race_name] NVARCHAR(150) NOT NULL,
    [race_date] DATE NULL,
    [distance] INT NULL,
    [finish_position] INT NULL,
    [completion_time] VARCHAR(20) NULL,
    [racecourse] NVARCHAR(150) NULL,
    [jockey_name] NVARCHAR(100) NULL,
    [prize] DECIMAL(15,2) NULL,
    [created_at] DATETIME NOT NULL DEFAULT (getdate()),
    [updated_at] DATETIME NOT NULL DEFAULT (getdate()),
    CONSTRAINT [PK_HORSE_RACE_HISTORY] PRIMARY KEY ([race_history_id]),
    CONSTRAINT [CK_RaceHistory_Distance] CHECK ([distance] IS NULL OR [distance]>(0)),
    CONSTRAINT [CK_RaceHistory_Position] CHECK ([finish_position] IS NULL OR [finish_position]>(0)),
    CONSTRAINT [CK_RaceHistory_Prize] CHECK ([prize] IS NULL OR [prize]>=(0)),
    CONSTRAINT [FK_RaceHistory_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]),
    CONSTRAINT [CK_Code_HORSE_RACE_HISTORY] CHECK(DATALENGTH([race_history_id])=7 AND [race_history_id] COLLATE Latin1_General_100_BIN2 LIKE 'RAC-[0-9][0-9][0-9]' AND [race_history_id]<>'RAC-000')
);
GO

-- ============================================================
-- 7. TRAINING_PACKAGE
-- ============================================================

CREATE TABLE TRAINING_PACKAGE (
    [package_id] [VARCHAR](20) NOT NULL,
    [package_name] [NVARCHAR](100) NOT NULL,
    [package_type] [VARCHAR](30) NOT NULL,
    [description] [NVARCHAR](500) NULL,
    [duration_days] [INT] NOT NULL,
    [price] [DECIMAL](12,2) NOT NULL,
    [status] [VARCHAR](20) NOT NULL CONSTRAINT [DF__TRAINING___statu__2BC97F7C] DEFAULT ('ACTIVE'),
    [created_at] [DATETIME] NOT NULL CONSTRAINT [DF__TRAINING___creat__2CBDA3B5] DEFAULT (getdate()),
    [updated_at] [DATETIME] NOT NULL CONSTRAINT [DF__TRAINING___updat__2DB1C7EE] DEFAULT (getdate()),
    CONSTRAINT [PK_TRAINING_PACKAGE] PRIMARY KEY CLUSTERED ([package_id] ASC),
    CONSTRAINT [CK_TRAINING_PACKAGE_DURATION] CHECK ([duration_days]>(0)),
    CONSTRAINT [CK_TRAINING_PACKAGE_PRICE] CHECK ([price]>=(0)),
    CONSTRAINT [CK_TRAINING_PACKAGE_STATUS] CHECK ([status]='INACTIVE' OR [status]='ACTIVE'),
    CONSTRAINT [CK_TRAINING_PACKAGE_TYPE] CHECK ([package_type]='RECOVERY' OR [package_type]='PERFORMANCE' OR [package_type]='RACING' OR [package_type]='BASIC'),
    CONSTRAINT [CK_Code_TRAINING_PACKAGE] CHECK(DATALENGTH([package_id])=7 AND [package_id] COLLATE Latin1_General_100_BIN2 LIKE 'PKG-[0-9][0-9][0-9]' AND [package_id]<>'PKG-000')
);
GO

-- ============================================================
-- 8. HORSE_PACKAGE
-- ============================================================

CREATE TABLE HORSE_PACKAGE (
    [horse_package_id] [VARCHAR](20) NOT NULL,
    [horse_id] [VARCHAR](20) NOT NULL,
    [package_id] [VARCHAR](20) NOT NULL,
    [registered_at] [DATETIME] NOT NULL CONSTRAINT [DF__HORSE_PAC__regis__756D6ECB] DEFAULT (getdate()),
    [start_date] [DATE] NULL,
    [end_date] [DATE] NULL,
    [status] [VARCHAR](20) NOT NULL CONSTRAINT [DF__HORSE_PAC__statu__76619304] DEFAULT ('PENDING'),
    [total_price] [DECIMAL](12,2) NOT NULL,
    [paused_at] [DATETIME] NULL,
    [pause_reason] [NVARCHAR](255) NULL,
    [replaced_horse_package_id] [VARCHAR](20) NULL,
    [created_at] [DATETIME] NOT NULL CONSTRAINT [DF__HORSE_PAC__creat__7755B73D] DEFAULT (getdate()),
    [updated_at] [DATETIME] NOT NULL CONSTRAINT [DF__HORSE_PAC__updat__7849DB76] DEFAULT (getdate()),
    [payment_status] [VARCHAR](20) NOT NULL CONSTRAINT [DF__HORSE_PAC__payme__793DFFAF] DEFAULT ('PENDING'),
    [remaining_days] [INT] NULL,
    CONSTRAINT [PK_HORSE_PACKAGE] PRIMARY KEY CLUSTERED ([horse_package_id] ASC),
    CONSTRAINT [UQ_HorsePackage_Horse] UNIQUE NONCLUSTERED ([horse_package_id] ASC,[horse_id] ASC),
    CONSTRAINT [CK_HORSE_PACKAGE_DATE] CHECK ([end_date] IS NULL OR [start_date] IS NULL OR [end_date]>=[start_date]),
    CONSTRAINT [CK_HORSE_PACKAGE_PRICE] CHECK ([total_price]>=(0)),
    CONSTRAINT [CK_HORSE_PACKAGE_STATUS] CHECK ([status]='CANCELLED' OR [status]='COMPLETED' OR [status]='PAUSED' OR [status]='ACTIVE' OR [status]='PENDING'),
    CONSTRAINT [FK_HORSE_PACKAGE_HORSE] FOREIGN KEY ([horse_id]) REFERENCES [dbo].[Horse] ([horse_id]),
    CONSTRAINT [FK_HORSE_PACKAGE_PACKAGE] FOREIGN KEY ([package_id]) REFERENCES [dbo].[TRAINING_PACKAGE] ([package_id]),
    CONSTRAINT [FK_HORSE_PACKAGE_REPLACED] FOREIGN KEY ([replaced_horse_package_id]) REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id]),
    CONSTRAINT CK_HORSE_PACKAGE_PAYMENT_STATUS CHECK(payment_status IN ('PENDING','PAID','FAILED')),
    CONSTRAINT CK_HORSE_PACKAGE_REMAINING_DAYS CHECK(remaining_days IS NULL OR remaining_days>=0),
    CONSTRAINT [CK_Code_HORSE_PACKAGE] CHECK(DATALENGTH([horse_package_id])=7 AND [horse_package_id] COLLATE Latin1_General_100_BIN2 LIKE 'HPG-[0-9][0-9][0-9]' AND [horse_package_id]<>'HPG-000')
);
GO

-- ============================================================
-- 9. Health_Profile
-- ============================================================

CREATE TABLE Health_Profile (
    [profile_id] VARCHAR(20) NOT NULL,
    [horse_id] VARCHAR(20) NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT (sysdatetime()),
    [updated_at] DATETIME2 NOT NULL DEFAULT (sysdatetime()),
    CONSTRAINT [PK_Health_Profile] PRIMARY KEY ([profile_id]),
    CONSTRAINT [UQ__Health_P__DE0BA8A3225D94BC] UNIQUE ([horse_id]),
    CONSTRAINT [FK_HealthProfile_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]),
    CONSTRAINT [CK_Code_Health_Profile] CHECK(DATALENGTH([profile_id])=7 AND [profile_id] COLLATE Latin1_General_100_BIN2 LIKE 'HLT-[0-9][0-9][0-9]' AND [profile_id]<>'HLT-000')
);
GO

-- ============================================================
-- 10. Medical_Record
-- ============================================================

CREATE TABLE Medical_Record (
    [medical_record_id] VARCHAR(20) NOT NULL,
    [profile_id] VARCHAR(20) NOT NULL,
    [veterinarian_id] VARCHAR(20) NOT NULL,
    [correction_of_id] VARCHAR(20) NULL,
    [exam_type] VARCHAR(30) NOT NULL,
    [examined_at] DATETIME2 NOT NULL DEFAULT (sysdatetime()),
    [health_status] VARCHAR(30) NULL,
    [diagnosis] NVARCHAR(1000) NULL,
    [treatment] NVARCHAR(1000) NULL,
    [medication] NVARCHAR(1000) NULL,
    [care_recommendation] NVARCHAR(1000) NULL,
    [notes] NVARCHAR(1000) NULL,
    [system_note] NVARCHAR(1000) NULL,
    [training_note] NVARCHAR(1000) NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT ('DRAFT'),
    [confirmed_at] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT (sysdatetime()),
    [updated_at] DATETIME2 NOT NULL DEFAULT (sysdatetime()),
    [training_eligible] BIT NULL,
    [eligibility_reason] NVARCHAR(1000) NULL,
    [suggested_conclusion] VARCHAR(30) NULL,
    [final_conclusion] VARCHAR(30) NULL,
    [override_reason] NVARCHAR(1000) NULL,
    [monitoring_note] NVARCHAR(1000) NULL,
    [training_lock_reason] NVARCHAR(1000) NULL,
    CONSTRAINT [PK_Medical_Record] PRIMARY KEY ([medical_record_id]),
    CONSTRAINT [FK_MedicalRecord_Correction] FOREIGN KEY ([correction_of_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]),
    CONSTRAINT [FK_MedicalRecord_Profile] FOREIGN KEY ([profile_id]) REFERENCES dbo.[Health_Profile]([profile_id]),
    CONSTRAINT [FK_MedicalRecord_Veterinarian] FOREIGN KEY ([veterinarian_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT CK_Medical_GroupConclusion CHECK(final_conclusion IS NULL OR final_conclusion IN ('FIT','FIT_WITH_MONITORING','NOT_FIT')),
    CONSTRAINT CK_Medical_GroupStatus CHECK(status IN ('DRAFT','CONFIRMED','CANCELLED')),
    CONSTRAINT [CK_Code_Medical_Record] CHECK(DATALENGTH([medical_record_id])=7 AND [medical_record_id] COLLATE Latin1_General_100_BIN2 LIKE 'MED-[0-9][0-9][0-9]' AND [medical_record_id]<>'MED-000')
);
GO

-- ============================================================
-- 11. Medical_Vital_Sign
-- ============================================================

CREATE TABLE Medical_Vital_Sign (
    [vital_sign_id] VARCHAR(20) NOT NULL,
    [medical_record_id] VARCHAR(20) NOT NULL,
    [body_temperature] DECIMAL(4,1) NULL,
    [resting_heart_rate] INT NULL,
    [resting_respiratory_rate] INT NULL,
    [weight] DECIMAL(7,2) NULL,
    CONSTRAINT [PK_Medical_Vital_Sign] PRIMARY KEY ([vital_sign_id]),
    CONSTRAINT [UQ__Medical___05C4C30BC5C7B0E4] UNIQUE ([medical_record_id]),
    CONSTRAINT [FK_MedicalVitalSign_Record] FOREIGN KEY ([medical_record_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]),
    CONSTRAINT CK_MedicalVitalSign_GroupWeight CHECK(weight IS NULL OR weight>0),
    CONSTRAINT [CK_Code_Medical_Vital_Sign] CHECK(DATALENGTH([vital_sign_id])=7 AND [vital_sign_id] COLLATE Latin1_General_100_BIN2 LIKE 'VIT-[0-9][0-9][0-9]' AND [vital_sign_id]<>'VIT-000')
);
GO

-- ============================================================
-- 12. Medical_Clinical_Exam
-- ============================================================

CREATE TABLE Medical_Clinical_Exam (
    [clinical_exam_id] VARCHAR(20) NOT NULL,
    [medical_record_id] VARCHAR(20) NOT NULL,
    [examination_area] VARCHAR(50) NOT NULL,
    [condition_status] VARCHAR(20) NOT NULL,
    [notes] NVARCHAR(500) NULL,
    CONSTRAINT [PK_Medical_Clinical_Exam] PRIMARY KEY ([clinical_exam_id]),
    CONSTRAINT [FK_MedicalClinicalExam_Record] FOREIGN KEY ([medical_record_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]),
    CONSTRAINT CK_ClinicalExam_GroupCondition CHECK(condition_status IN ('NORMAL','ABNORMAL')),
    CONSTRAINT [CK_Code_Medical_Clinical_Exam] CHECK(DATALENGTH([clinical_exam_id])=7 AND [clinical_exam_id] COLLATE Latin1_General_100_BIN2 LIKE 'CLN-[0-9][0-9][0-9]' AND [clinical_exam_id]<>'CLN-000')
);
GO

-- ============================================================
-- 13. Horse_Admission
-- ============================================================

CREATE TABLE Horse_Admission (
    horse_id VARCHAR(20) NOT NULL CONSTRAINT PK_Horse_Admission PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    medical_record_id VARCHAR(20) NULL,
    decision_by VARCHAR(20) NULL,
    decision_reason NVARCHAR(1000) NULL,
    decided_at DATETIME2(7) NULL,
    created_at DATETIME2(7) NOT NULL,
    CONSTRAINT FK_TeamAdmission_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
    CONSTRAINT FK_TeamAdmission_Medical FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id),
    CONSTRAINT FK_TeamAdmission_DecisionUser FOREIGN KEY(decision_by) REFERENCES dbo.[User](user_id)
);
GO

-- ============================================================
-- 14. Horse_Assignment
-- ============================================================

CREATE TABLE Horse_Assignment (
    id VARCHAR(20) NOT NULL CONSTRAINT PK_Horse_Assignment PRIMARY KEY,
    horse_id VARCHAR(20) NOT NULL,
    kind VARCHAR(10) NOT NULL,
    assigned_by VARCHAR(20) NOT NULL,
    assignee_id VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason NVARCHAR(1000) NULL,
    created_at DATETIME2(7) NOT NULL,
    responded_at DATETIME2(7) NULL,
    medical_record_id VARCHAR(20) NULL,
    CONSTRAINT FK_TeamAssignment_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
    CONSTRAINT FK_TeamAssignment_AssignedBy FOREIGN KEY(assigned_by) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_TeamAssignment_Assignee FOREIGN KEY(assignee_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_TeamAssignment_Medical FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id),
    CONSTRAINT [CK_Code_Horse_Assignment] CHECK(DATALENGTH([id])=7 AND [id] COLLATE Latin1_General_100_BIN2 LIKE 'ASN-[0-9][0-9][0-9]' AND [id]<>'ASN-000')
);
GO

-- ============================================================
-- 15. Trainer
-- ============================================================

CREATE TABLE Trainer (
    trainer_id VARCHAR(20) NOT NULL CONSTRAINT PK_Trainer PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL CONSTRAINT UQ_Trainer_User UNIQUE,
    CONSTRAINT FK_Trainer_User FOREIGN KEY(user_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT [CK_Code_Trainer] CHECK(DATALENGTH([trainer_id])=7 AND [trainer_id] COLLATE Latin1_General_100_BIN2 LIKE 'HTR-[0-9][0-9][0-9]' AND [trainer_id]<>'HTR-000')
);
GO

-- ============================================================
-- 16. Horse_Trainer
-- ============================================================

CREATE TABLE Horse_Trainer (
    horse_id VARCHAR(20) NOT NULL,
    trainer_id VARCHAR(20) NOT NULL,
    CONSTRAINT PK_Horse_Trainer PRIMARY KEY(horse_id,trainer_id),
    CONSTRAINT FK_HorseTrainer_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
    CONSTRAINT FK_HorseTrainer_Trainer FOREIGN KEY(trainer_id) REFERENCES dbo.Trainer(trainer_id)
);
GO

-- ============================================================
-- 17. Trainer_Detail
-- ============================================================

CREATE TABLE Trainer_Detail (
    [trainer_id] [VARCHAR](20) NOT NULL,
    [bio] [NVARCHAR](1000) NULL,
    [qualifications] [NVARCHAR](1000) NULL,
    [status] [VARCHAR](20) NOT NULL CONSTRAINT [DF__Trainer_D__statu__664B26CC] DEFAULT ('ACTIVE'),
    [created_at] [DATETIME2](7) NOT NULL CONSTRAINT [DF__Trainer_D__creat__673F4B05] DEFAULT (sysdatetime()),
    CONSTRAINT [PK_Trainer_Detail] PRIMARY KEY CLUSTERED ([trainer_id] ASC),
    CONSTRAINT [FK_TrainerDetail_Trainer] FOREIGN KEY ([trainer_id]) REFERENCES [dbo].[Trainer] ([trainer_id])
);
GO

-- ============================================================
-- 18. Account_Role_Profile
-- ============================================================

CREATE TABLE Account_Role_Profile (
    profile_id VARCHAR(20) NOT NULL CONSTRAINT PK_AccountRoleProfile PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    CONSTRAINT UQ_AccountRoleProfile_UserRole UNIQUE(user_id,role_name),
    CONSTRAINT FK_AccountRoleProfile_User FOREIGN KEY(user_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_AccountRoleProfile_Role FOREIGN KEY(role_name) REFERENCES dbo.Role(role_name),
    CONSTRAINT CK_AccountRoleProfile_Code CHECK (
    (role_name='HORSE_OWNER' AND profile_id LIKE 'OWN-[0-9][0-9][0-9]' AND profile_id<>'OWN-000')
    OR (role_name='VETERINARIAN' AND profile_id LIKE 'VET-[0-9][0-9][0-9]' AND profile_id<>'VET-000')
    OR (role_name='CLUB_MANAGER' AND profile_id LIKE 'CM-[0-9][0-9][0-9]' AND profile_id<>'CM-000')
    )
);
GO

-- ============================================================
-- 19. Training_Assignment
-- ============================================================

CREATE TABLE Training_Assignment (
    assignment_id VARCHAR(20) NOT NULL PRIMARY KEY,
    horse_package_id VARCHAR(20) NOT NULL,
    ended_at DATETIME2(7) NULL,
    CONSTRAINT UQ_TrainingAssignment_Package UNIQUE(assignment_id,horse_package_id),
    CONSTRAINT FK_TrainingAssignment_Request FOREIGN KEY(assignment_id) REFERENCES dbo.Horse_Assignment(id),
    CONSTRAINT FK_TrainingAssignment_Package FOREIGN KEY(horse_package_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id)
);
GO

-- ============================================================
-- 20. Training_Medical_Context
-- ============================================================

CREATE TABLE Training_Medical_Context (
    medical_record_id VARCHAR(20) NOT NULL PRIMARY KEY,
    ideal_weight DECIMAL(8,2) NULL,
    body_condition_score INT NULL,
    CONSTRAINT FK_TrainingMedicalContext_Record FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id),
    CONSTRAINT CK_TrainingMedicalContext_Values CHECK((ideal_weight IS NULL OR ideal_weight>0) AND (body_condition_score IS NULL OR body_condition_score BETWEEN 1 AND 9))
);
GO

-- ============================================================
-- 21. Training_Protocol
-- ============================================================

CREATE TABLE Training_Protocol (
    [protocol_id] [VARCHAR](20) NOT NULL,
    [protocol_name] [NVARCHAR](150) NOT NULL,
    [package_type] [VARCHAR](30) NOT NULL,
    [min_weight] [DECIMAL](8,2) NOT NULL,
    [max_weight] [DECIMAL](8,2) NOT NULL,
    [stages_json] [NVARCHAR](MAX) NOT NULL,
    [sources_json] [NVARCHAR](MAX) NOT NULL,
    [rationale] [NVARCHAR](1000) NOT NULL,
    [status] [VARCHAR](20) NOT NULL,
    [created_by] [VARCHAR](20) NOT NULL,
    [approved_by] [VARCHAR](20) NULL,
    [created_at] [DATETIME2](7) NOT NULL CONSTRAINT [DF__Training___creat__7814D14C] DEFAULT (sysdatetime()),
    [approved_at] [DATETIME2](7) NULL,
    CONSTRAINT [PK__Training__F98375A971AC69B7] PRIMARY KEY CLUSTERED ([protocol_id] ASC),
    CONSTRAINT [CK__Training_Protoco__7908F585] CHECK ([min_weight]>(0) AND [max_weight]>[min_weight]),
    CONSTRAINT [CK__Training_Protoco__79FD19BE] CHECK (isjson([stages_json])=(1) AND isjson([sources_json])=(1)),
    CONSTRAINT [CK__Training___statu__7AF13DF7] CHECK ([status]='RETIRED' OR [status]='APPROVED' OR [status]='DRAFT'),
    CONSTRAINT [FK__Training___appro__7720AD13] FOREIGN KEY ([approved_by]) REFERENCES [dbo].[User] ([user_id]),
    CONSTRAINT [FK__Training___creat__762C88DA] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User] ([user_id]),
    CONSTRAINT [CK_Code_Training_Protocol] CHECK(DATALENGTH([protocol_id])=7 AND [protocol_id] COLLATE Latin1_General_100_BIN2 LIKE 'PRO-[0-9][0-9][0-9]' AND [protocol_id]<>'PRO-000')
);
GO

-- ============================================================
-- 22. Training_Recommendation
-- ============================================================

CREATE TABLE Training_Recommendation (
    [recommendation_id] [VARCHAR](20) NOT NULL,
    [horse_package_id] [VARCHAR](20) NOT NULL,
    [assignment_id] [VARCHAR](20) NOT NULL,
    [medical_record_id] [VARCHAR](20) NOT NULL,
    [protocol_id] [VARCHAR](20) NOT NULL,
    [generated_by] [VARCHAR](20) NOT NULL,
    [snapshot_json] [NVARCHAR](MAX) NOT NULL,
    [created_at] [DATETIME2](7) NOT NULL CONSTRAINT [DF__Training___creat__02925FBF] DEFAULT (sysdatetime()),
    CONSTRAINT [PK__Training__BCB11F4F8869FE5F] PRIMARY KEY CLUSTERED ([recommendation_id] ASC),
    CONSTRAINT [UQ_Recommendation_Package] UNIQUE NONCLUSTERED ([recommendation_id] ASC,[horse_package_id] ASC),
    CONSTRAINT [CK__Training___snaps__038683F8] CHECK (isjson([snapshot_json])=(1)),
    CONSTRAINT [FK__Training___assig__7EC1CEDB] FOREIGN KEY ([assignment_id]) REFERENCES [dbo].[Training_Assignment] ([assignment_id]),
    CONSTRAINT [FK__Training___gener__019E3B86] FOREIGN KEY ([generated_by]) REFERENCES [dbo].[User] ([user_id]),
    CONSTRAINT [FK__Training___horse__7DCDAAA2] FOREIGN KEY ([horse_package_id]) REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id]),
    CONSTRAINT [FK__Training___medic__7FB5F314] FOREIGN KEY ([medical_record_id]) REFERENCES [dbo].[Medical_Record] ([medical_record_id]),
    CONSTRAINT [FK__Training___proto__00AA174D] FOREIGN KEY ([protocol_id]) REFERENCES [dbo].[Training_Protocol] ([protocol_id]),
    CONSTRAINT [FK_Recommendation_AssignmentPackage] FOREIGN KEY ([assignment_id],[horse_package_id]) REFERENCES [dbo].[Training_Assignment] ([assignment_id],[horse_package_id]),
    CONSTRAINT [CK_Code_Training_Recommendation] CHECK(DATALENGTH([recommendation_id])=7 AND [recommendation_id] COLLATE Latin1_General_100_BIN2 LIKE 'REC-[0-9][0-9][0-9]' AND [recommendation_id]<>'REC-000')
);
GO

-- ============================================================
-- 23. Training_Plan
-- ============================================================

CREATE TABLE Training_Plan (
    [plan_id] [VARCHAR](20) NOT NULL,
    [created_by] [VARCHAR](20) NOT NULL,
    [plan_name] [NVARCHAR](150) NOT NULL,
    [goal] [NVARCHAR](500) NULL,
    [duration] [INT] NULL,
    [status] [VARCHAR](20) NOT NULL,
    [notes] [NVARCHAR](1000) NULL,
    [horse_package_id] [VARCHAR](20) NOT NULL,
    [trainer_assignment_id] [VARCHAR](20) NOT NULL,
    [recommendation_id] [VARCHAR](20) NULL,
    [horse_id] [VARCHAR](20) NOT NULL,
    [package_type] [VARCHAR](30) NULL,
    [roadmap_version] [VARCHAR](50) NULL,
    CONSTRAINT [PK_Training_Plan] PRIMARY KEY CLUSTERED ([plan_id] ASC),
    CONSTRAINT [UQ_TrainingPlan_Horse] UNIQUE NONCLUSTERED ([plan_id] ASC,[horse_id] ASC),
    CONSTRAINT [CK_TrainingPlan_PackageType] CHECK ([package_type] IS NULL OR ([package_type]='RECOVERY' OR [package_type]='PERFORMANCE' OR [package_type]='RACING' OR [package_type]='BASIC')),
    CONSTRAINT [FK_Plan_AssignmentPackage] FOREIGN KEY ([trainer_assignment_id],[horse_package_id]) REFERENCES [dbo].[Training_Assignment] ([assignment_id],[horse_package_id]),
    CONSTRAINT [FK_Plan_PackageHorse] FOREIGN KEY ([horse_package_id],[horse_id]) REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id],[horse_id]),
    CONSTRAINT [FK_Plan_RecommendationPackage] FOREIGN KEY ([recommendation_id],[horse_package_id]) REFERENCES [dbo].[Training_Recommendation] ([recommendation_id],[horse_package_id]),
    CONSTRAINT [FK_TrainingPlan_Assignment] FOREIGN KEY ([trainer_assignment_id]) REFERENCES [dbo].[Training_Assignment] ([assignment_id]),
    CONSTRAINT [FK_TrainingPlan_CreatedBy] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User] ([user_id]),
    CONSTRAINT [FK_TrainingPlan_Package] FOREIGN KEY ([horse_package_id]) REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id]),
    CONSTRAINT [FK_TrainingPlan_Recommendation] FOREIGN KEY ([recommendation_id]) REFERENCES [dbo].[Training_Recommendation] ([recommendation_id]),
    CONSTRAINT [CK_Code_Training_Plan] CHECK(DATALENGTH([plan_id])=7 AND [plan_id] COLLATE Latin1_General_100_BIN2 LIKE 'PLN-[0-9][0-9][0-9]' AND [plan_id]<>'PLN-000')
);
GO

-- ============================================================
-- 24. Horse_Plan
-- ============================================================

CREATE TABLE Horse_Plan (
    [plan_id] [VARCHAR](20) NOT NULL,
    [horse_id] [VARCHAR](20) NOT NULL,
    [start_date] [DATE] NULL,
    [end_date] [DATE] NULL,
    [status] [VARCHAR](20) NOT NULL,
    [notes] [NVARCHAR](1000) NULL,
    CONSTRAINT [PK_Horse_Plan] PRIMARY KEY CLUSTERED ([plan_id] ASC,[horse_id] ASC),
    CONSTRAINT [FK_HorsePlan_Horse] FOREIGN KEY ([horse_id]) REFERENCES [dbo].[Horse] ([horse_id]),
    CONSTRAINT [FK_HorsePlan_Plan] FOREIGN KEY ([plan_id]) REFERENCES [dbo].[Training_Plan] ([plan_id]),
    CONSTRAINT [FK_HorsePlan_PlanHorse] FOREIGN KEY ([plan_id],[horse_id]) REFERENCES [dbo].[Training_Plan] ([plan_id],[horse_id])
);
GO

-- ============================================================
-- 25. Training_Stage
-- ============================================================

CREATE TABLE Training_Stage (
    [stage_id] [VARCHAR](20) NOT NULL,
    [plan_id] [VARCHAR](20) NOT NULL,
    [stage_order] [INT] NOT NULL,
    [start_day] [INT] NOT NULL,
    [end_day] [INT] NOT NULL,
    [activity_name] [NVARCHAR](500) NOT NULL,
    [intensity] [VARCHAR](30) NOT NULL,
    [weekdays_json] [NVARCHAR](200) NOT NULL,
    [session_time] [TIME](7) NOT NULL,
    [phase_code] [VARCHAR](50) NULL,
    [title] [NVARCHAR](150) NULL,
    [objective] [NVARCHAR](1000) NULL,
    [session_end_time] [TIME](7) NULL,
    CONSTRAINT [PK__Training__CFC78760CF16D2D2] PRIMARY KEY CLUSTERED ([stage_id] ASC),
    CONSTRAINT [UX_TrainingStage_Order] UNIQUE NONCLUSTERED ([plan_id] ASC,[stage_order] ASC),
    CONSTRAINT [CK__Training_Stage__084B3915] CHECK ([stage_order]>(0) AND [start_day]>(0) AND [end_day]>=[start_day]),
    CONSTRAINT [CK__Training___weekd__093F5D4E] CHECK (isjson([weekdays_json])=(1)),
    CONSTRAINT [CK_TrainingStage_TimeWindow] CHECK ([session_end_time] IS NULL OR [session_end_time]>[session_time]),
    CONSTRAINT [UX_TrainingStage_PlanStage] UNIQUE ([stage_id] ASC,[plan_id] ASC),
    CONSTRAINT [FK__Training___plan___075714DC] FOREIGN KEY ([plan_id]) REFERENCES [dbo].[Training_Plan] ([plan_id]),
    CONSTRAINT [CK_Code_Training_Stage] CHECK(DATALENGTH([stage_id])=7 AND [stage_id] COLLATE Latin1_General_100_BIN2 LIKE 'STG-[0-9][0-9][0-9]' AND [stage_id]<>'STG-000')
);
GO

-- ============================================================
-- 26. Training_Session
-- ============================================================

CREATE TABLE Training_Session (
    [session_id] [VARCHAR](20) NOT NULL,
    [plan_id] [VARCHAR](20) NOT NULL,
    [horse_id] [VARCHAR](20) NOT NULL,
    [scheduled_start] [DATETIME2](7) NOT NULL,
    [scheduled_end] [DATETIME2](7) NULL,
    [distance] [DECIMAL](8,2) NULL,
    [intensity] [VARCHAR](30) NULL,
    [surface] [NVARCHAR](100) NULL,
    [status] [VARCHAR](20) NOT NULL,
    [actual_start] [DATETIME2](7) NULL,
    [actual_end] [DATETIME2](7) NULL,
    [evaluation] [NVARCHAR](1000) NULL,
    [notes] [NVARCHAR](1000) NULL,
    [heart_rate] [INT] NULL,
    [avg_speed] [FLOAT] NULL,
    [max_speed] [FLOAT] NULL,
    [recorded_by] [VARCHAR](20) NULL,
    [training_stage_id] [VARCHAR](20) NULL,
    [resting_heart_rate] [INT] NULL,
    [end_exercise_heart_rate] [INT] NULL,
    [recovery_heart_rate_2_min] [INT] NULL,
    [recovery_measured_at] [DATETIME2](7) NULL,
    [resting_medical_record_id] [VARCHAR](20) NULL,
    [resting_measured_at] [DATETIME2](7) NULL,
    CONSTRAINT [PK_Training_Session] PRIMARY KEY CLUSTERED ([session_id] ASC),
    CONSTRAINT [CK_TrainingSession_PlannedWindow] CHECK ([scheduled_end] IS NULL OR [scheduled_end]>[scheduled_start] AND CONVERT([DATE],[scheduled_end])=CONVERT([DATE],[scheduled_start])),
    CONSTRAINT [CK_TrainingSession_RecoveryResults] CHECK (([resting_heart_rate] IS NULL OR [resting_heart_rate]>(0)) AND ([end_exercise_heart_rate] IS NULL OR [end_exercise_heart_rate]>(0)) AND ([recovery_heart_rate_2_min] IS NULL OR [recovery_heart_rate_2_min]>(0)) AND ([distance] IS NULL OR [distance]>=(0)) AND ([actual_end] IS NULL OR [actual_start] IS NOT NULL AND [actual_end]>[actual_start]) AND ([recovery_measured_at] IS NULL OR [actual_end] IS NOT NULL AND [recovery_measured_at]>=dateadd(minute,(2),[actual_end]))),
    CONSTRAINT [UX_TrainingSession_HorseStart] UNIQUE ([horse_id] ASC,[scheduled_start] ASC),
    CONSTRAINT [FK_TrainingSession_HorsePlan] FOREIGN KEY ([plan_id],[horse_id]) REFERENCES [dbo].[Horse_Plan] ([plan_id],[horse_id]),
    CONSTRAINT [FK_TrainingSession_PlanStage] FOREIGN KEY ([training_stage_id],[plan_id]) REFERENCES [dbo].[Training_Stage] ([stage_id],[plan_id]),
    CONSTRAINT [FK_TrainingSession_RecordedBy] FOREIGN KEY ([recorded_by]) REFERENCES [dbo].[User] ([user_id]),
    CONSTRAINT [FK_TrainingSession_RestingMedical] FOREIGN KEY ([resting_medical_record_id]) REFERENCES [dbo].[Medical_Record] ([medical_record_id]),
    CONSTRAINT [CK_Code_Training_Session] CHECK(DATALENGTH([session_id])=7 AND [session_id] COLLATE Latin1_General_100_BIN2 LIKE 'SES-[0-9][0-9][0-9]' AND [session_id]<>'SES-000')
);
GO

-- ============================================================
-- 27. Training_Lock
-- ============================================================

CREATE TABLE Training_Lock (
    [lock_id] VARCHAR(20) NOT NULL,
    [horse_id] VARCHAR(20) NOT NULL,
    [medical_record_id] VARCHAR(20) NULL,
    [locked_by] VARCHAR(20) NOT NULL,
    [unlocked_by] VARCHAR(20) NULL,
    [locked_at] DATETIME2 NOT NULL,
    [lock_reason] NVARCHAR(1000) NOT NULL,
    [unlocked_at] DATETIME2 NULL,
    [unlock_reason] NVARCHAR(1000) NULL,
    CONSTRAINT [PK_Training_Lock] PRIMARY KEY ([lock_id]),
    CONSTRAINT [FK_TrainingLock_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]),
    CONSTRAINT [FK_TrainingLock_LockedBy] FOREIGN KEY ([locked_by]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [FK_TrainingLock_MedicalRecord] FOREIGN KEY ([medical_record_id]) REFERENCES dbo.[Medical_Record]([medical_record_id]),
    CONSTRAINT [FK_TrainingLock_UnlockedBy] FOREIGN KEY ([unlocked_by]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_Training_Lock] CHECK(DATALENGTH([lock_id])=7 AND [lock_id] COLLATE Latin1_General_100_BIN2 LIKE 'LCK-[0-9][0-9][0-9]' AND [lock_id]<>'LCK-000')
);
GO

-- ============================================================
-- 28. Care_Task
-- ============================================================

CREATE TABLE Care_Task (
    [care_task_id] VARCHAR(20) NOT NULL,
    [horse_id] VARCHAR(20) NOT NULL,
    [assigned_to] VARCHAR(20) NOT NULL,
    [assigned_by] VARCHAR(20) NOT NULL,
    [task_type] NVARCHAR(100) NOT NULL,
    [scheduled_at] DATETIME2 NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [completed_at] DATETIME2 NULL,
    [notes] NVARCHAR(1000) NULL,
    CONSTRAINT [PK_Care_Task] PRIMARY KEY ([care_task_id]),
    CONSTRAINT [FK_CareTask_AssignedBy] FOREIGN KEY ([assigned_by]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [FK_CareTask_AssignedTo] FOREIGN KEY ([assigned_to]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [FK_CareTask_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]),
    CONSTRAINT [CK_Code_Care_Task] CHECK(DATALENGTH([care_task_id])=7 AND [care_task_id] COLLATE Latin1_General_100_BIN2 LIKE 'CAR-[0-9][0-9][0-9]' AND [care_task_id]<>'CAR-000')
);
GO

-- ============================================================
-- 29. Nutrition_Plan
-- ============================================================

CREATE TABLE Nutrition_Plan (
    [nutrition_plan_id] VARCHAR(20) NOT NULL,
    [horse_id] VARCHAR(20) NOT NULL,
    [created_by] VARCHAR(20) NOT NULL,
    [plan_name] NVARCHAR(150) NOT NULL,
    [daily_amount] DECIMAL(10,2) NULL,
    [feeding_frequency] INT NULL,
    [start_date] DATE NULL,
    [end_date] DATE NULL,
    [status] VARCHAR(20) NOT NULL,
    [notes] NVARCHAR(1000) NULL,
    CONSTRAINT [PK_Nutrition_Plan] PRIMARY KEY ([nutrition_plan_id]),
    CONSTRAINT [FK_NutritionPlan_CreatedBy] FOREIGN KEY ([created_by]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [FK_NutritionPlan_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]),
    CONSTRAINT [CK_Code_Nutrition_Plan] CHECK(DATALENGTH([nutrition_plan_id])=7 AND [nutrition_plan_id] COLLATE Latin1_General_100_BIN2 LIKE 'NUT-[0-9][0-9][0-9]' AND [nutrition_plan_id]<>'NUT-000')
);
GO

-- ============================================================
-- 30. Supply_Item
-- ============================================================

CREATE TABLE Supply_Item (
    [supply_item_id] VARCHAR(20) NOT NULL,
    [item_name] NVARCHAR(150) NOT NULL,
    [category] NVARCHAR(100) NULL,
    [unit] NVARCHAR(30) NULL,
    [current_quantity] DECIMAL(10,2) NOT NULL DEFAULT ((0)),
    [minimum_threshold] DECIMAL(10,2) NULL,
    [status] VARCHAR(20) NOT NULL,
    CONSTRAINT [PK_Supply_Item] PRIMARY KEY ([supply_item_id]),
    CONSTRAINT [CK_Code_Supply_Item] CHECK(DATALENGTH([supply_item_id])=7 AND [supply_item_id] COLLATE Latin1_General_100_BIN2 LIKE 'SUP-[0-9][0-9][0-9]' AND [supply_item_id]<>'SUP-000')
);
GO

-- ============================================================
-- 31. Notification
-- ============================================================

CREATE TABLE Notification (
    [notification_id] VARCHAR(20) NOT NULL,
    [user_id] VARCHAR(20) NOT NULL,
    [notification_type] VARCHAR(50) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [is_read] BIT NOT NULL DEFAULT ((0)),
    [created_at] DATETIME2 NOT NULL DEFAULT (sysdatetime()),
    CONSTRAINT [PK_Notification] PRIMARY KEY ([notification_id]),
    CONSTRAINT [FK_Notification_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_Notification] CHECK(DATALENGTH([notification_id])=7 AND [notification_id] COLLATE Latin1_General_100_BIN2 LIKE 'NTF-[0-9][0-9][0-9]' AND [notification_id]<>'NTF-000')
);
GO

-- ============================================================
-- 32. Audit_Log
-- ============================================================

CREATE TABLE Audit_Log (
    [audit_id] VARCHAR(20) NOT NULL,
    [user_id] VARCHAR(20) NULL,
    [horse_id] VARCHAR(20) NULL,
    [action] VARCHAR(100) NOT NULL,
    [entity_type] VARCHAR(100) NULL,
    [entity_id] VARCHAR(20) NULL,
    [result] VARCHAR(50) NULL,
    [reason] NVARCHAR(1000) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT (sysdatetime()),
    CONSTRAINT [PK_Audit_Log] PRIMARY KEY ([audit_id]),
    CONSTRAINT [FK_AuditLog_Horse] FOREIGN KEY ([horse_id]) REFERENCES dbo.[Horse]([horse_id]),
    CONSTRAINT [FK_AuditLog_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_Audit_Log] CHECK(DATALENGTH([audit_id])=7 AND [audit_id] COLLATE Latin1_General_100_BIN2 LIKE 'AUD-[0-9][0-9][0-9]' AND [audit_id]<>'AUD-000')
);
GO

-- ============================================================
-- 33. Refresh_Token
-- ============================================================

CREATE TABLE Refresh_Token (
    [refresh_token_id] VARCHAR(20) NOT NULL,
    [user_id] VARCHAR(20) NOT NULL,
    [token_hash] VARCHAR(64) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [revoked_at] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT (sysutcdatetime()),
    CONSTRAINT [PK_Refresh_Token] PRIMARY KEY ([refresh_token_id]),
    CONSTRAINT [UQ__Refresh___9F6BDB1329F7A3FB] UNIQUE ([token_hash]),
    CONSTRAINT [FK_RefreshToken_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_Refresh_Token] CHECK(DATALENGTH([refresh_token_id])=7 AND [refresh_token_id] COLLATE Latin1_General_100_BIN2 LIKE 'RFT-[0-9][0-9][0-9]' AND [refresh_token_id]<>'RFT-000')
);
GO

-- ============================================================
-- 34. Password_Reset_Token
-- ============================================================

CREATE TABLE Password_Reset_Token (
    [reset_token_id] VARCHAR(20) NOT NULL,
    [user_id] VARCHAR(20) NOT NULL,
    [token_hash] VARCHAR(64) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [used_at] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT (sysutcdatetime()),
    CONSTRAINT [PK_Password_Reset_Token] PRIMARY KEY ([reset_token_id]),
    CONSTRAINT [UQ__Password__9F6BDB130699E4B3] UNIQUE ([token_hash]),
    CONSTRAINT [FK_PasswordResetToken_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_Password_Reset_Token] CHECK(DATALENGTH([reset_token_id])=7 AND [reset_token_id] COLLATE Latin1_General_100_BIN2 LIKE 'RST-[0-9][0-9][0-9]' AND [reset_token_id]<>'RST-000')
);
GO

-- ============================================================
-- 35. Email_Verification_OTP
-- ============================================================

CREATE TABLE Email_Verification_OTP (
    [user_id] VARCHAR(20) NOT NULL,
    [otp_hash] VARCHAR(64) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [sent_at] DATETIME2 NOT NULL,
    [attempt_count] INT NOT NULL DEFAULT ((0)),
    CONSTRAINT [PK_Email_Verification_OTP] PRIMARY KEY ([user_id]),
    CONSTRAINT [FK_EmailVerificationOtp_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id])
);
GO

-- ============================================================
-- 36. Registration_Request
-- ============================================================

CREATE TABLE Registration_Request (
    [request_id] VARCHAR(20) NOT NULL,
    [user_id] VARCHAR(20) NOT NULL,
    [requested_role_id] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT ('PENDING'),
    [reviewed_by] VARCHAR(20) NULL,
    [reviewed_at] DATETIME2 NULL,
    [review_note] NVARCHAR(500) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT (sysutcdatetime()),
    CONSTRAINT [PK_Registration_Request] PRIMARY KEY ([request_id]),
    CONSTRAINT [CK_RegistrationRequest_Status] CHECK ([status]='REJECTED' OR [status]='APPROVED' OR [status]='PENDING'),
    CONSTRAINT [FK_RegistrationRequest_Reviewer] FOREIGN KEY ([reviewed_by]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [FK_RegistrationRequest_Role] FOREIGN KEY ([requested_role_id]) REFERENCES dbo.[Role]([role_id]),
    CONSTRAINT [FK_RegistrationRequest_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_Registration_Request] CHECK(DATALENGTH([request_id])=7 AND [request_id] COLLATE Latin1_General_100_BIN2 LIKE 'REQ-[0-9][0-9][0-9]' AND [request_id]<>'REQ-000')
);
GO

-- ============================================================
-- 37. User_External_Login
-- ============================================================

CREATE TABLE User_External_Login (
    [external_login_id] VARCHAR(20) NOT NULL,
    [user_id] VARCHAR(20) NOT NULL,
    [provider] VARCHAR(20) NOT NULL,
    [provider_user_id] VARCHAR(255) NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT (sysutcdatetime()),
    CONSTRAINT [PK_User_External_Login] PRIMARY KEY ([external_login_id]),
    CONSTRAINT [UX_UserExternalLogin_UserProvider] UNIQUE ([user_id],[provider]),
    CONSTRAINT [UX_UserExternalLogin_ProviderUser] UNIQUE ([provider],[provider_user_id]),
    CONSTRAINT [FK_UserExternalLogin_User] FOREIGN KEY ([user_id]) REFERENCES dbo.[User]([user_id]),
    CONSTRAINT [CK_Code_User_External_Login] CHECK(DATALENGTH([external_login_id])=7 AND [external_login_id] COLLATE Latin1_General_100_BIN2 LIKE 'EXT-[0-9][0-9][0-9]' AND [external_login_id]<>'EXT-000')
);
GO

-- ============================================================
-- 38. Id_Counter
-- ============================================================

CREATE TABLE Id_Counter (
    prefix VARCHAR(16) NOT NULL CONSTRAINT PK_Id_Counter PRIMARY KEY,
    next_value BIGINT NOT NULL CONSTRAINT CK_IdCounter_ThreeDigits CHECK(next_value BETWEEN 0 AND 999)
);
GO

-- ============================================================
-- 39. ADDITIONAL INDEXES
-- ============================================================

CREATE UNIQUE INDEX [UX_RegistrationRequest_User_Pending] ON dbo.[Registration_Request]([user_id]) WHERE ([status]='PENDING');
GO
CREATE NONCLUSTERED INDEX [IX_TrainingPlan_Package] ON dbo.[Training_Plan] ([horse_package_id] ASC);
GO

-- ============================================================
-- 40. HORSE ID SEQUENCE
-- ============================================================

CREATE SEQUENCE dbo.Horse_Id_Sequence
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 999
    NO CYCLE;
GO

-- ============================================================
-- 41. INITIAL ROLES, PERMISSIONS, PACKAGES AND ID COUNTERS
-- ============================================================

INSERT dbo.Role(role_id,role_name) VALUES
 ('ROL-001','CLUB_MANAGER'),('ROL-002','HEAD_TRAINER'),('ROL-003','VETERINARIAN'),
 ('ROL-004','GROOM'),('ROL-005','HORSE_OWNER'),('ROL-006','USER'),('ROL-007','ADMIN');
GO

INSERT dbo.Permission(permission_id,permission_name,description) VALUES
 ('PER-001','MANAGE_PERMISSION',N'Grant or revoke permissions. Exclusive to ADMIN.'),
 ('PER-002','MANAGE_ACCOUNTS',N'Create and manage staff accounts.'),
 ('PER-003','ASSIGN_TRAINER',N'Assign and replace trainers through paid horse packages.'),
 ('PER-004','MANAGE_TRAINING',N'Create schedules and record training results.'),
 ('PER-005','VIEW_TRAINING',N'Read training schedules and results.');
GO

INSERT dbo.Role_Permission(role_id,permission_id) VALUES
 ('ROL-007','PER-001'),('ROL-007','PER-002'),('ROL-001','PER-003'),
 ('ROL-002','PER-004'),('ROL-002','PER-005'),('ROL-001','PER-005'),('ROL-005','PER-005');
GO

INSERT dbo.TRAINING_PACKAGE(package_id,package_name,package_type,description,duration_days,price) VALUES
 ('PKG-001',N'Basic Training','BASIC',N'Basic training package for new horses',30,5000000),
 ('PKG-002',N'Racing Training','RACING',N'Training package focused on racing performance',60,12000000),
 ('PKG-003',N'Performance Training','PERFORMANCE',N'Training package focused on improving horse performance',45,9000000),
 ('PKG-004',N'Recovery Training','RECOVERY',N'Rehabilitation and recovery package',30,6000000);
GO

INSERT dbo.Id_Counter(prefix,next_value) VALUES
 ('AUD-',0),
 ('CAR-',0),
 ('HLT-',0),
 ('HOR-',0),
 ('RAC-',0),
 ('CLN-',0),
 ('MED-',0),
 ('VIT-',0),
 ('NTF-',0),
 ('NUT-',0),
 ('RST-',0),
 ('RFT-',0),
 ('REQ-',0),
 ('ROL-',7),
 ('SUP-',0),
 ('LCK-',0),
 ('USR-',0),
 ('EXT-',0),
 ('HTR-',0),
 ('ASN-',0),
 ('PER-',5),
 ('PKG-',4),
 ('HPG-',0),
 ('PLN-',0),
 ('SES-',0),
 ('PRO-',0),
 ('REC-',0),
 ('STG-',0),
 ('OWN-',0),
 ('VET-',0),
 ('CM-',0);

GO

-- ============================================================
-- 42. TRAINING BUSINESS TRIGGER
-- ============================================================

CREATE   TRIGGER dbo.TR_TrainingPlan_FixedRegisteredPackage
ON dbo.Training_Plan AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.plan_id=i.plan_id WHERE i.horse_package_id<>d.horse_package_id AND EXISTS(SELECT 1 FROM dbo.Training_Session s WHERE s.plan_id=i.plan_id))
  THROW 51013,'A plan with sessions cannot move to another registered package.',1;
END
GO

-- ============================================================
-- 43. TRAINING BUSINESS TRIGGER
-- ============================================================

CREATE   TRIGGER dbo.TR_TrainingSession_PackageBoundary
ON dbo.Training_Session AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.session_id=i.session_id WHERE i.plan_id<>d.plan_id OR i.horse_id<>d.horse_id)
  THROW 51010,'A session cannot be reassigned to another horse or plan.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Training_Plan p ON p.plan_id=i.plan_id JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=p.horse_package_id
  WHERE i.horse_id<>hp.horse_id OR hp.start_date IS NULL OR hp.end_date IS NULL OR CONVERT(date,i.scheduled_start)<hp.start_date OR CONVERT(date,i.scheduled_start)>hp.end_date OR (i.scheduled_end IS NOT NULL AND CONVERT(date,i.scheduled_end)>hp.end_date))
  THROW 51011,'Session dates must remain within its registered horse package.',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.session_id=i.session_id
  JOIN dbo.Horse h WITH(UPDLOCK,HOLDLOCK) ON h.horse_id=i.horse_id
  WHERE (h.training_locked=1 OR EXISTS(SELECT 1 FROM dbo.Training_Lock l WHERE l.horse_id=i.horse_id AND l.unlocked_at IS NULL))
   AND (d.session_id IS NULL OR (i.actual_start IS NOT NULL AND d.actual_start IS NULL) OR (i.actual_end IS NOT NULL AND d.actual_end IS NULL) OR (i.status='COMPLETED' AND d.status<>'COMPLETED')))
  THROW 51012,'Medical training lock blocks session creation, start, stop and completion.',1;
END
GO

-- ============================================================
-- 44. TRAINING BUSINESS TRIGGER
-- ============================================================

CREATE OR ALTER TRIGGER dbo.TR_TrainingAssignment_Request
ON dbo.Training_Assignment AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Horse_Assignment a ON a.id=i.assignment_id JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=i.horse_package_id WHERE a.kind<>'TRAINER' OR a.horse_id<>hp.horse_id)
  THROW 51040,'Training assignment must reference a TRAINER request for the same package horse.',1;
END
GO

-- ============================================================
-- 45. SCHEMA VERSION
-- ============================================================

EXEC sys.sp_addextendedproperty
    @name = N'RaceForge_CompleteStringSchema',
    @value = N'2026-10-19';
GO

-- When connecting this standalone schema to the existing backend for the first time:
-- FLYWAY_BASELINE_VERSION=12, baseline-on-migrate=true. Do not run V1 over it.
-- Admin creates user accounts through the application; no user/password is seeded here.

-- Reset session execution state, including when the existing-schema guard fired.
SET NOEXEC OFF;
GO
