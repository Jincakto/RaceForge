ALTER TABLE dbo.Medical_Record ADD training_eligible bit NULL, eligibility_reason nvarchar(1000) NULL;
CREATE TABLE dbo.Horse_Admission (
 horse_id varchar(20) NOT NULL PRIMARY KEY REFERENCES dbo.Horse(horse_id),
 status varchar(50) NOT NULL,
 medical_record_id varchar(20) NULL REFERENCES dbo.Medical_Record(medical_record_id),
 decision_by varchar(20) NULL REFERENCES dbo.[User](user_id),
 decision_reason nvarchar(1000) NULL,
 decided_at datetime2 NULL,
 created_at datetime2 NOT NULL DEFAULT SYSDATETIME(),
 CONSTRAINT CK_Horse_Admission_Status CHECK(status IN ('NEEDS_REVIEW','PENDING_REVIEW','AWAITING_VET_ACCEPTANCE','AWAITING_VET_REASSIGNMENT','AWAITING_EXAMINATION','AWAITING_ADMISSION_DECISION','REJECTED','AWAITING_TRAINER_ASSIGNMENT','AWAITING_TRAINER_ACCEPTANCE','AWAITING_TRAINER_REASSIGNMENT','COMPLETED'))
);
-- Existing rows have no trustworthy assignment/acceptance history. Preserve their data,
-- explicitly require manager review, and never fabricate an approval or acceptance.
INSERT INTO dbo.Horse_Admission(horse_id,status) SELECT horse_id,'NEEDS_REVIEW' FROM dbo.Horse;
CREATE TABLE dbo.Horse_Assignment (
 id int IDENTITY(1,1) NOT NULL PRIMARY KEY,
 horse_id varchar(20) NOT NULL REFERENCES dbo.Horse_Admission(horse_id),
 kind varchar(10) NOT NULL CHECK(kind IN ('VET','TRAINER')),
 assigned_by varchar(20) NOT NULL REFERENCES dbo.[User](user_id),
 assignee_id varchar(20) NOT NULL REFERENCES dbo.[User](user_id),
 status varchar(20) NOT NULL CHECK(status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','COMPLETED')),
 reason nvarchar(1000) NULL,
 created_at datetime2 NOT NULL,
 responded_at datetime2 NULL,
 medical_record_id varchar(20) NULL REFERENCES dbo.Medical_Record(medical_record_id),
 CONSTRAINT CK_Assignment_Reason CHECK(status NOT IN ('REJECTED','CANCELLED') OR LEN(LTRIM(RTRIM(reason)))>0 AND reason IS NOT NULL)
);
CREATE UNIQUE INDEX UX_Assignment_Pending ON dbo.Horse_Assignment(horse_id,kind) WHERE status='PENDING';
CREATE INDEX IX_Assignment_Horse ON dbo.Horse_Assignment(horse_id,id);
CREATE INDEX IX_Assignment_Recipient ON dbo.Horse_Assignment(assignee_id,status);
