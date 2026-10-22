IF COL_LENGTH('dbo.HORSE_PACKAGE', 'payment_status') IS NULL
BEGIN
    ALTER TABLE dbo.HORSE_PACKAGE
    ADD payment_status varchar(20) NOT NULL
        CONSTRAINT DF_HORSE_PACKAGE_payment_status DEFAULT 'PENDING' WITH VALUES;
END;

IF COL_LENGTH('dbo.HORSE_PACKAGE', 'paid_at') IS NULL
BEGIN
    ALTER TABLE dbo.HORSE_PACKAGE
    ADD paid_at datetime NULL;
END;

IF COL_LENGTH('dbo.HORSE_PACKAGE', 'remaining_days') IS NULL
BEGIN
    ALTER TABLE dbo.HORSE_PACKAGE
    ADD remaining_days int NULL;
END;
