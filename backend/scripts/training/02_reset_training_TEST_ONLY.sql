-- DESTRUCTIVE: Training development/test data only. Review and back up before manual execution.
-- Does not reset Trainer profiles, accounts, roles, Medical, Training Lock or flyway history.
SET XACT_ABORT ON;BEGIN TRANSACTION;
DELETE FROM dbo.Training_Session;
DELETE FROM dbo.Training_Stage;
DELETE FROM dbo.Horse_Plan;
DELETE FROM dbo.Training_Plan;
IF OBJECT_ID('dbo.Training_Recommendation','U') IS NOT NULL DELETE FROM dbo.Training_Recommendation;
DELETE FROM dbo.Training_Assignment;
-- Training registrations have a self-reference for recovery replacements.
UPDATE dbo.HORSE_PACKAGE SET replaced_horse_package_id=NULL;
DELETE FROM dbo.HORSE_PACKAGE;
IF OBJECT_ID('dbo.Package_Stage_Template','U') IS NOT NULL DELETE FROM dbo.Package_Stage_Template;
IF OBJECT_ID('dbo.Package_Roadmap_Template','U') IS NOT NULL DELETE FROM dbo.Package_Roadmap_Template;
DELETE FROM dbo.TRAINING_PACKAGE;
-- Counters stay monotonic: shared assignment/profile history is preserved.
COMMIT;
