-- DESTRUCTIVE: Training development/test data only. Review and back up before manual execution.
-- Does not reset Trainer profiles, accounts, roles, Medical, Training Lock or flyway history.
IF DB_NAME() NOT LIKE 'RaceForgeTrainingTest[_]%' AND DB_NAME() NOT LIKE 'RaceForgeLifecycleTest[_]%'
    AND DB_NAME() NOT LIKE 'RaceForgeCertificateTest[_]%'
    THROW 51000, 'Training reset is restricted to disposable test databases.', 1;
SET XACT_ABORT ON;BEGIN TRANSACTION;
IF OBJECT_ID('dbo.Training_Assessment_Notification_Link','U') IS NOT NULL DELETE FROM dbo.Training_Assessment_Notification_Link;
IF OBJECT_ID('dbo.Training_Session_Assessment_Item','U') IS NOT NULL DELETE FROM dbo.Training_Session_Assessment_Item;
IF OBJECT_ID('dbo.Training_Session_Assessment','U') IS NOT NULL DELETE FROM dbo.Training_Session_Assessment;
IF OBJECT_ID('dbo.Training_Certificate','U') IS NOT NULL DELETE FROM dbo.Training_Certificate;
DELETE FROM dbo.Training_Session;
DELETE FROM dbo.Training_Stage;
DELETE FROM dbo.Horse_Plan;
DELETE FROM dbo.Training_Plan;
IF OBJECT_ID('dbo.Training_Recommendation','U') IS NOT NULL DELETE FROM dbo.Training_Recommendation;
DELETE FROM dbo.Training_Assignment;
DELETE FROM dbo.HORSE_PACKAGE;
IF OBJECT_ID('dbo.Package_Stage_Template','U') IS NOT NULL DELETE FROM dbo.Package_Stage_Template;
IF OBJECT_ID('dbo.Package_Roadmap_Template','U') IS NOT NULL DELETE FROM dbo.Package_Roadmap_Template;
DELETE FROM dbo.TRAINING_PACKAGE;
-- Counters stay monotonic: shared assignment/profile history is preserved.
COMMIT;
