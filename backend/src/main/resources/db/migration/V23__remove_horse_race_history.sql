-- Race History is retired. Back up this table before applying V23 if its data is needed.
-- Keep old Flyway migrations and audit history unchanged.
IF OBJECT_ID(N'dbo.HORSE_RACE_HISTORY', N'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.foreign_keys
               WHERE referenced_object_id = OBJECT_ID(N'dbo.HORSE_RACE_HISTORY')
                 AND parent_object_id <> referenced_object_id)
        THROW 51023, 'Unexpected foreign key references HORSE_RACE_HISTORY; review before removal.', 1;

    DROP TABLE dbo.HORSE_RACE_HISTORY;
END;
