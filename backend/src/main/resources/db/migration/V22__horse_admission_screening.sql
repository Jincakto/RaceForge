-- Existing approved care is exempt from the gate; never fabricate a past screening.
IF COL_LENGTH('dbo.Horse_Admission', 'screening_status') IS NULL
    ALTER TABLE dbo.Horse_Admission ADD screening_status varchar(30) NOT NULL
        CONSTRAINT DF_HorseAdmission_Screening DEFAULT 'PENDING';
IF COL_LENGTH('dbo.Horse_Admission', 'screened_by') IS NULL
    ALTER TABLE dbo.Horse_Admission ADD screened_by varchar(20) NULL;
IF COL_LENGTH('dbo.Horse_Admission', 'screened_at') IS NULL
    ALTER TABLE dbo.Horse_Admission ADD screened_at datetime2 NULL;
IF COL_LENGTH('dbo.Horse_Admission', 'screening_reason') IS NULL
    ALTER TABLE dbo.Horse_Admission ADD screening_reason nvarchar(1000) NULL;
IF COL_LENGTH('dbo.Horse_Admission', 'submitted_at') IS NULL
    ALTER TABLE dbo.Horse_Admission ADD submitted_at datetime2 NULL;
GO

IF OBJECT_ID('dbo.CK_HorseAdmission_Screening', 'C') IS NULL
    ALTER TABLE dbo.Horse_Admission ADD CONSTRAINT CK_HorseAdmission_Screening
        CHECK(screening_status IN ('PENDING','PASSED','NEEDS_CORRECTION','REJECTED'));
IF OBJECT_ID('dbo.FK_HorseAdmission_ScreenedBy', 'F') IS NULL
    ALTER TABLE dbo.Horse_Admission ADD CONSTRAINT FK_HorseAdmission_ScreenedBy
        FOREIGN KEY(screened_by) REFERENCES dbo.[User](user_id);
GO
