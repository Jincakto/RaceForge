-- Existing approved horses retain ongoing veterinary care. Pending horses must
-- be screened explicitly: never infer a documentary decision from an assignment.
ALTER TABLE dbo.Horse_Admission ADD
 screening_status varchar(30) NOT NULL CONSTRAINT DF_HorseAdmission_Screening DEFAULT 'PENDING',
 screened_by varchar(20) NULL,
 screened_at datetime2 NULL,
 screening_reason nvarchar(1000) NULL,
 submitted_at datetime2 NULL;
ALTER TABLE dbo.Horse_Admission ADD CONSTRAINT CK_HorseAdmission_Screening
 CHECK (screening_status IN ('PENDING','PASSED','NEEDS_CORRECTION','REJECTED'));
ALTER TABLE dbo.Horse_Admission ADD CONSTRAINT FK_HorseAdmission_ScreenedBy
 FOREIGN KEY (screened_by) REFERENCES dbo.[User](user_id);
