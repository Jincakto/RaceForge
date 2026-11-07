CREATE TABLE dbo.PayOS_Order (
    order_code bigint NOT NULL PRIMARY KEY,
    horse_package_id varchar(20) NOT NULL UNIQUE REFERENCES dbo.HORSE_PACKAGE(horse_package_id),
    amount bigint NOT NULL CHECK (amount > 0),
    checkout_url nvarchar(1000) NULL,
    link_id varchar(64) NULL,
    payment_state varchar(16) NOT NULL DEFAULT 'PENDING',
    applied bit NOT NULL DEFAULT 0
);
