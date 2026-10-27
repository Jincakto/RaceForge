-- Standalone alternative to Flyway V13. Do not run both.
BEGIN TRANSACTION;
-- Run only against the intended development/test database. No USE or DROP DATABASE.
SET XACT_ABORT ON;
IF OBJECT_ID('dbo.TRAINING_PACKAGE','U') IS NULL THROW 51000,'Import the canonical application schema first',1;
IF EXISTS(SELECT horse_package_id FROM dbo.Training_Plan GROUP BY horse_package_id HAVING COUNT(*)>1)
 THROW 51000,'Reset test Training data before adding one-plan-per-registration constraint',1;
CREATE TABLE dbo.Package_Roadmap_Template(
 roadmap_template_id varchar(36) NOT NULL PRIMARY KEY,
 package_id varchar(20) NOT NULL UNIQUE REFERENCES dbo.TRAINING_PACKAGE(package_id),
 title nvarchar(150) NOT NULL,goal nvarchar(500) NOT NULL,
 template_revision int NOT NULL DEFAULT 1 CHECK(template_revision>0),
 created_at datetime2 NOT NULL DEFAULT SYSDATETIME(),updated_at datetime2 NOT NULL DEFAULT SYSDATETIME()
);
CREATE TABLE dbo.Package_Stage_Template(
 stage_template_id varchar(36) NOT NULL PRIMARY KEY,
 roadmap_template_id varchar(36) NOT NULL REFERENCES dbo.Package_Roadmap_Template(roadmap_template_id),
 stage_order int NOT NULL CHECK(stage_order>0),phase_code varchar(50) NOT NULL,
 title nvarchar(150) NOT NULL,objective nvarchar(1000) NULL,activity_name nvarchar(500) NOT NULL,
 intensity varchar(30) NOT NULL CHECK(intensity IN ('LOW','MODERATE','HIGH')),
 start_day int NOT NULL CHECK(start_day>=1),end_day int NOT NULL,
 weekdays_json nvarchar(200) NOT NULL CHECK(ISJSON(weekdays_json)=1),
 session_time time NOT NULL,session_end_time time NOT NULL,
 CHECK(end_day>=start_day),CHECK(session_end_time>session_time),
 UNIQUE(roadmap_template_id,stage_order)
);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Training_Plan') AND name='UX_TrainingPlan_Registration')
 CREATE UNIQUE INDEX UX_TrainingPlan_Registration ON dbo.Training_Plan(horse_package_id);

COMMIT;
