-- Restore the shared tables to the team's columns; put Training extensions in its own tables.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'RaceForge_TrainingIsolation_V11') RETURN;
BEGIN TRANSACTION;
CREATE TABLE dbo.Training_Assignment(
 assignment_id int NOT NULL CONSTRAINT PK_Training_Assignment PRIMARY KEY,
 horse_package_id varchar(20) NOT NULL,
 ended_at datetime2(7) NULL,
 CONSTRAINT UQ_TrainingAssignment_Package UNIQUE(assignment_id,horse_package_id),
 CONSTRAINT FK_TrainingAssignment_Request FOREIGN KEY(assignment_id) REFERENCES dbo.Horse_Assignment(id),
 CONSTRAINT FK_TrainingAssignment_Package FOREIGN KEY(horse_package_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id)
);
INSERT dbo.Training_Assignment(assignment_id,horse_package_id,ended_at)
 SELECT id,horse_package_id,ended_at FROM dbo.Horse_Assignment WHERE kind='TRAINER';
-- Retarget only Training-owned FKs that used the extension on the shared table.
DECLARE @sql nvarchar(max)=N'';
DECLARE @restore TABLE(ddl nvarchar(max));
INSERT @restore SELECT N'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N' WITH CHECK ADD CONSTRAINT '+QUOTENAME(f.name)+N' FOREIGN KEY ('+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.parent_object_id,fc.parent_column_id))),N',') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N') REFERENCES dbo.Training_Assignment ('+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(CASE COL_NAME(fc.referenced_object_id,fc.referenced_column_id) WHEN 'id' THEN 'assignment_id' ELSE COL_NAME(fc.referenced_object_id,fc.referenced_column_id) END)),N',') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N');'
 FROM sys.foreign_keys f WHERE f.referenced_object_id=OBJECT_ID('dbo.Horse_Assignment') AND f.parent_object_id IN (OBJECT_ID('dbo.Training_Plan'),OBJECT_ID('dbo.Training_Recommendation'));
SELECT @sql=@sql+N'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(f.name)+N';' FROM sys.foreign_keys f WHERE f.referenced_object_id=OBJECT_ID('dbo.Horse_Assignment') AND f.parent_object_id IN (OBJECT_ID('dbo.Training_Plan'),OBJECT_ID('dbo.Training_Recommendation'));
EXEC sp_executesql @sql;
DECLARE refs CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM @restore;
OPEN refs;FETCH NEXT FROM refs INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM refs INTO @sql;END;
CLOSE refs;DEALLOCATE refs;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT FK_HorseAssignment_PackageHorse;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT CK_HorseAssignment_KindPackage;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT UQ_HorseAssignment_Package;
ALTER TABLE dbo.Horse_Assignment DROP CONSTRAINT CK_HorseAssignment_Status;
ALTER TABLE dbo.Horse_Assignment DROP COLUMN horse_package_id,ended_at;
CREATE TABLE dbo.Training_Medical_Context(
 medical_record_id varchar(20) NOT NULL CONSTRAINT PK_Training_Medical_Context PRIMARY KEY,
 ideal_weight decimal(8,2) NULL,
 body_condition_score int NULL,
 CONSTRAINT FK_TrainingMedicalContext_Record FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id),
 CONSTRAINT CK_TrainingMedicalContext_Values CHECK((ideal_weight IS NULL OR ideal_weight>0) AND (body_condition_score IS NULL OR body_condition_score BETWEEN 1 AND 9))
);
INSERT dbo.Training_Medical_Context(medical_record_id,ideal_weight,body_condition_score)
 SELECT medical_record_id,ideal_weight,body_condition_score FROM dbo.Medical_Record WHERE ideal_weight IS NOT NULL OR body_condition_score IS NOT NULL;
SET @sql=N'';
SELECT @sql=@sql+N'ALTER TABLE dbo.Medical_Record DROP CONSTRAINT '+QUOTENAME(name)+N';' FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.Medical_Record') AND (definition LIKE '%ideal_weight%' OR definition LIKE '%body_condition_score%');
EXEC sp_executesql @sql;
ALTER TABLE dbo.Medical_Record DROP COLUMN ideal_weight,body_condition_score;
-- Enforce the link on our table, without adding columns/constraints/triggers to the team's request table.
EXEC(N'CREATE OR ALTER TRIGGER dbo.TR_TrainingAssignment_Request
ON dbo.Training_Assignment AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Horse_Assignment a ON a.id=i.assignment_id JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=i.horse_package_id WHERE a.kind<>''TRAINER'' OR a.horse_id<>hp.horse_id)
  THROW 51040,''Training assignment must reference a TRAINER request for the same package horse.'',1;
END');
EXEC sys.sp_addextendedproperty @name=N'RaceForge_TrainingIsolation_V11',@value=N'APPLIED';
COMMIT TRANSACTION;
