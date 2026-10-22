IF COL_LENGTH('dbo.Training_Session', 'heart_rate') IS NULL
BEGIN
    ALTER TABLE dbo.Training_Session
    ADD heart_rate int NULL;
END;

IF COL_LENGTH('dbo.Training_Session', 'avg_speed') IS NULL
BEGIN
    ALTER TABLE dbo.Training_Session
    ADD avg_speed float NULL;
END;

IF COL_LENGTH('dbo.Training_Session', 'max_speed') IS NULL
BEGIN
    ALTER TABLE dbo.Training_Session
    ADD max_speed float NULL;
END;

IF COL_LENGTH('dbo.Training_Session', 'recorded_by') IS NULL
BEGIN
    ALTER TABLE dbo.Training_Session
    ADD recorded_by int NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'dbo.Training_Session')
      AND name = N'FK_TrainingSession_RecordedBy'
)
BEGIN
    ALTER TABLE dbo.Training_Session WITH CHECK
    ADD CONSTRAINT FK_TrainingSession_RecordedBy
        FOREIGN KEY (recorded_by) REFERENCES dbo.[User](user_id);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Training_Session')
      AND name = N'UX_TrainingSession_HorseStart'
)
BEGIN
    CREATE UNIQUE INDEX UX_TrainingSession_HorseStart
        ON dbo.Training_Session(horse_id, scheduled_start);
END;
