-- V12: all remaining business identity keys become immutable PREFIX-001..999 strings.
-- Applies after V11 in this project's migration chain; not a patch for an arbitrary legacy database.
SET XACT_ABORT ON; SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'RaceForge_AllString_V12') RETURN;
BEGIN TRANSACTION;
CREATE TABLE #Roots(table_name sysname,column_name sysname,prefix varchar(16));
INSERT #Roots VALUES('Trainer','trainer_id','HTR-'),('Horse_Assignment','id','ASN-'),('Health_Profile','profile_id','HLT-');
CREATE TABLE #IdColumns(object_id int,column_id int,table_name sysname,column_name sysname,prefix varchar(16),is_root bit,is_nullable bit,PRIMARY KEY(object_id,column_id));
INSERT #IdColumns SELECT t.object_id,c.column_id,t.name,c.name,r.prefix,1,c.is_nullable FROM #Roots r JOIN sys.tables t ON t.name=r.table_name AND t.schema_id=SCHEMA_ID('dbo') JOIN sys.columns c ON c.object_id=t.object_id AND c.name=r.column_name;
IF (SELECT COUNT(*) FROM #IdColumns)<>3 THROW 51050,'Expected three numeric business ID roots after V11.',1;
DECLARE @added int=1;
WHILE @added>0
BEGIN
 INSERT #IdColumns SELECT DISTINCT fc.parent_object_id,fc.parent_column_id,OBJECT_NAME(fc.parent_object_id),COL_NAME(fc.parent_object_id,fc.parent_column_id),x.prefix,0,c.is_nullable
 FROM sys.foreign_key_columns fc JOIN #IdColumns x ON x.object_id=fc.referenced_object_id AND x.column_id=fc.referenced_column_id
 JOIN sys.columns c ON c.object_id=fc.parent_object_id AND c.column_id=fc.parent_column_id
 WHERE NOT EXISTS(SELECT 1 FROM #IdColumns seen WHERE seen.object_id=fc.parent_object_id AND seen.column_id=fc.parent_column_id);
 SET @added=@@ROWCOUNT;
END;
DECLARE @guard nvarchar(max)=N'';
SELECT @guard=@guard+N'IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(table_name)+N' WHERE '+QUOTENAME(column_name)+N' IS NOT NULL AND (TRY_CONVERT(int,'+QUOTENAME(column_name)+N') IS NULL OR TRY_CONVERT(int,'+QUOTENAME(column_name)+N') NOT BETWEEN 1 AND 999)) THROW 51051,''An ID is outside 001..999; migration will not truncate or wrap.'',1;' FROM #IdColumns;
EXEC sp_executesql @guard;
DECLARE @EnabledTriggers TABLE(ddl nvarchar(max),restore_ddl nvarchar(max));
INSERT @EnabledTriggers SELECT N'DISABLE TRIGGER '+QUOTENAME(OBJECT_SCHEMA_NAME(tr.object_id))+N'.'+QUOTENAME(tr.name)+N' ON dbo.'+QUOTENAME(OBJECT_NAME(tr.parent_id))+N';',N'ENABLE TRIGGER '+QUOTENAME(OBJECT_SCHEMA_NAME(tr.object_id))+N'.'+QUOTENAME(tr.name)+N' ON dbo.'+QUOTENAME(OBJECT_NAME(tr.parent_id))+N';' FROM sys.triggers tr WHERE tr.is_disabled=0 AND tr.parent_class=1 AND OBJECT_SCHEMA_NAME(tr.parent_id)='dbo';
DECLARE @triggerSql nvarchar(max)=N'';SELECT @triggerSql=@triggerSql+ddl FROM @EnabledTriggers;EXEC sp_executesql @triggerSql;
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


DECLARE @idTable sysname,@idColumn sysname,@prefix varchar(16),@root bit,@null bit;
DECLARE ids CURSOR LOCAL FAST_FORWARD FOR SELECT table_name,column_name,prefix,is_root,is_nullable FROM #IdColumns ORDER BY is_root,table_name,column_name;
OPEN ids;FETCH NEXT FROM ids INTO @idTable,@idColumn,@prefix,@root,@null;
WHILE @@FETCH_STATUS=0
BEGIN
 IF @root=0
 BEGIN
  SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@idTable)+N' ALTER COLUMN '+QUOTENAME(@idColumn)+N' varchar(20) '+CASE @null WHEN 1 THEN N'NULL' ELSE N'NOT NULL' END+N'; UPDATE dbo.'+QUOTENAME(@idTable)+N' SET '+QUOTENAME(@idColumn)+N'='''+@prefix+N'''+RIGHT(''000''+CONVERT(varchar(3),TRY_CONVERT(int,'+QUOTENAME(@idColumn)+N')),3) WHERE '+QUOTENAME(@idColumn)+N' IS NOT NULL;';
  EXEC sp_executesql @sql;
 END
 ELSE
 BEGIN
  SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@idTable)+N' ADD __string_id varchar(20) NULL;';EXEC sp_executesql @sql;
  SET @sql=N'UPDATE dbo.'+QUOTENAME(@idTable)+N' SET __string_id='''+@prefix+N'''+RIGHT(''000''+CONVERT(varchar(3),'+QUOTENAME(@idColumn)+N'),3); ALTER TABLE dbo.'+QUOTENAME(@idTable)+N' ALTER COLUMN __string_id varchar(20) NOT NULL; ALTER TABLE dbo.'+QUOTENAME(@idTable)+N' DROP COLUMN '+QUOTENAME(@idColumn)+N';';EXEC sp_executesql @sql;
  DECLARE @objectName nvarchar(300)=N'dbo.'+QUOTENAME(@idTable)+N'.[__string_id]';
  EXEC sp_rename @objectName,@idColumn,'COLUMN';
 END;
 FETCH NEXT FROM ids INTO @idTable,@idColumn,@prefix,@root,@null;
END;
CLOSE ids;DEALLOCATE ids;
DECLARE keys_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Keys;
OPEN keys_again;FETCH NEXT FROM keys_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM keys_again INTO @sql;END;
CLOSE keys_again;DEALLOCATE keys_again;
DECLARE indexes_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Indexes;
OPEN indexes_again;FETCH NEXT FROM indexes_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM indexes_again INTO @sql;END;
CLOSE indexes_again;DEALLOCATE indexes_again;
DECLARE fk_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #FK;
OPEN fk_again;FETCH NEXT FROM fk_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM fk_again INTO @sql;END;
CLOSE fk_again;DEALLOCATE fk_again;
DECLARE checks_again CURSOR LOCAL FAST_FORWARD FOR SELECT ddl FROM #Checks;
OPEN checks_again;FETCH NEXT FROM checks_again INTO @sql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM checks_again INTO @sql;END;
CLOSE checks_again;DEALLOCATE checks_again;
DECLARE root_counters CURSOR LOCAL FAST_FORWARD FOR SELECT table_name,column_name,prefix FROM #Roots;
OPEN root_counters;FETCH NEXT FROM root_counters INTO @idTable,@idColumn,@prefix;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @sql=N'DECLARE @value int=(SELECT COALESCE(MAX(TRY_CONVERT(int,RIGHT('+QUOTENAME(@idColumn)+N',3))),0) FROM dbo.'+QUOTENAME(@idTable)+N'); IF NOT EXISTS(SELECT 1 FROM dbo.Id_Counter WHERE prefix='''+@prefix+N''') INSERT dbo.Id_Counter(prefix,next_value) VALUES('''+@prefix+N''',@value); ELSE UPDATE dbo.Id_Counter SET next_value=CASE WHEN next_value<@value THEN @value ELSE next_value END WHERE prefix='''+@prefix+N''';';EXEC sp_executesql @sql;
 FETCH NEXT FROM root_counters INTO @idTable,@idColumn,@prefix;
END;
CLOSE root_counters;DEALLOCATE root_counters;
SET @triggerSql=N'';SELECT @triggerSql=@triggerSql+restore_ddl FROM @EnabledTriggers;EXEC sp_executesql @triggerSql;
EXEC sys.sp_addextendedproperty @name=N'RaceForge_AllString_V12',@value=N'APPLIED';
COMMIT TRANSACTION;
