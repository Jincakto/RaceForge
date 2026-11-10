-- Explicitly removes retired package data; heart-rate recovery columns are untouched.
-- Stop before deleting anything if real Recovery registration/history is present.
SET XACT_ABORT ON;
IF EXISTS (SELECT 1 FROM dbo.HORSE_PACKAGE hp JOIN dbo.TRAINING_PACKAGE p
           ON p.package_id=hp.package_id WHERE p.package_type='RECOVERY')
    THROW 51000, 'Recovery registrations exist: review history before removal.', 1;
IF EXISTS (SELECT 1 FROM dbo.Training_Plan WHERE package_type='RECOVERY')
    THROW 51001, 'Recovery plan snapshots exist: review history before removal.', 1;
IF COL_LENGTH('dbo.HORSE_PACKAGE','replaced_horse_package_id') IS NOT NULL
    EXEC(N'IF EXISTS (SELECT 1 FROM dbo.HORSE_PACKAGE WHERE replaced_horse_package_id IS NOT NULL)
        THROW 51002, ''Package replacement history exists: review before removal.'', 1;');

DELETE s FROM dbo.Package_Stage_Template s
JOIN dbo.Package_Roadmap_Template r ON r.roadmap_template_id=s.roadmap_template_id
JOIN dbo.TRAINING_PACKAGE p ON p.package_id=r.package_id WHERE p.package_type='RECOVERY';
DELETE r FROM dbo.Package_Roadmap_Template r
JOIN dbo.TRAINING_PACKAGE p ON p.package_id=r.package_id WHERE p.package_type='RECOVERY';
DELETE FROM dbo.TRAINING_PACKAGE WHERE package_type='RECOVERY';

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_TRAINING_PACKAGE_TYPE'
           AND parent_object_id=OBJECT_ID('dbo.TRAINING_PACKAGE'))
    ALTER TABLE dbo.TRAINING_PACKAGE DROP CONSTRAINT CK_TRAINING_PACKAGE_TYPE;
ALTER TABLE dbo.TRAINING_PACKAGE WITH CHECK ADD CONSTRAINT CK_TRAINING_PACKAGE_TYPE
    CHECK (package_type IN ('BASIC','RACING','PERFORMANCE'));

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_TrainingPlan_PackageType'
           AND parent_object_id=OBJECT_ID('dbo.Training_Plan'))
    ALTER TABLE dbo.Training_Plan DROP CONSTRAINT CK_TrainingPlan_PackageType;
ALTER TABLE dbo.Training_Plan WITH CHECK ADD CONSTRAINT CK_TrainingPlan_PackageType
    CHECK (package_type IS NULL OR package_type IN ('BASIC','RACING','PERFORMANCE'));

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_HORSE_PACKAGE_REPLACED'
           AND parent_object_id=OBJECT_ID('dbo.HORSE_PACKAGE'))
    ALTER TABLE dbo.HORSE_PACKAGE DROP CONSTRAINT FK_HORSE_PACKAGE_REPLACED;
IF COL_LENGTH('dbo.HORSE_PACKAGE','replaced_horse_package_id') IS NOT NULL
    ALTER TABLE dbo.HORSE_PACKAGE DROP COLUMN replaced_horse_package_id;
