SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;

-- Refuse conversion instead of truncating/reusing a committed code.
IF EXISTS (SELECT 1 FROM dbo.Id_Counter WHERE next_value NOT BETWEEN 0 AND 999)
    THROW 51000, 'Three-digit conversion requires every ID counter to be between 0 and 999.', 1;

CREATE TABLE #CodeMap (old_code varchar(32) NOT NULL PRIMARY KEY, new_code varchar(32) NOT NULL UNIQUE);
;WITH numbers AS (
    SELECT 1 AS n UNION ALL SELECT n+1 FROM numbers WHERE n<999
)
INSERT #CodeMap(old_code,new_code)
SELECT c.prefix+RIGHT('000000'+CAST(n.n AS varchar(6)),6),
       CASE c.prefix WHEN 'HRS-' THEN 'HOR-' WHEN 'TR' THEN 'HTR-' ELSE c.prefix END
       +RIGHT('000'+CAST(n.n AS varchar(3)),3)
FROM dbo.Id_Counter c JOIN numbers n ON n.n<=c.next_value
OPTION (MAXRECURSION 1000);

-- All operations are in Flyway's migration transaction. Restore trusted FKs before completion.
DECLARE @sql nvarchar(max)=N'';
SELECT @sql=@sql+N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))+N'.'
    +QUOTENAME(OBJECT_NAME(parent_object_id))+N' NOCHECK CONSTRAINT '+QUOTENAME(name)+N';'
FROM sys.foreign_keys WHERE OBJECT_SCHEMA_NAME(parent_object_id)='dbo';
EXEC sys.sp_executesql @sql;

-- Domain PKs and FKs are varchar(32), including audit entity_id and OTP user_id.
SET @sql=N'';
SELECT @sql=@sql+N'UPDATE t SET '+QUOTENAME(c.name)+N'=m.new_code FROM dbo.'+QUOTENAME(t.name)
    +N' t JOIN #CodeMap m ON t.'+QUOTENAME(c.name)+N'=m.old_code;'
FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
WHERE SCHEMA_NAME(t.schema_id)='dbo' AND TYPE_NAME(c.user_type_id)='varchar' AND c.max_length=32
    AND t.name NOT LIKE 'flyway%' AND t.name<>'Id_Counter';
EXEC sys.sp_executesql @sql;

-- Update structured identifier references in saved recommendation snapshots, not free-text history.
DECLARE @old varchar(32),@new varchar(32);
DECLARE codes CURSOR LOCAL FAST_FORWARD FOR SELECT old_code,new_code FROM #CodeMap;
OPEN codes; FETCH NEXT FROM codes INTO @old,@new;
WHILE @@FETCH_STATUS=0
BEGIN
    UPDATE dbo.Training_Recommendation
    SET snapshot_json=REPLACE(snapshot_json,'"'+@old+'"','"'+@new+'"')
    WHERE CHARINDEX('"'+@old+'"',snapshot_json)>0;
    FETCH NEXT FROM codes INTO @old,@new;
END;
CLOSE codes; DEALLOCATE codes;

UPDATE dbo.Id_Counter SET prefix='HOR-' WHERE prefix='HRS-';
UPDATE dbo.Id_Counter SET prefix='HTR-' WHERE prefix='TR';
INSERT dbo.Id_Counter(prefix,next_value) VALUES ('OWN-',0),('VET-',0),('CM-',0);
ALTER TABLE dbo.Id_Counter ADD CONSTRAINT CK_IdCounter_ThreeDigits CHECK (next_value BETWEEN 0 AND 999);

CREATE TABLE dbo.Account_Role_Profile (
    profile_id varchar(32) NOT NULL CONSTRAINT PK_AccountRoleProfile PRIMARY KEY,
    user_id varchar(32) NOT NULL,
    role_name varchar(50) NOT NULL,
    CONSTRAINT UQ_AccountRoleProfile_UserRole UNIQUE(user_id,role_name),
    CONSTRAINT FK_AccountRoleProfile_User FOREIGN KEY(user_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_AccountRoleProfile_Role FOREIGN KEY(role_name) REFERENCES dbo.Role(role_name),
    CONSTRAINT CK_AccountRoleProfile_Code CHECK (
        (role_name='HORSE_OWNER' AND profile_id LIKE 'OWN-[0-9][0-9][0-9]' AND profile_id<>'OWN-000')
        OR (role_name='VETERINARIAN' AND profile_id LIKE 'VET-[0-9][0-9][0-9]' AND profile_id<>'VET-000')
        OR (role_name='CLUB_MANAGER' AND profile_id LIKE 'CM-[0-9][0-9][0-9]' AND profile_id<>'CM-000')
    )
);

-- Backfill independent profiles for existing accounts without changing USR identity.
;WITH ranked AS (
    SELECT u.user_id,r.role_name,
        CASE r.role_name WHEN 'HORSE_OWNER' THEN 'OWN-' WHEN 'VETERINARIAN' THEN 'VET-' ELSE 'CM-' END AS prefix,
        ROW_NUMBER() OVER(PARTITION BY r.role_name ORDER BY u.user_id) AS ordinal
    FROM dbo.[User] u JOIN dbo.Role r ON r.role_id=u.role_id
    WHERE r.role_name IN ('HORSE_OWNER','VETERINARIAN','CLUB_MANAGER')
)
INSERT dbo.Account_Role_Profile(profile_id,user_id,role_name)
SELECT prefix+RIGHT('000'+CAST(ordinal AS varchar(3)),3),user_id,role_name FROM ranked;
UPDATE c SET next_value=(SELECT COUNT(*) FROM dbo.Account_Role_Profile p WHERE p.profile_id LIKE c.prefix+'%')
FROM dbo.Id_Counter c WHERE c.prefix IN ('OWN-','VET-','CM-');

SET @sql=N'';
SELECT @sql=@sql+N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))+N'.'
    +QUOTENAME(OBJECT_NAME(parent_object_id))+N' WITH CHECK CHECK CONSTRAINT '+QUOTENAME(name)+N';'
FROM sys.foreign_keys WHERE OBJECT_SCHEMA_NAME(parent_object_id)='dbo';
EXEC sys.sp_executesql @sql;
DROP TABLE #CodeMap;
