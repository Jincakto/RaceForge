-- All test records are recreated; no legacy NULL package plans are supported by this schema.
ALTER TABLE dbo.Training_Plan ALTER COLUMN horse_package_id varchar(32) NOT NULL;
ALTER TABLE dbo.Training_Plan ALTER COLUMN trainer_assignment_id varchar(32) NOT NULL;
ALTER TABLE dbo.Training_Plan ADD horse_id varchar(32) NULL;
GO
UPDATE p SET horse_id=hp.horse_id FROM dbo.Training_Plan p JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=p.horse_package_id;
ALTER TABLE dbo.Training_Plan ALTER COLUMN horse_id varchar(32) NOT NULL;
ALTER TABLE dbo.HORSE_PACKAGE ADD CONSTRAINT UQ_HorsePackage_Horse UNIQUE(horse_package_id,horse_id);
ALTER TABLE dbo.Trainer_Assignment ADD CONSTRAINT UQ_Assignment_Package UNIQUE(assignment_id,horse_package_id);
ALTER TABLE dbo.Training_Recommendation ADD CONSTRAINT UQ_Recommendation_Package UNIQUE(recommendation_id,horse_package_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT UQ_TrainingPlan_Horse UNIQUE(plan_id,horse_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_Plan_PackageHorse FOREIGN KEY(horse_package_id,horse_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id,horse_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_Plan_AssignmentPackage FOREIGN KEY(trainer_assignment_id,horse_package_id) REFERENCES dbo.Trainer_Assignment(assignment_id,horse_package_id);
ALTER TABLE dbo.Training_Plan ADD CONSTRAINT FK_Plan_RecommendationPackage FOREIGN KEY(recommendation_id,horse_package_id) REFERENCES dbo.Training_Recommendation(recommendation_id,horse_package_id);
ALTER TABLE dbo.Training_Recommendation ADD CONSTRAINT FK_Recommendation_AssignmentPackage FOREIGN KEY(assignment_id,horse_package_id) REFERENCES dbo.Trainer_Assignment(assignment_id,horse_package_id);
ALTER TABLE dbo.Horse_Plan ADD CONSTRAINT FK_HorsePlan_PlanHorse FOREIGN KEY(plan_id,horse_id) REFERENCES dbo.Training_Plan(plan_id,horse_id);
CREATE INDEX IX_Assignment_TrainerStatus ON dbo.Trainer_Assignment(trainer_id,status,horse_package_id);
CREATE INDEX IX_TrainingPlan_Package ON dbo.Training_Plan(horse_package_id);

-- Retire the old one-trainer-on-Horse relation; assignments now exclusively go through Horse_Package.
DECLARE @sql nvarchar(max)=N'';
SELECT @sql=@sql+N'ALTER TABLE dbo.Horse DROP CONSTRAINT '+QUOTENAME(fk.name)+N';'
FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
WHERE fk.parent_object_id=OBJECT_ID('dbo.Horse') AND COL_NAME(fc.parent_object_id,fc.parent_column_id)='head_trainer_id';
EXEC sp_executesql @sql;
ALTER TABLE dbo.Horse DROP COLUMN head_trainer_id;
