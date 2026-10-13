SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.Email_Verification_OTP', N'U') IS NOT NULL
   AND (
       COL_LENGTH('dbo.Email_Verification_OTP', 'otp_id') IS NOT NULL
       OR COL_LENGTH('dbo.Email_Verification_OTP', 'sent_at') IS NULL
   )
BEGIN
    BEGIN TRANSACTION;

    CREATE TABLE dbo.Email_Verification_OTP_V5 (
        user_id int NOT NULL,
        otp_hash varchar(64) NOT NULL,
        expires_at datetime2 NOT NULL,
        sent_at datetime2 NOT NULL,
        attempt_count int NOT NULL
            CONSTRAINT DF_EmailVerificationOtpV5_AttemptCount DEFAULT 0,
        CONSTRAINT PK_Email_Verification_OTP_V5 PRIMARY KEY (user_id),
        CONSTRAINT FK_EmailVerificationOtpV5_User FOREIGN KEY (user_id)
            REFERENCES dbo.[User](user_id) ON DELETE CASCADE
    );

    IF COL_LENGTH('dbo.Email_Verification_OTP', 'otp_id') IS NOT NULL
    BEGIN
        EXEC sp_executesql N'
            WITH latest_otp AS (
                SELECT
                    user_id,
                    otp_hash,
                    expires_at,
                    COALESCE(created_at, SYSUTCDATETIME()) AS sent_at,
                    attempt_count,
                    ROW_NUMBER() OVER (
                        PARTITION BY user_id
                        ORDER BY created_at DESC, otp_id DESC
                    ) AS row_number
                FROM dbo.Email_Verification_OTP
                WHERE used_at IS NULL
                  AND LEN(otp_hash) <= 64
            )
            INSERT INTO dbo.Email_Verification_OTP_V5 (
                user_id, otp_hash, expires_at, sent_at, attempt_count
            )
            SELECT user_id, otp_hash, expires_at, sent_at, attempt_count
            FROM latest_otp
            WHERE row_number = 1;';
    END;

    DROP TABLE dbo.Email_Verification_OTP;
    EXEC sp_rename
        'dbo.Email_Verification_OTP_V5',
        'Email_Verification_OTP';

    COMMIT TRANSACTION;
END;
