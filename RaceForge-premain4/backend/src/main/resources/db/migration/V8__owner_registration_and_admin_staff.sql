-- ADMIN is distinct from CLUB_MANAGER; never promote existing staff automatically.
IF EXISTS (SELECT 1 FROM dbo.[Role] WHERE role_id = 7 AND role_name <> 'ADMIN')
    THROW 50001, 'Role ID 7 is occupied; resolve the role mapping before migration.', 1;
IF EXISTS (SELECT 1 FROM dbo.[Role] WHERE role_name = 'ADMIN' AND role_id <> 7)
    THROW 50001, 'ADMIN has an unexpected role ID; resolve the role mapping before migration.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.[Role] WHERE role_id = 7)
BEGIN
    SET IDENTITY_INSERT dbo.[Role] ON;
    INSERT dbo.[Role](role_id, role_name) VALUES (7, 'ADMIN');
    SET IDENTITY_INSERT dbo.[Role] OFF;
END;

ALTER TABLE dbo.Password_Reset_Token ADD purpose varchar(30) NOT NULL
    CONSTRAINT DF_Password_Reset_Token_Purpose DEFAULT 'PASSWORD_RESET';
GO
ALTER TABLE dbo.Password_Reset_Token ADD CONSTRAINT CK_Password_Reset_Token_Purpose
    CHECK (purpose IN ('PASSWORD_RESET', 'STAFF_INVITATION'));

-- Preserve the review history, but close the old path for requesting staff roles.
UPDATE dbo.Registration_Request
SET status = 'REJECTED', reviewed_at = SYSUTCDATETIME(),
    review_note = N'Public role requests retired. Staff accounts must be created by an administrator.'
WHERE status = 'PENDING';

-- Legacy public accounts become owners; approved staff and disabled/rejected statuses remain intact.
UPDATE dbo.[User]
SET role_id = 5,
    status = CASE WHEN status = 'PENDING' THEN CASE WHEN email_verified = 1 THEN 'ACTIVE' ELSE 'UNVERIFIED' END ELSE status END,
    requested_role_id = NULL
WHERE role_id = 6;
UPDATE dbo.[User] SET requested_role_id = NULL WHERE requested_role_id IS NOT NULL;
