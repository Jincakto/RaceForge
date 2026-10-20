-- Group schema is authoritative. Existing data is translated, not reset.
-- V9 provides Horse_Admission, Horse_Assignment and the additive medical fields.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'RaceForge_GroupSchema_V10' AND CONVERT(nvarchar(50),value)=N'APPLIED') RETURN;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.Trainer_Profile','U') IS NULL OR OBJECT_ID('dbo.Trainer_Assignment','U') IS NULL
 THROW 51020,'Expected legacy training tables are missing; do not guess a migration mapping.',1;

-- Capture constraints before replacing key types. Recreate with WITH CHECK, never disable trust.
CREATE TABLE #FK (ddl nvarchar(max));
INSERT #FK SELECT N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(f.parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N' WITH CHECK ADD CONSTRAINT '+QUOTENAME(f.name)+N' FOREIGN KEY ('+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.parent_object_id,fc.parent_column_id))),N',') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N') REFERENCES '+QUOTENAME(OBJECT_SCHEMA_NAME(f.referenced_object_id))+N'.'+QUOTENAME(OBJECT_NAME(f.referenced_object_id))+N' ('+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.referenced_object_id,fc.referenced_column_id))),N',') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+N')'+
 CASE f.delete_referential_action WHEN 1 THEN N' ON DELETE CASCADE' WHEN 2 THEN N' ON DELETE SET NULL' WHEN 3 THEN N' ON DELETE SET DEFAULT' ELSE N'' END+
 CASE f.update_referential_action WHEN 1 THEN N' ON UPDATE CASCADE' WHEN 2 THEN N' ON UPDATE SET NULL' WHEN 3 THEN N' ON UPDATE SET DEFAULT' ELSE N'' END+N';'
 FROM sys.foreign_keys f WHERE OBJECT_SCHEMA_NAME(f.parent_object_id)='dbo' AND OBJECT_NAME(f.parent_object_id) NOT IN ('Trainer_Profile','Trainer_Assignment');
UPDATE #FK SET ddl=REPLACE(ddl,N'REFERENCES [dbo].[Trainer_Assignment] ([assignment_id]',N'REFERENCES [dbo].[Horse_Assignment] ([id]');

CREATE TABLE #Keys(ddl nvarchar(max));
INSERT #Keys SELECT N'ALTER TABLE dbo.'+QUOTENAME(t.name)+N' ADD CONSTRAINT '+QUOTENAME(k.name)+CASE k.type WHEN 'PK' THEN N' PRIMARY KEY ' ELSE N' UNIQUE ' END+CASE i.type WHEN 1 THEN N'CLUSTERED ' ELSE N'NONCLUSTERED ' END+N' ('+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)+CASE ic.is_descending_key WHEN 1 THEN N' DESC' ELSE N' ASC' END),N',') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)+N');'
 FROM sys.key_constraints k JOIN sys.tables t ON t.object_id=k.parent_object_id JOIN sys.indexes i ON i.object_id=t.object_id AND i.index_id=k.unique_index_id
 WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name NOT LIKE 'flyway%' AND t.name NOT IN ('Trainer_Profile','Trainer_Assignment');
CREATE TABLE #Checks(ddl nvarchar(max));
INSERT #Checks SELECT N'ALTER TABLE dbo.'+QUOTENAME(t.name)+N' WITH CHECK ADD CONSTRAINT '+QUOTENAME(c.name)+N' CHECK '+c.definition+N';'
 FROM sys.check_constraints c JOIN sys.tables t ON t.object_id=c.parent_object_id
 WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name NOT IN ('Trainer_Profile','Trainer_Assignment')
 AND NOT(t.name='Horse' AND (c.definition LIKE '%admission_status%' OR c.definition LIKE '%dam_sire%' OR c.definition LIKE '%background%' OR c.definition LIKE '%weight%'))
 AND NOT(t.name='Medical_Record' AND (c.definition LIKE '%measured_weight%' OR c.definition LIKE '%fitness_conclusion%'))
 AND NOT(t.name='Medical_Clinical_Exam' AND (c.definition LIKE '%severity%' OR c.definition LIKE '%abnormality_type%'));
CREATE TABLE #Indexes(ddl nvarchar(max));
INSERT #Indexes SELECT N'CREATE '+CASE i.is_unique WHEN 1 THEN N'UNIQUE ' ELSE N'' END+N'NONCLUSTERED INDEX '+QUOTENAME(i.name)+N' ON dbo.'+QUOTENAME(t.name)+N' ('+
 (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)+CASE ic.is_descending_key WHEN 1 THEN N' DESC' ELSE N' ASC' END),N',') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)+N')'+
 CASE WHEN EXISTS(SELECT 1 FROM sys.index_columns ic WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1) THEN N' INCLUDE ('+(SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)),N',') WITHIN GROUP(ORDER BY ic.index_column_id) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1)+N')' ELSE N'' END+
 CASE i.has_filter WHEN 1 THEN N' WHERE '+i.filter_definition ELSE N'' END+N';'
 FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name NOT LIKE 'flyway%' AND t.name NOT IN ('Trainer_Profile','Trainer_Assignment') AND i.type=2 AND i.is_primary_key=0 AND i.is_unique_constraint=0;

DECLARE @sql nvarchar(max)=N'';
SELECT @sql=@sql+N'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(name)+N';' FROM sys.foreign_keys WHERE OBJECT_SCHEMA_NAME(parent_object_id)='dbo';
EXEC sp_executesql @sql;
SET @sql=N'';
SELECT @sql=@sql+N'DROP INDEX '+QUOTENAME(i.name)+N' ON dbo.'+QUOTENAME(t.name)+N';' FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name NOT LIKE 'flyway%' AND i.type=2 AND i.is_primary_key=0 AND i.is_unique_constraint=0;
EXEC sp_executesql @sql;
SET @sql=N'';
SELECT @sql=@sql+N'ALTER TABLE dbo.'+QUOTENAME(t.name)+N' DROP CONSTRAINT '+QUOTENAME(k.name)+N';' FROM sys.key_constraints k JOIN sys.tables t ON t.object_id=k.parent_object_id WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name NOT LIKE 'flyway%';
EXEC sp_executesql @sql;
SET @sql=N'';
SELECT @sql=@sql+N'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(name)+N';' FROM sys.check_constraints WHERE OBJECT_SCHEMA_NAME(parent_object_id)='dbo';
EXEC sp_executesql @sql;

-- Keep optional trainer biography/history without changing the group's Trainer core definition.
CREATE TABLE dbo.Trainer (trainer_id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Trainer PRIMARY KEY,user_id varchar(20) NOT NULL CONSTRAINT UQ_Trainer_User UNIQUE);
CREATE TABLE dbo.Trainer_Detail (trainer_id int NOT NULL CONSTRAINT PK_Trainer_Detail PRIMARY KEY,bio nvarchar(1000) NULL,qualifications nvarchar(1000) NULL,status varchar(20) NOT NULL DEFAULT 'ACTIVE',created_at datetime2(7) NOT NULL DEFAULT SYSDATETIME());
CREATE TABLE dbo.Horse_Trainer (horse_id varchar(20) NOT NULL,trainer_id int NOT NULL,CONSTRAINT PK_Horse_Trainer PRIMARY KEY(horse_id,trainer_id));
CREATE TABLE #TrainerMap(old_id varchar(32) NOT NULL,new_id int NOT NULL,user_id varchar(32) NOT NULL);
MERGE dbo.Trainer AS target USING (SELECT trainer_id,user_id FROM dbo.Trainer_Profile) AS source ON 1=0
 WHEN NOT MATCHED THEN INSERT(user_id) VALUES(source.user_id)
 OUTPUT source.trainer_id,inserted.trainer_id,source.user_id INTO #TrainerMap;
INSERT dbo.Trainer_Detail(trainer_id,bio,qualifications,status,created_at)
 SELECT m.new_id,p.bio,p.qualifications,p.status,p.created_at FROM dbo.Trainer_Profile p JOIN #TrainerMap m ON m.old_id=p.trainer_id;

ALTER TABLE dbo.Horse_Assignment ADD horse_package_id varchar(20) NULL,ended_at datetime2(7) NULL;
CREATE TABLE #AssignmentMap(old_id varchar(32) NOT NULL,new_id int NOT NULL);
EXEC(N'MERGE dbo.Horse_Assignment AS target USING (
 SELECT a.*,hp.horse_id,m.user_id FROM dbo.Trainer_Assignment a JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=a.horse_package_id JOIN #TrainerMap m ON m.old_id=a.trainer_id
) AS source ON 1=0
 WHEN NOT MATCHED THEN INSERT(horse_id,kind,assigned_by,assignee_id,status,reason,created_at,responded_at,horse_package_id,ended_at)
 VALUES(source.horse_id,''TRAINER'',source.assigned_by,source.user_id,CASE source.status WHEN ''PENDING'' THEN ''ASSIGNED'' WHEN ''REJECTED'' THEN ''DECLINED'' WHEN ''ENDED'' THEN ''CANCELLED'' ELSE source.status END,source.reason,source.assigned_at,source.responded_at,source.horse_package_id,source.ended_at)
 OUTPUT source.assignment_id,inserted.id INTO #AssignmentMap;');
-- Disable only our immutable-package trigger while translating FK values; restored before COMMIT.
DISABLE TRIGGER dbo.TR_TrainingPlan_FixedRegisteredPackage ON dbo.Training_Plan;
UPDATE p SET trainer_assignment_id=CONVERT(varchar(32),m.new_id) FROM dbo.Training_Plan p JOIN #AssignmentMap m ON m.old_id=p.trainer_assignment_id;
UPDATE r SET assignment_id=CONVERT(varchar(32),m.new_id) FROM dbo.Training_Recommendation r JOIN #AssignmentMap m ON m.old_id=r.assignment_id;
IF EXISTS(SELECT 1 FROM dbo.Training_Plan WHERE TRY_CONVERT(int,trainer_assignment_id) IS NULL) OR EXISTS(SELECT 1 FROM dbo.Training_Recommendation WHERE TRY_CONVERT(int,assignment_id) IS NULL)
 THROW 51021,'Unmapped trainer assignment; migration rolled back.',1;
ALTER TABLE dbo.Training_Plan ALTER COLUMN trainer_assignment_id int NOT NULL;
ALTER TABLE dbo.Training_Recommendation ALTER COLUMN assignment_id int NOT NULL;
EXEC(N'INSERT dbo.Horse_Trainer(horse_id,trainer_id) SELECT DISTINCT a.horse_id,t.trainer_id FROM dbo.Horse_Assignment a JOIN dbo.Trainer t ON t.user_id=a.assignee_id JOIN dbo.Trainer_Detail d ON d.trainer_id=t.trainer_id WHERE a.kind=''TRAINER'' AND a.status=''ACCEPTED'' AND d.status=''ACTIVE'';');
DROP TABLE dbo.Trainer_Assignment;
DROP TABLE dbo.Trainer_Profile;

-- Health_Profile INT IDENTITY and matching Medical_Record.profile_id, without deleting examinations.
ALTER TABLE dbo.Health_Profile ADD group_profile_id int IDENTITY(1,1) NOT NULL;
CREATE TABLE #HealthMap(old_id varchar(32),new_id int);
EXEC(N'INSERT #HealthMap SELECT profile_id,group_profile_id FROM dbo.Health_Profile;');
UPDATE mr SET profile_id=CONVERT(varchar(32),m.new_id) FROM dbo.Medical_Record mr JOIN #HealthMap m ON m.old_id=mr.profile_id;
IF EXISTS(SELECT 1 FROM dbo.Medical_Record WHERE TRY_CONVERT(int,profile_id) IS NULL) THROW 51022,'Unmapped health profile; migration rolled back.',1;
ALTER TABLE dbo.Medical_Record ALTER COLUMN profile_id int NOT NULL;
ALTER TABLE dbo.Health_Profile DROP COLUMN profile_id;
EXEC sp_rename 'dbo.Health_Profile.group_profile_id','profile_id','COLUMN';

-- Admission is authoritative. Preserve every existing horse's current decision before dropping duplicates.
INSERT dbo.Horse_Admission(horse_id,status,decision_reason,created_at)
 SELECT h.horse_id,h.admission_status,h.admission_note,SYSDATETIME() FROM dbo.Horse h WHERE NOT EXISTS(SELECT 1 FROM dbo.Horse_Admission a WHERE a.horse_id=h.horse_id);
-- Canonical measured weight belongs to the examination vital signs; do not invent readings.
UPDATE v SET weight=mr.measured_weight FROM dbo.Medical_Vital_Sign v JOIN dbo.Medical_Record mr ON mr.medical_record_id=v.medical_record_id WHERE v.weight IS NULL AND mr.measured_weight IS NOT NULL;
-- If a historical record has no vital-sign row, create a weight-only row using the normal String counter.
DECLARE @record varchar(32),@weight decimal(8,2),@next int;
DECLARE missing_vitals CURSOR LOCAL FAST_FORWARD FOR SELECT mr.medical_record_id,mr.measured_weight FROM dbo.Medical_Record mr WHERE mr.measured_weight IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Medical_Vital_Sign v WHERE v.medical_record_id=mr.medical_record_id);
OPEN missing_vitals;FETCH NEXT FROM missing_vitals INTO @record,@weight;
WHILE @@FETCH_STATUS=0
BEGIN
 SELECT @next=next_value+1 FROM dbo.Id_Counter WITH(UPDLOCK,HOLDLOCK) WHERE prefix='VIT-';
 IF @next IS NULL OR @next>999 THROW 51023,'Vital-sign ID range exhausted while preserving old weight data.',1;
 UPDATE dbo.Id_Counter SET next_value=@next WHERE prefix='VIT-';
 INSERT dbo.Medical_Vital_Sign(vital_sign_id,medical_record_id,weight) VALUES('VIT-'+RIGHT('000'+CONVERT(varchar(3),@next),3),@record,@weight);
 FETCH NEXT FROM missing_vitals INTO @record,@weight;
END;
CLOSE missing_vitals;DEALLOCATE missing_vitals;
UPDATE dbo.Medical_Record SET eligibility_reason=COALESCE(eligibility_reason,fitness_conclusion),
 final_conclusion=COALESCE(final_conclusion,CASE training_eligible WHEN 1 THEN 'FIT' WHEN 0 THEN 'NOT_FIT' END);
-- Existing unconfirmed/legacy conclusions remain explicit; do not generate suggested_conclusion from old data.
ALTER TABLE dbo.Medical_Record DROP COLUMN measured_weight,fitness_conclusion;

-- The default/check bound to removed Horse columns must be dropped before the columns.
SET @sql=N'';
SELECT @sql=@sql+N'ALTER TABLE dbo.Horse DROP CONSTRAINT '+QUOTENAME(dc.name)+N';' FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id WHERE dc.parent_object_id=OBJECT_ID('dbo.Horse') AND c.name IN ('dam_sire','background','weight','head_trainer_id','admission_status','admission_note');
EXEC sp_executesql @sql;
ALTER TABLE dbo.Horse DROP COLUMN dam_sire,background,weight,admission_status,admission_note;
IF COL_LENGTH('dbo.Horse','head_trainer_id') IS NOT NULL EXEC(N'ALTER TABLE dbo.Horse DROP COLUMN head_trainer_id');
UPDATE dbo.Medical_Clinical_Exam SET condition_status='ABNORMAL' WHERE condition_status='CRITICAL';
-- Preserve removed clinical descriptors in notes, rather than silently discarding findings.
IF EXISTS(SELECT 1 FROM dbo.Medical_Clinical_Exam WHERE (severity IS NOT NULL OR abnormality_type IS NOT NULL) AND LEN(COALESCE(notes,N''))+LEN(COALESCE(severity,N''))+LEN(COALESCE(abnormality_type,N''))+60>500)
 THROW 51024,'Clinical notes would be truncated while preserving old descriptors; resolve before migration.',1;
UPDATE dbo.Medical_Clinical_Exam SET notes=CONCAT(COALESCE(notes,N''),CASE WHEN severity IS NOT NULL THEN N' [Legacy severity: '+severity+N']' ELSE N'' END,CASE WHEN abnormality_type IS NOT NULL THEN N' [Legacy abnormality: '+abnormality_type+N']' ELSE N'' END) WHERE severity IS NOT NULL OR abnormality_type IS NOT NULL;
ALTER TABLE dbo.Medical_Clinical_Exam DROP COLUMN severity,abnormality_type;

-- Exact group VARCHAR(20) width, including every dependent String key, never truncate existing values.
DECLARE @table sysname,@column sysname,@nullable bit;
DECLARE widths CURSOR LOCAL FAST_FORWARD FOR SELECT t.name,c.name,c.is_nullable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name NOT LIKE 'flyway%' AND ty.name='varchar' AND c.max_length=32;
OPEN widths;FETCH NEXT FROM widths INTO @table,@column,@nullable;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @sql=N'IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(@table)+N' WHERE DATALENGTH('+QUOTENAME(@column)+N')>20) THROW 51025,''An existing ID exceeds VARCHAR(20); migration will not truncate it.'',1; ALTER TABLE dbo.'+QUOTENAME(@table)+N' ALTER COLUMN '+QUOTENAME(@column)+N' varchar(20) '+CASE @nullable WHEN 1 THEN N'NULL' ELSE N'NOT NULL' END+N';';
 EXEC sp_executesql @sql;
 FETCH NEXT FROM widths INTO @table,@column,@nullable;
END;
CLOSE widths;DEALLOCATE widths;

DECLARE restore_keys CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Keys;
OPEN restore_keys;FETCH NEXT FROM restore_keys INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_keys INTO @sql;END;
CLOSE restore_keys;DEALLOCATE restore_keys;
EXEC(N'ALTER TABLE dbo.Horse_Assignment ADD CONSTRAINT UQ_HorseAssignment_Package UNIQUE(id,horse_package_id);');
EXEC(N'ALTER TABLE dbo.Horse_Assignment ADD CONSTRAINT FK_HorseAssignment_PackageHorse FOREIGN KEY(horse_package_id,horse_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id,horse_id);');
ALTER TABLE dbo.Trainer ADD CONSTRAINT FK_Trainer_User FOREIGN KEY(user_id) REFERENCES dbo.[User](user_id);
ALTER TABLE dbo.Trainer_Detail ADD CONSTRAINT FK_TrainerDetail_Trainer FOREIGN KEY(trainer_id) REFERENCES dbo.Trainer(trainer_id);
ALTER TABLE dbo.Horse_Trainer ADD CONSTRAINT FK_HorseTrainer_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),CONSTRAINT FK_HorseTrainer_Trainer FOREIGN KEY(trainer_id) REFERENCES dbo.Trainer(trainer_id);
-- FK targets may be unique indexes rather than UNIQUE constraints (e.g. Role.role_name).
DECLARE restore_indexes CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Indexes;
OPEN restore_indexes;FETCH NEXT FROM restore_indexes INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_indexes INTO @sql;END;
CLOSE restore_indexes;DEALLOCATE restore_indexes;
DECLARE restore_fk CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #FK;
OPEN restore_fk;FETCH NEXT FROM restore_fk INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_fk INTO @sql;END;
CLOSE restore_fk;DEALLOCATE restore_fk;
DECLARE restore_checks CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Checks;
OPEN restore_checks;FETCH NEXT FROM restore_checks INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM restore_checks INTO @sql;END;
CLOSE restore_checks;DEALLOCATE restore_checks;
EXEC(N'ALTER TABLE dbo.Horse_Assignment WITH CHECK ADD CONSTRAINT CK_HorseAssignment_KindPackage CHECK((kind=''VET'' AND horse_package_id IS NULL) OR (kind=''TRAINER'' AND horse_package_id IS NOT NULL));');
ALTER TABLE dbo.Horse_Assignment WITH CHECK ADD CONSTRAINT CK_HorseAssignment_Status CHECK(status IN ('ASSIGNED','ACCEPTED','DECLINED','COMPLETED','REASSIGNED','CANCELLED'));
ALTER TABLE dbo.Medical_Clinical_Exam WITH CHECK ADD CONSTRAINT CK_ClinicalExam_GroupCondition CHECK(condition_status IN ('NORMAL','ABNORMAL'));
ALTER TABLE dbo.Medical_Record WITH CHECK ADD CONSTRAINT CK_Medical_GroupConclusion CHECK(final_conclusion IS NULL OR final_conclusion IN ('FIT','FIT_WITH_MONITORING','NOT_FIT'));
ALTER TABLE dbo.Medical_Record WITH CHECK ADD CONSTRAINT CK_Medical_GroupStatus CHECK(status IN ('DRAFT','CONFIRMED','CANCELLED'));
ALTER TABLE dbo.Medical_Vital_Sign WITH CHECK ADD CONSTRAINT CK_MedicalVitalSign_GroupWeight CHECK(weight IS NULL OR weight>0);
-- No manually requested schema reset; retain all mapped business records and relationships.
DECLARE @horseNext bigint=(SELECT COALESCE(MAX(TRY_CONVERT(bigint,SUBSTRING(horse_id,5,20))),0)+1 FROM dbo.Horse WHERE horse_id LIKE 'HOR-%');
IF @horseNext>999 SET @horseNext=999;
IF OBJECT_ID('dbo.Horse_Id_Sequence','SO') IS NULL
BEGIN
 SET @sql=N'CREATE SEQUENCE dbo.Horse_Id_Sequence AS bigint START WITH '+CONVERT(nvarchar(20),@horseNext)+N' INCREMENT BY 1 MINVALUE 1 MAXVALUE 999 NO CYCLE;';EXEC sp_executesql @sql;
END;
ENABLE TRIGGER dbo.TR_TrainingPlan_FixedRegisteredPackage ON dbo.Training_Plan;
EXEC sys.sp_addextendedproperty @name=N'RaceForge_GroupSchema_V10',@value=N'APPLIED';
COMMIT TRANSACTION;
-- Deployment log only: retain ID translations for dependent clients without exporting account data.
SELECT 'Trainer' AS entity,old_id,CONVERT(varchar(20),new_id) AS new_id FROM #TrainerMap
UNION ALL SELECT 'Horse_Assignment',old_id,CONVERT(varchar(20),new_id) FROM #AssignmentMap
UNION ALL SELECT 'Health_Profile',old_id,CONVERT(varchar(20),new_id) FROM #HealthMap;
