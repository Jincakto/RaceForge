-- Existing INT IDENTITY database only. No ID conversion, no table rebuild, no data deletion.
-- Uses a separate Flyway history; historical V0-V7 checksums are left unchanged.
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.[User]', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Role', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Email_Verification_OTP', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Training_Session', N'U') IS NULL
    THROW 51020, 'Import the complete RaceForge INT IDENTITY schema before starting this profile.', 1;

IF EXISTS (
    SELECT 1
    FROM (VALUES
        ('Role','role_id'),('User','user_id'),('Permission','permission_id'),
        ('Refresh_Token','refresh_token_id'),('Password_Reset_Token','reset_token_id'),
        ('Registration_Request','request_id'),('Notification','notification_id'),
        ('Training_Plan','plan_id'),('Training_Session','session_id')
    ) required(table_name, column_name)
    LEFT JOIN sys.tables t ON t.name=required.table_name AND t.schema_id=SCHEMA_ID('dbo')
    LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=required.column_name
    WHERE c.column_id IS NULL OR TYPE_NAME(c.user_type_id)<>'int' OR c.is_identity<>1
)
    THROW 51021, 'This application configuration requires INT IDENTITY primary keys; legacy IDs were not modified.', 1;

IF EXISTS (
    SELECT 1
    FROM (VALUES ('user_id'),('otp_hash'),('expires_at'),('sent_at'),('attempt_count')) required(column_name)
    LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(N'dbo.Email_Verification_OTP') AND c.name=required.column_name
    WHERE c.column_id IS NULL
)
    THROW 51022, 'Email_Verification_OTP must use user_id, otp_hash, expires_at, sent_at, attempt_count.', 1;

DECLARE @roles TABLE (role_id int NOT NULL, role_name varchar(50) NOT NULL);
INSERT INTO @roles VALUES
    (1,'CLUB_MANAGER'),(2,'HEAD_TRAINER'),(3,'VETERINARIAN'),
    (4,'GROOM'),(5,'HORSE_OWNER'),(6,'USER');

IF EXISTS (
    SELECT 1 FROM @roles expected JOIN dbo.Role actual
        ON actual.role_id=expected.role_id OR actual.role_name=expected.role_name
    WHERE actual.role_id<>expected.role_id OR actual.role_name<>expected.role_name
)
    THROW 51023, 'Role IDs differ from AccountConstants. Existing roles were not reassigned.', 1;

SET IDENTITY_INSERT dbo.Role ON;
INSERT INTO dbo.Role(role_id,role_name)
SELECT expected.role_id,expected.role_name FROM @roles expected
WHERE NOT EXISTS (SELECT 1 FROM dbo.Role actual WHERE actual.role_id=expected.role_id);
SET IDENTITY_INSERT dbo.Role OFF;
