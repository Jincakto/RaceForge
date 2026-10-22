USE RaceForge;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.Training_Session') AND name='CK_TrainingSession_RecoveryResults')
 ALTER TABLE dbo.Training_Session DROP CONSTRAINT CK_TrainingSession_RecoveryResults;
ALTER TABLE dbo.Training_Session WITH CHECK ADD CONSTRAINT CK_TrainingSession_RecoveryResults CHECK (
 (resting_heart_rate IS NULL OR resting_heart_rate>0) AND
 (end_exercise_heart_rate IS NULL OR end_exercise_heart_rate>0) AND
 (recovery_heart_rate_2_min IS NULL OR recovery_heart_rate_2_min>0) AND
 (distance IS NULL OR distance>=0) AND
 (actual_end IS NULL OR (actual_start IS NOT NULL AND actual_end>actual_start)) AND
 (recovery_measured_at IS NULL OR (actual_end IS NOT NULL AND recovery_measured_at>=actual_end))
);
COMMIT;
