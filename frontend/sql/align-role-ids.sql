-- Run manually in SSMS after stopping the application and backing up RaceForge.
-- Preserves existing users, requested roles and permission associations by role name.
-- Does not change account IDs, passwords, status, or verification flags.
USE [RaceForge];
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    CREATE TABLE #TargetRoles (
        role_id INT NOT NULL PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE
    );
    INSERT INTO #TargetRoles (role_id, role_name) VALUES
        (1, 'CLUB_MANAGER'),
        (2, 'HEAD_TRAINER'),
        (3, 'VETERINARIAN'),
        (4, 'GROOM'),
        (5, 'HORSE_OWNER'),
        (6, 'USER'),
        (7, 'ADMIN');

    DECLARE @roleCount INT;
    SELECT @roleCount = COUNT(*) FROM dbo.[Role] WITH (TABLOCKX, HOLDLOCK);

    IF EXISTS (
        SELECT 1 FROM dbo.[Role] r
        LEFT JOIN #TargetRoles t ON t.role_name = r.role_name
        WHERE t.role_id IS NULL OR r.role_id < 0 OR r.role_id >= 1000
    )
        THROW 50001, 'Unknown role or role ID outside the supported range. No changes applied.', 1;

    SELECT r.role_id AS old_id, t.role_id AS new_id
    INTO #RoleMap
    FROM dbo.[Role] r
    JOIN #TargetRoles t ON t.role_name = r.role_name;

    -- Record every FK, including the reference to Role.role_name.
    SELECT fk.object_id AS fk_id, fk.name AS fk_name,
           OBJECT_SCHEMA_NAME(fk.parent_object_id) AS schema_name,
           OBJECT_NAME(fk.parent_object_id) AS table_name,
           COL_NAME(fc.parent_object_id, fc.parent_column_id) AS column_name,
           COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS target_column,
           fk.is_disabled
    INTO #RoleForeignKeys
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fc ON fc.constraint_object_id = fk.object_id
    WHERE fk.referenced_object_id = OBJECT_ID(N'dbo.Role');

    IF EXISTS (SELECT fk_id FROM #RoleForeignKeys GROUP BY fk_id HAVING COUNT(*) <> 1)
        THROW 50002, 'Composite Role foreign key found. No changes applied.', 1;

    IF EXISTS (SELECT 1 FROM #RoleForeignKeys WHERE is_disabled = 1)
        THROW 50003, 'An existing Role foreign key is disabled. Review it before migration.', 1;

    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(schema_name) + N'.' + QUOTENAME(table_name)
        + N' NOCHECK CONSTRAINT ' + QUOTENAME(fk_name) + N';' + CHAR(10)
    FROM #RoleForeignKeys;
    IF @sql <> N'' EXEC sys.sp_executesql @sql;

    -- Stage numeric references outside the live ID range to avoid primary-key
    -- collisions in Role_Permission while IDs are rearranged.
    SET @sql = N'';
    SELECT @sql = @sql + N'UPDATE child SET ' + QUOTENAME(column_name)
        + N' = map.old_id + 1000 FROM ' + QUOTENAME(schema_name) + N'.' + QUOTENAME(table_name)
        + N' child JOIN #RoleMap map ON child.' + QUOTENAME(column_name) + N' = map.old_id;' + CHAR(10)
    FROM #RoleForeignKeys WHERE target_column = N'role_id';
    IF @sql <> N'' EXEC sys.sp_executesql @sql;

    -- role_id is IDENTITY, so it cannot be changed with UPDATE.
    DELETE FROM dbo.[Role];
    SET IDENTITY_INSERT dbo.[Role] ON;
    INSERT INTO dbo.[Role] (role_id, role_name)
        SELECT role_id, role_name FROM #TargetRoles;
    SET IDENTITY_INSERT dbo.[Role] OFF;

    SET @sql = N'';
    SELECT @sql = @sql + N'UPDATE child SET ' + QUOTENAME(column_name)
        + N' = map.new_id FROM ' + QUOTENAME(schema_name) + N'.' + QUOTENAME(table_name)
        + N' child JOIN #RoleMap map ON child.' + QUOTENAME(column_name) + N' = map.old_id + 1000;' + CHAR(10)
    FROM #RoleForeignKeys WHERE target_column = N'role_id';
    IF @sql <> N'' EXEC sys.sp_executesql @sql;

    -- Validate all references before committing. A failure rolls back the migration.
    SET @sql = N'';
    SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(schema_name) + N'.' + QUOTENAME(table_name)
        + N' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(fk_name) + N';' + CHAR(10)
    FROM #RoleForeignKeys;
    IF @sql <> N'' EXEC sys.sp_executesql @sql;

    DROP TABLE #RoleForeignKeys;
    DROP TABLE #RoleMap;
    DROP TABLE #TargetRoles;
    COMMIT TRANSACTION;

    SELECT role_id, role_name FROM dbo.[Role] ORDER BY role_id;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    SET IDENTITY_INSERT dbo.[Role] OFF;
    THROW;
END CATCH;
