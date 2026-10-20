-- Non-destructive portion of the team's proposed schema.
-- Does not replace Trainer_Profile/Trainer_Assignment or drop columns used by the current backend.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.Horse_Admission','U') IS NULL
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
IF OBJECT_ID('dbo.Horse_Assignment','U') IS NULL
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
IF COL_LENGTH('dbo.Medical_Record','training_eligible') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Record ADD training_eligible bit NULL');
IF COL_LENGTH('dbo.Medical_Record','eligibility_reason') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Record ADD eligibility_reason nvarchar(1000) NULL');
IF COL_LENGTH('dbo.Horse','registration_number') IS NULL
 EXEC(N'ALTER TABLE dbo.Horse ADD registration_number varchar(100) NULL');
IF COL_LENGTH('dbo.Horse','document_type') IS NULL
 EXEC(N'ALTER TABLE dbo.Horse ADD document_type varchar(50) NULL');
IF COL_LENGTH('dbo.Horse','document_url') IS NULL
 EXEC(N'ALTER TABLE dbo.Horse ADD document_url nvarchar(500) NULL');
IF COL_LENGTH('dbo.Medical_Vital_Sign','weight') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Vital_Sign ADD weight decimal(7,2) NULL');
IF COL_LENGTH('dbo.Medical_Record','suggested_conclusion') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Record ADD suggested_conclusion varchar(30) NULL');
IF COL_LENGTH('dbo.Medical_Record','final_conclusion') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Record ADD final_conclusion varchar(30) NULL');
IF COL_LENGTH('dbo.Medical_Record','override_reason') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Record ADD override_reason nvarchar(1000) NULL');
IF COL_LENGTH('dbo.Medical_Record','monitoring_note') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Record ADD monitoring_note nvarchar(1000) NULL');
IF COL_LENGTH('dbo.Medical_Record','training_lock_reason') IS NULL
 EXEC(N'ALTER TABLE dbo.Medical_Record ADD training_lock_reason nvarchar(1000) NULL');
COMMIT TRANSACTION;
