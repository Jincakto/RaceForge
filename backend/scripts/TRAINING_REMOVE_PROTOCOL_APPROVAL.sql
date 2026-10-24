-- For an existing database when not applying Flyway V11 automatically.
USE RaceForge;
GO
-- Training only: package suggestions no longer require a veterinarian-approved protocol.
ALTER TABLE dbo.Training_Recommendation ALTER COLUMN protocol_id VARCHAR(20) NULL;
GO
