-- Empty-database bootstrap for the legacy schema expected by V1/V2.
-- Existing installations baselined at version 0 skip this migration.
CREATE TABLE dbo.[Role] (
    role_id varchar(20) NOT NULL CONSTRAINT PK_Role PRIMARY KEY,
    role_name varchar(50) NOT NULL CONSTRAINT UQ_Role_Name UNIQUE
);
CREATE TABLE dbo.[User] (
    user_id varchar(20) NOT NULL CONSTRAINT PK_User PRIMARY KEY,
    role_id varchar(20) NULL,
    full_name nvarchar(150) NOT NULL,
    email varchar(255) NOT NULL CONSTRAINT UQ_User_Email UNIQUE,
    password varchar(255) NULL,
    phone varchar(20) NULL,
    status varchar(20) NOT NULL,
    CONSTRAINT FK_User_Role FOREIGN KEY(role_id) REFERENCES dbo.[Role](role_id)
);
CREATE TABLE dbo.Horse (
    horse_id varchar(20) NOT NULL CONSTRAINT PK_Horse PRIMARY KEY,
    owner_id varchar(20) NOT NULL,
    head_trainer_id varchar(20) NULL,
    horse_name nvarchar(100) NOT NULL,
    date_of_birth date NULL,
    gender varchar(20) NULL,
    breed nvarchar(100) NULL,
    coat_color nvarchar(50) NULL,
    sire nvarchar(100) NULL,
    dam nvarchar(100) NULL,
    dam_sire nvarchar(100) NULL,
    weight decimal(8,2) NULL,
    height decimal(6,2) NULL,
    background nvarchar(1000) NULL,
    declared_medical_history nvarchar(1000) NULL,
    image_url nvarchar(500) NULL,
    health_status varchar(30) NULL,
    training_locked bit NOT NULL CONSTRAINT DF_Horse_TrainingLocked DEFAULT 0,
    status varchar(20) NOT NULL,
    CONSTRAINT FK_Horse_Owner FOREIGN KEY(owner_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_Horse_HeadTrainer FOREIGN KEY(head_trainer_id) REFERENCES dbo.[User](user_id)
);
CREATE TABLE dbo.Health_Profile (
    profile_id varchar(20) NOT NULL CONSTRAINT PK_Health_Profile PRIMARY KEY,
    horse_id varchar(20) NOT NULL CONSTRAINT UQ_HealthProfile_Horse UNIQUE,
    created_at datetime2 NOT NULL CONSTRAINT DF_HealthProfile_Created DEFAULT SYSDATETIME(),
    updated_at datetime2 NOT NULL CONSTRAINT DF_HealthProfile_Updated DEFAULT SYSDATETIME(),
    CONSTRAINT FK_HealthProfile_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id)
);
CREATE TABLE dbo.Medical_Record (
    medical_record_id varchar(20) NOT NULL CONSTRAINT PK_Medical_Record PRIMARY KEY,
    profile_id varchar(20) NOT NULL,
    veterinarian_id varchar(20) NOT NULL,
    correction_of_id varchar(20) NULL,
    exam_type varchar(30) NOT NULL,
    examined_at datetime2 NOT NULL CONSTRAINT DF_MedicalRecord_Examined DEFAULT SYSDATETIME(),
    health_status varchar(30) NULL,
    diagnosis nvarchar(1000) NULL,
    treatment nvarchar(1000) NULL,
    medication nvarchar(1000) NULL,
    care_recommendation nvarchar(1000) NULL,
    notes nvarchar(1000) NULL,
    system_note nvarchar(1000) NULL,
    training_note nvarchar(1000) NULL,
    status varchar(20) NOT NULL CONSTRAINT DF_MedicalRecord_Status DEFAULT 'DRAFT',
    confirmed_at datetime2 NULL,
    created_at datetime2 NOT NULL CONSTRAINT DF_MedicalRecord_Created DEFAULT SYSDATETIME(),
    updated_at datetime2 NOT NULL CONSTRAINT DF_MedicalRecord_Updated DEFAULT SYSDATETIME(),
    CONSTRAINT FK_MedicalRecord_Profile FOREIGN KEY(profile_id) REFERENCES dbo.Health_Profile(profile_id),
    CONSTRAINT FK_MedicalRecord_Veterinarian FOREIGN KEY(veterinarian_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_MedicalRecord_Correction FOREIGN KEY(correction_of_id) REFERENCES dbo.Medical_Record(medical_record_id)
);
CREATE TABLE dbo.Medical_Clinical_Exam (
    clinical_exam_id varchar(20) NOT NULL CONSTRAINT PK_Medical_Clinical_Exam PRIMARY KEY,
    medical_record_id varchar(20) NOT NULL,
    examination_area varchar(50) NOT NULL,
    condition_status varchar(20) NOT NULL,
    abnormality_type nvarchar(100) NULL,
    severity varchar(20) NULL,
    notes nvarchar(500) NULL,
    CONSTRAINT FK_MedicalClinicalExam_Record FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id)
);
CREATE TABLE dbo.Medical_Vital_Sign (
    vital_sign_id varchar(20) NOT NULL CONSTRAINT PK_Medical_Vital_Sign PRIMARY KEY,
    medical_record_id varchar(20) NOT NULL CONSTRAINT UQ_MedicalVitalSign_Record UNIQUE,
    body_temperature decimal(4,1) NULL,
    resting_heart_rate int NULL,
    resting_respiratory_rate int NULL,
    CONSTRAINT FK_MedicalVitalSign_Record FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id)
);
CREATE TABLE dbo.Training_Lock (
    lock_id varchar(20) NOT NULL CONSTRAINT PK_Training_Lock PRIMARY KEY,
    horse_id varchar(20) NOT NULL,
    medical_record_id varchar(20) NULL,
    locked_by varchar(20) NOT NULL,
    unlocked_by varchar(20) NULL,
    locked_at datetime2 NOT NULL,
    lock_reason nvarchar(1000) NOT NULL,
    unlocked_at datetime2 NULL,
    unlock_reason nvarchar(1000) NULL,
    CONSTRAINT FK_TrainingLock_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
    CONSTRAINT FK_TrainingLock_MedicalRecord FOREIGN KEY(medical_record_id) REFERENCES dbo.Medical_Record(medical_record_id),
    CONSTRAINT FK_TrainingLock_LockedBy FOREIGN KEY(locked_by) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_TrainingLock_UnlockedBy FOREIGN KEY(unlocked_by) REFERENCES dbo.[User](user_id)
);
CREATE TABLE dbo.HORSE_RACE_HISTORY (
    race_history_id varchar(20) NOT NULL CONSTRAINT PK_HORSE_RACE_HISTORY PRIMARY KEY,
    horse_id varchar(20) NOT NULL,
    race_name nvarchar(150) NOT NULL,
    race_date date NULL,
    distance int NULL CONSTRAINT CK_RaceHistory_Distance CHECK(distance IS NULL OR distance>0),
    finish_position int NULL CONSTRAINT CK_RaceHistory_Position CHECK(finish_position IS NULL OR finish_position>0),
    completion_time varchar(20) NULL,
    racecourse nvarchar(150) NULL,
    jockey_name nvarchar(100) NULL,
    prize decimal(15,2) NULL CONSTRAINT CK_RaceHistory_Prize CHECK(prize IS NULL OR prize>=0),
    created_at datetime NOT NULL CONSTRAINT DF_RaceHistory_Created DEFAULT GETDATE(),
    updated_at datetime NOT NULL CONSTRAINT DF_RaceHistory_Updated DEFAULT GETDATE(),
    CONSTRAINT FK_RaceHistory_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id)
);
CREATE TABLE dbo.Training_Plan (
    plan_id varchar(20) NOT NULL CONSTRAINT PK_Training_Plan PRIMARY KEY,
    created_by varchar(20) NOT NULL,
    plan_name nvarchar(150) NOT NULL,
    goal nvarchar(500) NULL,
    duration int NULL,
    status varchar(20) NOT NULL,
    notes nvarchar(1000) NULL,
    CONSTRAINT FK_TrainingPlan_CreatedBy FOREIGN KEY(created_by) REFERENCES dbo.[User](user_id)
);
CREATE TABLE dbo.Horse_Plan (
    plan_id varchar(20) NOT NULL,
    horse_id varchar(20) NOT NULL,
    start_date date NULL,
    end_date date NULL,
    status varchar(20) NOT NULL,
    notes nvarchar(1000) NULL,
    CONSTRAINT PK_Horse_Plan PRIMARY KEY(plan_id,horse_id),
    CONSTRAINT FK_HorsePlan_Plan FOREIGN KEY(plan_id) REFERENCES dbo.Training_Plan(plan_id),
    CONSTRAINT FK_HorsePlan_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id)
);
CREATE TABLE dbo.Training_Session (
    session_id varchar(20) NOT NULL CONSTRAINT PK_Training_Session PRIMARY KEY,
    plan_id varchar(20) NOT NULL,
    horse_id varchar(20) NOT NULL,
    scheduled_start datetime2 NOT NULL,
    scheduled_end datetime2 NULL,
    distance decimal(8,2) NULL,
    intensity varchar(30) NULL,
    surface nvarchar(100) NULL,
    status varchar(20) NOT NULL,
    actual_start datetime2 NULL,
    actual_end datetime2 NULL,
    evaluation nvarchar(1000) NULL,
    notes nvarchar(1000) NULL,
    CONSTRAINT FK_TrainingSession_HorsePlan FOREIGN KEY(plan_id,horse_id) REFERENCES dbo.Horse_Plan(plan_id,horse_id)
);
CREATE TABLE dbo.TRAINING_PACKAGE (
    package_id varchar(20) NOT NULL CONSTRAINT PK_TRAINING_PACKAGE PRIMARY KEY,
    package_name nvarchar(100) NOT NULL,
    package_type varchar(30) NOT NULL CONSTRAINT CK_TRAINING_PACKAGE_TYPE CHECK(package_type IN ('BASIC','RACING','PERFORMANCE','RECOVERY')),
    description nvarchar(500) NULL,
    duration_days int NOT NULL CONSTRAINT CK_TRAINING_PACKAGE_DURATION CHECK(duration_days>0),
    price decimal(12,2) NOT NULL CONSTRAINT CK_TRAINING_PACKAGE_PRICE CHECK(price>=0),
    status varchar(20) NOT NULL CONSTRAINT DF_TrainingPackage_Status DEFAULT 'ACTIVE'
        CONSTRAINT CK_TRAINING_PACKAGE_STATUS CHECK(status IN ('ACTIVE','INACTIVE')),
    created_at datetime NOT NULL CONSTRAINT DF_TrainingPackage_Created DEFAULT GETDATE(),
    updated_at datetime NOT NULL CONSTRAINT DF_TrainingPackage_Updated DEFAULT GETDATE()
);
CREATE TABLE dbo.HORSE_PACKAGE (
    horse_package_id varchar(20) NOT NULL CONSTRAINT PK_HORSE_PACKAGE PRIMARY KEY,
    horse_id varchar(20) NOT NULL,
    package_id varchar(20) NOT NULL,
    registered_at datetime NOT NULL CONSTRAINT DF_HorsePackage_Registered DEFAULT GETDATE(),
    start_date date NULL,
    end_date date NULL,
    status varchar(20) NOT NULL CONSTRAINT DF_HorsePackage_Status DEFAULT 'PENDING'
        CONSTRAINT CK_HORSE_PACKAGE_STATUS CHECK(status IN ('PENDING','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
    total_price decimal(12,2) NOT NULL CONSTRAINT CK_HORSE_PACKAGE_PRICE CHECK(total_price>=0),
    paused_at datetime NULL,
    pause_reason nvarchar(255) NULL,
    replaced_horse_package_id varchar(20) NULL,
    created_at datetime NOT NULL CONSTRAINT DF_HorsePackage_Created DEFAULT GETDATE(),
    updated_at datetime NOT NULL CONSTRAINT DF_HorsePackage_Updated DEFAULT GETDATE(),
    CONSTRAINT CK_HORSE_PACKAGE_DATE CHECK(end_date IS NULL OR start_date IS NULL OR end_date>=start_date),
    CONSTRAINT FK_HORSE_PACKAGE_HORSE FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
    CONSTRAINT FK_HORSE_PACKAGE_PACKAGE FOREIGN KEY(package_id) REFERENCES dbo.TRAINING_PACKAGE(package_id),
    CONSTRAINT FK_HORSE_PACKAGE_REPLACED FOREIGN KEY(replaced_horse_package_id) REFERENCES dbo.HORSE_PACKAGE(horse_package_id)
);
CREATE TABLE dbo.Care_Task (
    care_task_id varchar(20) NOT NULL CONSTRAINT PK_Care_Task PRIMARY KEY,
    horse_id varchar(20) NOT NULL,
    assigned_to varchar(20) NOT NULL,
    assigned_by varchar(20) NOT NULL,
    task_type nvarchar(100) NOT NULL,
    scheduled_at datetime2 NOT NULL,
    status varchar(20) NOT NULL,
    completed_at datetime2 NULL,
    notes nvarchar(1000) NULL,
    CONSTRAINT FK_CareTask_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
    CONSTRAINT FK_CareTask_AssignedTo FOREIGN KEY(assigned_to) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_CareTask_AssignedBy FOREIGN KEY(assigned_by) REFERENCES dbo.[User](user_id)
);
CREATE TABLE dbo.Nutrition_Plan (
    nutrition_plan_id varchar(20) NOT NULL CONSTRAINT PK_Nutrition_Plan PRIMARY KEY,
    horse_id varchar(20) NOT NULL,
    created_by varchar(20) NOT NULL,
    plan_name nvarchar(150) NOT NULL,
    daily_amount decimal(10,2) NULL,
    feeding_frequency int NULL,
    start_date date NULL,
    end_date date NULL,
    status varchar(20) NOT NULL,
    notes nvarchar(1000) NULL,
    CONSTRAINT FK_NutritionPlan_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id),
    CONSTRAINT FK_NutritionPlan_CreatedBy FOREIGN KEY(created_by) REFERENCES dbo.[User](user_id)
);
CREATE TABLE dbo.Supply_Item (
    supply_item_id varchar(20) NOT NULL CONSTRAINT PK_Supply_Item PRIMARY KEY,
    item_name nvarchar(150) NOT NULL,
    category nvarchar(100) NULL,
    unit nvarchar(30) NULL,
    current_quantity decimal(10,2) NOT NULL CONSTRAINT DF_SupplyItem_Quantity DEFAULT 0,
    minimum_threshold decimal(10,2) NULL,
    status varchar(20) NOT NULL
);
CREATE TABLE dbo.Audit_Log (
    audit_id varchar(20) NOT NULL CONSTRAINT PK_Audit_Log PRIMARY KEY,
    user_id varchar(20) NULL,
    horse_id varchar(20) NULL,
    action varchar(100) NOT NULL,
    entity_type varchar(100) NULL,
    entity_id varchar(20) NULL,
    result varchar(50) NULL,
    reason nvarchar(1000) NULL,
    created_at datetime2 NOT NULL CONSTRAINT DF_AuditLog_Created DEFAULT SYSDATETIME(),
    CONSTRAINT FK_AuditLog_User FOREIGN KEY(user_id) REFERENCES dbo.[User](user_id),
    CONSTRAINT FK_AuditLog_Horse FOREIGN KEY(horse_id) REFERENCES dbo.Horse(horse_id)
);
