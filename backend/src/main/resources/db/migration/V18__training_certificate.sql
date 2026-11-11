CREATE TABLE dbo.Training_Certificate (
    horse_package_id varchar(20) NOT NULL CONSTRAINT PK_Training_Certificate PRIMARY KEY,
    certificate_number varchar(23) NOT NULL CONSTRAINT UQ_Training_Certificate_Number UNIQUE,
    horse_name_at_issue nvarchar(100) NOT NULL,
    issue_date date NOT NULL,
    CONSTRAINT FK_Training_Certificate_Horse_Package FOREIGN KEY (horse_package_id)
        REFERENCES dbo.HORSE_PACKAGE (horse_package_id)
);
