-- N staff invitation contract; additive, no existing records reset.
SET XACT_ABORT ON;
IF COL_LENGTH('dbo.Password_Reset_Token','purpose') IS NULL
 EXEC(N'ALTER TABLE dbo.Password_Reset_Token ADD purpose varchar(30) NOT NULL CONSTRAINT DF_PasswordResetToken_Purpose DEFAULT ''PASSWORD_RESET'' WITH VALUES');
