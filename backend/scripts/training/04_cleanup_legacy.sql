-- Optional separate cleanup. Destructive legacy snapshots, no automatic execution.
SET XACT_ABORT ON;BEGIN TRANSACTION;
DECLARE @sql nvarchar(max)=N'';
SELECT @sql=@sql+N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(f.parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(f.name)+N';'
FROM sys.foreign_keys f WHERE f.referenced_object_id IN (OBJECT_ID('dbo.Training_Recommendation'),OBJECT_ID('dbo.Training_Protocol'),OBJECT_ID('dbo.Training_Medical_Context'))
 OR f.parent_object_id IN (OBJECT_ID('dbo.Training_Recommendation'),OBJECT_ID('dbo.Training_Protocol'),OBJECT_ID('dbo.Training_Medical_Context'));
EXEC sys.sp_executesql @sql;
IF COL_LENGTH('dbo.Training_Plan','recommendation_id') IS NOT NULL ALTER TABLE dbo.Training_Plan DROP COLUMN recommendation_id;
DROP TABLE IF EXISTS dbo.Training_Recommendation;
DROP TABLE IF EXISTS dbo.Training_Protocol;
DROP TABLE IF EXISTS dbo.Training_Medical_Context;
COMMIT;
