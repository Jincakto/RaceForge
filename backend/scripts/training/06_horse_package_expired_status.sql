-- Select the intended RaceForge database in SSMS before executing this file.
-- Manual change only: no Flyway required, no row updates and no new tables/columns.
SET XACT_ABORT ON;

IF OBJECT_ID('dbo.HORSE_PACKAGE', 'U') IS NULL
    THROW 51000, 'Select the database containing dbo.HORSE_PACKAGE first.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.HORSE_PACKAGE')
          AND name = 'CK_HORSE_PACKAGE_STATUS'
    )
        ALTER TABLE dbo.HORSE_PACKAGE DROP CONSTRAINT CK_HORSE_PACKAGE_STATUS;

    ALTER TABLE dbo.HORSE_PACKAGE WITH CHECK
    ADD CONSTRAINT CK_HORSE_PACKAGE_STATUS
    CHECK (status IN ('PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'EXPIRED'));

    COMMIT TRANSACTION;
    PRINT 'Horse package status constraint now allows EXPIRED.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
