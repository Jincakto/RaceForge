IF OBJECT_ID(N'dbo.Email_Verification_OTP', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Email_Verification_OTP (
        user_id int NOT NULL,
        otp_hash varchar(64) NOT NULL,
        expires_at datetime2 NOT NULL,
        sent_at datetime2 NOT NULL,
        attempt_count int NOT NULL
            CONSTRAINT DF_EmailVerificationOtp_AttemptCount DEFAULT 0,
        CONSTRAINT PK_Email_Verification_OTP PRIMARY KEY (user_id),
        CONSTRAINT FK_EmailVerificationOtp_User FOREIGN KEY (user_id)
            REFERENCES dbo.[User](user_id) ON DELETE CASCADE
    );
END;

IF COL_LENGTH('dbo.[User]', 'otp_hash') IS NOT NULL
   AND COL_LENGTH('dbo.[User]', 'otp_expires_at') IS NOT NULL
BEGIN
    INSERT INTO dbo.Email_Verification_OTP (
        user_id, otp_hash, expires_at, sent_at, attempt_count
    )
    SELECT
        u.user_id,
        u.otp_hash,
        u.otp_expires_at,
        COALESCE(u.otp_sent_at, SYSUTCDATETIME()),
        COALESCE(u.otp_attempt_count, 0)
    FROM dbo.[User] u
    WHERE u.otp_hash IS NOT NULL
      AND u.otp_expires_at IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.Email_Verification_OTP o
          WHERE o.user_id = u.user_id
      );
END;

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.[User]')
      AND name = N'UX_User_GoogleSubject'
)
    DROP INDEX UX_User_GoogleSubject ON dbo.[User];

IF EXISTS (
    SELECT 1 FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.[User]')
      AND name = N'DF_User_OtpAttempts'
)
    ALTER TABLE dbo.[User] DROP CONSTRAINT DF_User_OtpAttempts;

IF COL_LENGTH('dbo.[User]', 'google_subject') IS NOT NULL
    ALTER TABLE dbo.[User] DROP COLUMN google_subject;
IF COL_LENGTH('dbo.[User]', 'google_linked_at') IS NOT NULL
    ALTER TABLE dbo.[User] DROP COLUMN google_linked_at;
IF COL_LENGTH('dbo.[User]', 'otp_hash') IS NOT NULL
    ALTER TABLE dbo.[User] DROP COLUMN otp_hash;
IF COL_LENGTH('dbo.[User]', 'otp_expires_at') IS NOT NULL
    ALTER TABLE dbo.[User] DROP COLUMN otp_expires_at;
IF COL_LENGTH('dbo.[User]', 'otp_sent_at') IS NOT NULL
    ALTER TABLE dbo.[User] DROP COLUMN otp_sent_at;
IF COL_LENGTH('dbo.[User]', 'otp_attempt_count') IS NOT NULL
    ALTER TABLE dbo.[User] DROP COLUMN otp_attempt_count;
