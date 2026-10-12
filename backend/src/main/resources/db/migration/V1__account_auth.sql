IF OBJECT_ID(N'[Role]', N'U') IS NULL
BEGIN
    CREATE TABLE [Role] (
        role_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE
    );
END;

-- ============================================================
-- 2. USER
-- ============================================================

IF OBJECT_ID(N'[User]', N'U') IS NULL
BEGIN
    CREATE TABLE [User] (
        user_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        role_id INT NULL,
        requested_role_id INT NULL,
        full_name NVARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        phone VARCHAR(20) NULL,
        status VARCHAR(20) NOT NULL,
        email_verified BIT NOT NULL
            CONSTRAINT DF_User_email_verified DEFAULT 0,
        avatar_url NVARCHAR(500) NULL,
        auth_provider VARCHAR(20) NOT NULL
            CONSTRAINT DF_User_AuthProvider DEFAULT 'LOCAL',
        google_subject VARCHAR(255) NULL,

        CONSTRAINT FK_User_Role
            FOREIGN KEY (role_id)
            REFERENCES [Role](role_id)
    );
END;

-- Add missing columns to an existing User table.

IF COL_LENGTH('[User]', 'email_verified') IS NULL
    ALTER TABLE [User]
    ADD email_verified BIT NOT NULL
        CONSTRAINT DF_User_email_verified DEFAULT 0 WITH VALUES;

IF COL_LENGTH('[User]', 'avatar_url') IS NULL
    ALTER TABLE [User]
    ADD avatar_url NVARCHAR(500) NULL;

IF COL_LENGTH('[User]', 'requested_role_id') IS NULL
    ALTER TABLE [User]
    ADD requested_role_id INT NULL;

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[User]')
      AND name = 'password'
      AND is_nullable = 0
)
    ALTER TABLE [User]
    ALTER COLUMN password VARCHAR(255) NULL;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_User_RequestedRole'
)
    ALTER TABLE [User]
    ADD CONSTRAINT FK_User_RequestedRole
        FOREIGN KEY (requested_role_id)
        REFERENCES [Role](role_id);

-- ============================================================
-- 3. INITIAL ROLES
-- ============================================================

-- Check for conflicting role IDs.

IF EXISTS (
    SELECT 1
    FROM [Role]
    WHERE role_id IN (1, 2, 3, 4, 5)
      AND role_name NOT IN (
          'CLUB_MANAGER',
          'HEAD_TRAINER',
          'VETERINARIAN',
          'GROOM',
          'HORSE_OWNER'
      )
)
    THROW 51001,
        'Existing Role IDs conflict with canonical role IDs.',
        1;

IF COLUMNPROPERTY(
    OBJECT_ID(N'dbo.[Role]'),
    'role_id',
    'IsIdentity'
) = 1
BEGIN
    SET IDENTITY_INSERT [Role] ON;

    INSERT INTO [Role] (role_id, role_name)
    SELECT src.role_id, src.role_name
    FROM (
        VALUES
            (1, 'CLUB_MANAGER'),
            (2, 'HEAD_TRAINER'),
            (3, 'VETERINARIAN'),
            (4, 'GROOM'),
            (5, 'HORSE_OWNER')
    ) src(role_id, role_name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM [Role] r
        WHERE r.role_id = src.role_id
           OR r.role_name = src.role_name
    );

    SET IDENTITY_INSERT [Role] OFF;
END
ELSE
BEGIN
    INSERT INTO [Role] (role_id, role_name)
    SELECT src.role_id, src.role_name
    FROM (
        VALUES
            (1, 'CLUB_MANAGER'),
            (2, 'HEAD_TRAINER'),
            (3, 'VETERINARIAN'),
            (4, 'GROOM'),
            (5, 'HORSE_OWNER')
    ) src(role_id, role_name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM [Role] r
        WHERE r.role_id = src.role_id
           OR r.role_name = src.role_name
    );
END;

-- ============================================================
-- 4. PERMISSION
-- ============================================================

IF OBJECT_ID(N'[Permission]', N'U') IS NULL
BEGIN
    CREATE TABLE [Permission] (
        permission_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        permission_name VARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(500) NULL
    );
END;

-- ============================================================
-- 5. ROLE_PERMISSION
-- ============================================================

IF OBJECT_ID(N'[Role_Permission]', N'U') IS NULL
BEGIN
    CREATE TABLE [Role_Permission] (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,

        CONSTRAINT PK_Role_Permission
            PRIMARY KEY (role_id, permission_id),

        CONSTRAINT FK_RolePermission_Role
            FOREIGN KEY (role_id)
            REFERENCES [Role](role_id),

        CONSTRAINT FK_RolePermission_Permission
            FOREIGN KEY (permission_id)
            REFERENCES [Permission](permission_id)
    );
END;

-- ============================================================
-- 6. REFRESH TOKEN
-- ============================================================

IF OBJECT_ID(N'[Refresh_Token]', N'U') IS NULL
BEGIN
    CREATE TABLE [Refresh_Token] (
        refresh_token_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME2 NOT NULL,
        revoked_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_RefreshToken_created
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_RefreshToken_User
            FOREIGN KEY (user_id)
            REFERENCES [User](user_id)
    );
END;

-- ============================================================
-- 7. PASSWORD RESET TOKEN
-- ============================================================

IF OBJECT_ID(N'[Password_Reset_Token]', N'U') IS NULL
BEGIN
    CREATE TABLE [Password_Reset_Token] (
        reset_token_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME2 NOT NULL,
        used_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_PasswordResetToken_created
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_PasswordResetToken_User
            FOREIGN KEY (user_id)
            REFERENCES [User](user_id)
    );
END;

-- ============================================================
-- 8. REGISTRATION REQUEST
-- ============================================================

IF OBJECT_ID(N'[Registration_Request]', N'U') IS NULL
BEGIN
    CREATE TABLE [Registration_Request] (
        request_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        requested_role_id INT NOT NULL,
        status VARCHAR(20) NOT NULL
            CONSTRAINT DF_RegistrationRequest_status
            DEFAULT 'PENDING',
        reviewed_by INT NULL,
        reviewed_at DATETIME2 NULL,
        review_note NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_RegistrationRequest_created
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_RegistrationRequest_User
            FOREIGN KEY (user_id)
            REFERENCES [User](user_id),

        CONSTRAINT FK_RegistrationRequest_Role
            FOREIGN KEY (requested_role_id)
            REFERENCES [Role](role_id),

        CONSTRAINT FK_RegistrationRequest_Reviewer
            FOREIGN KEY (reviewed_by)
            REFERENCES [User](user_id),

        CONSTRAINT CK_RegistrationRequest_status
            CHECK (status IN (
                'PENDING',
                'APPROVED',
                'REJECTED'
            ))
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.[Registration_Request]')
      AND name IN (
          'UX_RegistrationRequest_User_Pending',
          'UX_RegistrationRequest_Pending'
      )
)
    CREATE UNIQUE INDEX UX_RegistrationRequest_User_Pending
    ON [Registration_Request](user_id)
    WHERE status = 'PENDING';

-- ============================================================
-- 9. EMAIL VERIFICATION OTP
-- ============================================================

IF OBJECT_ID(N'[Email_Verification_OTP]', N'U') IS NULL
BEGIN
    CREATE TABLE [Email_Verification_OTP] (
        otp_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        used_at DATETIME2 NULL,
        attempt_count INT NOT NULL
            CONSTRAINT DF_EmailOtp_attempts DEFAULT 0,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_EmailOtp_created
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_EmailOtp_User
            FOREIGN KEY (user_id)
            REFERENCES [User](user_id)
    );
END;

-- ============================================================
-- 10. USER EXTERNAL LOGIN
-- ============================================================

IF OBJECT_ID(N'[User_External_Login]', N'U') IS NULL
BEGIN
    CREATE TABLE [User_External_Login] (
        external_login_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        provider VARCHAR(20) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_UserExternalLogin_created
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_UserExternalLogin_User
            FOREIGN KEY (user_id)
            REFERENCES [User](user_id),

        CONSTRAINT UX_UserExternalLogin_ProviderUser
            UNIQUE (provider, provider_user_id),

        CONSTRAINT UX_UserExternalLogin_UserProvider
            UNIQUE (user_id, provider)
    );
END;

-- ============================================================
-- 11. NOTIFICATION
-- ============================================================

IF OBJECT_ID(N'[Notification]', N'U') IS NULL
BEGIN
    CREATE TABLE [Notification] (
        notification_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(1000) NOT NULL,
        is_read BIT NOT NULL
            CONSTRAINT DF_Notification_is_read DEFAULT 0,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_Notification_created
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Notification_User
            FOREIGN KEY (user_id)
            REFERENCES [User](user_id)
    );
END;

-- ============================================================
-- 12. AUDIT LOG
-- ============================================================

IF OBJECT_ID(N'[Audit_Log]', N'U') IS NULL
BEGIN
    CREATE TABLE [Audit_Log] (
        audit_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NULL,
        horse_id INT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INT NULL,
        result VARCHAR(50) NOT NULL,
        reason NVARCHAR(1000) NULL,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_AuditLog_created
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_AuditLog_User
            FOREIGN KEY (user_id)
            REFERENCES [User](user_id)
    );
END;