ALTER TABLE dbo.TRAINING_PACKAGE ADD package_family_id varchar(20) NULL,
    version_number int NOT NULL CONSTRAINT DF_PACKAGE_VERSION DEFAULT 1,
    previous_package_id varchar(20) NULL,
    superseded bit NOT NULL CONSTRAINT DF_PACKAGE_SUPERSEDED DEFAULT 0;
UPDATE dbo.TRAINING_PACKAGE SET package_family_id=package_id;
ALTER TABLE dbo.TRAINING_PACKAGE ALTER COLUMN package_family_id varchar(20) NOT NULL;
ALTER TABLE dbo.TRAINING_PACKAGE ADD CONSTRAINT FK_PACKAGE_PREVIOUS FOREIGN KEY(previous_package_id) REFERENCES dbo.TRAINING_PACKAGE(package_id),
    CONSTRAINT CK_PACKAGE_VERSION CHECK(version_number>0),
    CONSTRAINT CK_PACKAGE_SUPERSEDED CHECK(superseded=0 OR status='INACTIVE');
CREATE UNIQUE INDEX UX_PACKAGE_FAMILY_VERSION ON dbo.TRAINING_PACKAGE(package_family_id,version_number);
CREATE UNIQUE INDEX UX_PACKAGE_CURRENT ON dbo.TRAINING_PACKAGE(package_family_id) WHERE superseded=0;
-- NULL on historical registrations preserves their original payment policy.
ALTER TABLE dbo.HORSE_PACKAGE ADD pending_expires_at_utc datetimeoffset NULL;
ALTER TABLE dbo.PayOS_Order ADD expires_at_utc datetimeoffset NULL,
    verified_paid_at_utc datetimeoffset NULL,
    review_required bit NOT NULL CONSTRAINT DF_PAYOS_REVIEW DEFAULT 0,
    application_error nvarchar(1000) NULL;
-- The canonical legacy schema did not include EXPIRED; retain all existing states.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.HORSE_PACKAGE') AND name='CK_HORSE_PACKAGE_STATUS')
    ALTER TABLE dbo.HORSE_PACKAGE DROP CONSTRAINT CK_HORSE_PACKAGE_STATUS;
ALTER TABLE dbo.HORSE_PACKAGE ADD CONSTRAINT CK_HORSE_PACKAGE_STATUS CHECK(status IN ('PENDING','ACTIVE','PAUSED','COMPLETED','CANCELLED','EXPIRED'));
