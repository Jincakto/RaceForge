-- TEST FIXTURE ONLY: sequence-backed IDs used by the current BusinessIdGenerator.
-- Never apply to an existing application database or reset an existing sequence.
IF DB_NAME() NOT LIKE 'RaceForge%Test[_]%'
    THROW 51000, 'Disposable test database required for ID sequence fixtures.', 1;
IF OBJECT_ID('dbo.seq_business_HOR', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_HOR AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_OWN', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_OWN AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_VET', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_VET AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_HTR', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_HTR AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_CM', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_CM AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_PKG', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_PKG AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_MED', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_MED AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_ADM', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_ADM AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
IF OBJECT_ID('dbo.seq_business_GRM', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_business_GRM AS int START WITH 1 INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE;
