-- SQL Server compiles a batch before executing it. Keep column creation in
-- separate GO batches from statements that use those columns. Existence checks
-- also support schemas that were updated manually before Flyway ran.
IF COL_LENGTH('dbo.TRAINING_PACKAGE', 'package_family_id') IS NULL
    ALTER TABLE dbo.TRAINING_PACKAGE ADD package_family_id varchar(20) NULL;
IF COL_LENGTH('dbo.TRAINING_PACKAGE', 'version_number') IS NULL
    ALTER TABLE dbo.TRAINING_PACKAGE ADD version_number int NOT NULL CONSTRAINT DF_PACKAGE_VERSION DEFAULT 1;
IF COL_LENGTH('dbo.TRAINING_PACKAGE', 'previous_package_id') IS NULL
    ALTER TABLE dbo.TRAINING_PACKAGE ADD previous_package_id varchar(20) NULL;
IF COL_LENGTH('dbo.TRAINING_PACKAGE', 'superseded') IS NULL
    ALTER TABLE dbo.TRAINING_PACKAGE ADD superseded bit NOT NULL CONSTRAINT DF_PACKAGE_SUPERSEDED DEFAULT 0;
GO

-- Preserve existing version families on manually migrated databases.
UPDATE dbo.TRAINING_PACKAGE SET package_family_id=package_id WHERE package_family_id IS NULL;
GO
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRAINING_PACKAGE')
           AND name='package_family_id' AND is_nullable=1)
    ALTER TABLE dbo.TRAINING_PACKAGE ALTER COLUMN package_family_id varchar(20) NOT NULL;
GO

IF OBJECT_ID('dbo.FK_PACKAGE_PREVIOUS', 'F') IS NULL
    ALTER TABLE dbo.TRAINING_PACKAGE ADD CONSTRAINT FK_PACKAGE_PREVIOUS
        FOREIGN KEY(previous_package_id) REFERENCES dbo.TRAINING_PACKAGE(package_id);
IF OBJECT_ID('dbo.CK_PACKAGE_VERSION', 'C') IS NULL
    ALTER TABLE dbo.TRAINING_PACKAGE ADD CONSTRAINT CK_PACKAGE_VERSION CHECK(version_number>0);
IF OBJECT_ID('dbo.CK_PACKAGE_SUPERSEDED', 'C') IS NULL
    ALTER TABLE dbo.TRAINING_PACKAGE ADD CONSTRAINT CK_PACKAGE_SUPERSEDED CHECK(superseded=0 OR status='INACTIVE');
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.TRAINING_PACKAGE') AND name='UX_PACKAGE_FAMILY_VERSION')
    CREATE UNIQUE INDEX UX_PACKAGE_FAMILY_VERSION ON dbo.TRAINING_PACKAGE(package_family_id,version_number);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.TRAINING_PACKAGE') AND name='UX_PACKAGE_CURRENT')
    CREATE UNIQUE INDEX UX_PACKAGE_CURRENT ON dbo.TRAINING_PACKAGE(package_family_id) WHERE superseded=0;
GO

-- NULL on historical registrations preserves their original payment policy.
IF COL_LENGTH('dbo.HORSE_PACKAGE', 'pending_expires_at_utc') IS NULL
    ALTER TABLE dbo.HORSE_PACKAGE ADD pending_expires_at_utc datetimeoffset NULL;
IF COL_LENGTH('dbo.PayOS_Order', 'expires_at_utc') IS NULL
    ALTER TABLE dbo.PayOS_Order ADD expires_at_utc datetimeoffset NULL;
IF COL_LENGTH('dbo.PayOS_Order', 'verified_paid_at_utc') IS NULL
    ALTER TABLE dbo.PayOS_Order ADD verified_paid_at_utc datetimeoffset NULL;
IF COL_LENGTH('dbo.PayOS_Order', 'review_required') IS NULL
    ALTER TABLE dbo.PayOS_Order ADD review_required bit NOT NULL CONSTRAINT DF_PAYOS_REVIEW DEFAULT 0;
IF COL_LENGTH('dbo.PayOS_Order', 'application_error') IS NULL
    ALTER TABLE dbo.PayOS_Order ADD application_error nvarchar(1000) NULL;
GO

IF OBJECT_ID('dbo.CK_HORSE_PACKAGE_STATUS', 'C') IS NOT NULL
    ALTER TABLE dbo.HORSE_PACKAGE DROP CONSTRAINT CK_HORSE_PACKAGE_STATUS;
GO
ALTER TABLE dbo.HORSE_PACKAGE ADD CONSTRAINT CK_HORSE_PACKAGE_STATUS
    CHECK(status IN ('PENDING','ACTIVE','PAUSED','COMPLETED','CANCELLED','EXPIRED'));
GO
