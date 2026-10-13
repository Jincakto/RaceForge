-- Admission is independent of activation and medical eligibility.
ALTER TABLE dbo.Horse ADD admission_status varchar(20) NOT NULL CONSTRAINT DF_Horse_Admission DEFAULT 'NOT_SUBMITTED';
ALTER TABLE dbo.Horse ADD admission_note nvarchar(500) NULL;
GO
-- Preserve horses already active before admission tracking was introduced.
UPDATE dbo.Horse SET admission_status = 'APPROVED' WHERE status = 'ACTIVE';
ALTER TABLE dbo.Horse ADD CONSTRAINT CK_Horse_Admission CHECK (admission_status IN ('NOT_SUBMITTED','PENDING','APPROVED','REJECTED'));
