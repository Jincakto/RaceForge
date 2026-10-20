-- Additive, idempotent: may be applied with sqlcmd, then registered by Flyway on startup.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.Training_Session','resting_heart_rate') IS NULL
BEGIN
 ALTER TABLE dbo.Training_Session ADD
  resting_heart_rate int NULL,
  end_exercise_heart_rate int NULL,
  recovery_heart_rate_2_min int NULL,
  recovery_measured_at datetime2 NULL,
  resting_medical_record_id varchar(32) NULL,
  resting_measured_at datetime2 NULL;
END;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_TrainingSession_RecoveryResults' AND parent_object_id=OBJECT_ID('dbo.Training_Session'))
 EXEC(N'ALTER TABLE dbo.Training_Session WITH CHECK ADD CONSTRAINT CK_TrainingSession_RecoveryResults CHECK(
 (resting_heart_rate IS NULL OR resting_heart_rate>0) AND
 (end_exercise_heart_rate IS NULL OR end_exercise_heart_rate>0) AND
 (recovery_heart_rate_2_min IS NULL OR recovery_heart_rate_2_min>0) AND
 (distance IS NULL OR distance>=0) AND
 (actual_end IS NULL OR (actual_start IS NOT NULL AND actual_end>actual_start)) AND
 (recovery_measured_at IS NULL OR (actual_end IS NOT NULL AND recovery_measured_at>=DATEADD(minute,2,actual_end))))');
-- Resting medical ID is a historical snapshot reference, no changes to Medical tables.
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_TrainingSession_RestingMedical')
 EXEC(N'ALTER TABLE dbo.Training_Session WITH CHECK ADD CONSTRAINT FK_TrainingSession_RestingMedical
 FOREIGN KEY(resting_medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id)');
EXEC(N'CREATE OR ALTER TRIGGER dbo.TR_TrainingSession_PackageBoundary
ON dbo.Training_Session AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.session_id=i.session_id WHERE i.plan_id<>d.plan_id OR i.horse_id<>d.horse_id)
  THROW 51010,''A session cannot be reassigned to another horse or plan.'',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Training_Plan p ON p.plan_id=i.plan_id JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=p.horse_package_id
  WHERE i.horse_id<>hp.horse_id OR hp.start_date IS NULL OR hp.end_date IS NULL OR CONVERT(date,i.scheduled_start)<hp.start_date OR CONVERT(date,i.scheduled_start)>hp.end_date OR (i.scheduled_end IS NOT NULL AND CONVERT(date,i.scheduled_end)>hp.end_date))
  THROW 51011,''Session dates must remain within its registered horse package.'',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.session_id=i.session_id
  JOIN dbo.Horse h WITH(UPDLOCK,HOLDLOCK) ON h.horse_id=i.horse_id
  WHERE (h.training_locked=1 OR EXISTS(SELECT 1 FROM dbo.Training_Lock l WHERE l.horse_id=i.horse_id AND l.unlocked_at IS NULL))
   AND (d.session_id IS NULL OR (i.actual_start IS NOT NULL AND d.actual_start IS NULL) OR (i.actual_end IS NOT NULL AND d.actual_end IS NULL) OR (i.status=''COMPLETED'' AND d.status<>''COMPLETED'')))
  THROW 51012,''Medical training lock blocks session creation, start, stop and completion.'',1;
END');
EXEC(N'CREATE OR ALTER TRIGGER dbo.TR_TrainingPlan_FixedRegisteredPackage
ON dbo.Training_Plan AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.plan_id=i.plan_id WHERE i.horse_package_id<>d.horse_package_id AND EXISTS(SELECT 1 FROM dbo.Training_Session s WHERE s.plan_id=i.plan_id))
  THROW 51013,''A plan with sessions cannot move to another registered package.'',1;
END');
COMMIT TRANSACTION;
