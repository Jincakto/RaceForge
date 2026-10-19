ALTER TABLE dbo.Training_Stage ADD session_end_time time(7) NULL;
GO
ALTER TABLE dbo.Training_Stage ADD CONSTRAINT CK_TrainingStage_TimeWindow
    CHECK(session_end_time IS NULL OR session_end_time>session_time);
ALTER TABLE dbo.Training_Session ADD CONSTRAINT CK_TrainingSession_PlannedWindow
    CHECK(scheduled_end IS NULL OR (scheduled_end>scheduled_start AND CONVERT(date,scheduled_end)=CONVERT(date,scheduled_start)));
