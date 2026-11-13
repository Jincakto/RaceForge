-- RaceForge Medical/Training transition. SQL Server; safe to apply once via Flyway.
-- Keep historical Recovery registrations, audit rows and PayOS receipts intact.
IF COL_LENGTH('dbo.Medical_Clinical_Exam', 'evidence_image_path') IS NULL
BEGIN
    ALTER TABLE dbo.Medical_Clinical_Exam ADD evidence_image_path varchar(255) NULL;
END;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.Medical_Clinical_Exam')
           AND name='CK_ClinicalExam_GroupCondition')
BEGIN
    ALTER TABLE dbo.Medical_Clinical_Exam DROP CONSTRAINT CK_ClinicalExam_GroupCondition;
END;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.Medical_Clinical_Exam')
           AND name='CK_ClinicalExam_GroupCondition')
BEGIN
    ALTER TABLE dbo.Medical_Clinical_Exam WITH CHECK ADD CONSTRAINT CK_ClinicalExam_GroupCondition
        CHECK (condition_status IN ('NORMAL','ABNORMAL','CRITICAL'));
END;

-- Catalogue-only retirement; past HORSE_PACKAGE rows remain queryable unchanged.
IF OBJECT_ID('dbo.TRAINING_PACKAGE','U') IS NOT NULL
BEGIN
    UPDATE dbo.TRAINING_PACKAGE SET status='INACTIVE'
    WHERE package_type='RECOVERY' AND status <> 'INACTIVE';
END;
