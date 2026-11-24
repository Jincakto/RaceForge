-- Required by Revenue Reports and read-only Payment Monitor.
-- Older installations may have added this column manually; never replace existing values.
IF OBJECT_ID('dbo.PayOS_Order', 'U') IS NOT NULL
    AND COL_LENGTH('dbo.PayOS_Order', 'confirmed_at_utc') IS NULL
BEGIN
    ALTER TABLE dbo.PayOS_Order ADD confirmed_at_utc datetime2(7) NULL;
END;
-- Historical PAID transactions intentionally remain undated (no invented timestamp).
