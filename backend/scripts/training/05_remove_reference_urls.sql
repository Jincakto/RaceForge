-- Manual alternative to Flyway V14; review target DB before execution.
SET XACT_ABORT ON;BEGIN TRANSACTION;
-- Remove mistakenly added reference URLs; application roadmap content is unchanged.
-- Existing V13 remains immutable. Safe if a fresh full-schema import already omitted the column.
IF COL_LENGTH('dbo.Package_Roadmap_Template','source_urls_json') IS NOT NULL
BEGIN
 DECLARE @sql nvarchar(max)=N'';
 SELECT @sql=@sql+N'ALTER TABLE dbo.Package_Roadmap_Template DROP CONSTRAINT '+QUOTENAME(name)+N';'
 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.Package_Roadmap_Template') AND definition LIKE '%source_urls_json%';
 SELECT @sql=@sql+N'ALTER TABLE dbo.Package_Roadmap_Template DROP CONSTRAINT '+QUOTENAME(name)+N';'
 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.Package_Roadmap_Template') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID('dbo.Package_Roadmap_Template'),'source_urls_json','ColumnId');
 EXEC sys.sp_executesql @sql;
 ALTER TABLE dbo.Package_Roadmap_Template DROP COLUMN source_urls_json;
END;

COMMIT;
