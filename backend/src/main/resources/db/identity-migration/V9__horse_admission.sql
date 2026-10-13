
-- V9: Horse admission compatibility migration
-- Do not modify the finalized database schema.

-- Verify required columns already exist.
IF COL_LENGTH('dbo.Horse', 'admission_status') IS NULL
    THROW 50001, 'Missing Horse.admission_status in finalized schema.', 1;

IF COL_LENGTH('dbo.Horse', 'admission_note') IS NULL
    THROW 50002, 'Missing Horse.admission_note in finalized schema.', 1;

-- Verify the admission constraint already exists.
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Horse')
      AND name = 'CK_Horse_Admission'
)
    THROW 50003, 'Missing CK_Horse_Admission in finalized schema.', 1;

-- No ALTER TABLE or UPDATE required.
