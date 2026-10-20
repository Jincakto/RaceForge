ALTER TABLE dbo.Training_Plan ADD package_type varchar(30) NULL, roadmap_version varchar(50) NULL;
GO
ALTER TABLE dbo.Training_Stage ADD phase_code varchar(50) NULL, title nvarchar(150) NULL, objective nvarchar(1000) NULL;
GO
ALTER TABLE dbo.Training_Session ADD training_stage_id varchar(32) NULL;
GO
CREATE UNIQUE INDEX UX_TrainingStage_PlanStage ON dbo.Training_Stage(stage_id,plan_id);
ALTER TABLE dbo.Training_Session ADD CONSTRAINT FK_TrainingSession_PlanStage
    FOREIGN KEY(training_stage_id,plan_id) REFERENCES dbo.Training_Stage(stage_id,plan_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT CK_TrainingPlan_PackageType
    CHECK(package_type IS NULL OR package_type IN ('BASIC','RACING','PERFORMANCE','RECOVERY'));
