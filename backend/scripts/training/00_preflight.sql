-- READ ONLY. Run before selecting reset / fresh-baseline route.
SELECT DB_NAME() AS database_name;
SELECT name FROM sys.tables ORDER BY name;
IF OBJECT_ID('dbo.flyway_schema_history') IS NOT NULL EXEC('SELECT installed_rank,version,description,success FROM dbo.flyway_schema_history ORDER BY installed_rank');
SELECT horse_package_id,COUNT(*) AS plans FROM dbo.Training_Plan GROUP BY horse_package_id HAVING COUNT(*)>1;
SELECT OBJECT_NAME(parent_object_id) AS from_table,name,OBJECT_NAME(referenced_object_id) AS to_table FROM sys.foreign_keys WHERE referenced_object_id IN (OBJECT_ID('dbo.Training_Recommendation'),OBJECT_ID('dbo.Training_Protocol'),OBJECT_ID('dbo.HORSE_PACKAGE'));
