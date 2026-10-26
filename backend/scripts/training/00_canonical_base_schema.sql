-- Schema-only development baseline derived from Test.sql (26 Oct 2026).
-- Run inside a NEW EMPTY database. Leaves Flyway history empty; baseline version 12 before V13.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;


GO

CREATE TABLE [dbo].[Audit_Log](
	[audit_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [varchar](20) NULL,
	[horse_id] [varchar](20) NULL,
	[action] [varchar](100) NOT NULL,
	[entity_type] [varchar](100) NULL,
	[entity_id] [varchar](20) NULL,
	[result] [varchar](50) NULL,
	[reason] [nvarchar](1000) NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Audit_Log] PRIMARY KEY CLUSTERED
(
	[audit_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Care_Task]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Care_Task](
	[care_task_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[assigned_to] [varchar](20) NOT NULL,
	[assigned_by] [varchar](20) NOT NULL,
	[task_type] [nvarchar](100) NOT NULL,
	[scheduled_at] [datetime2](7) NOT NULL,
	[status] [varchar](20) NOT NULL,
	[completed_at] [datetime2](7) NULL,
	[notes] [nvarchar](1000) NULL,
 CONSTRAINT [PK_Care_Task] PRIMARY KEY CLUSTERED
(
	[care_task_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Email_Verification_OTP]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Email_Verification_OTP](
	[user_id] [varchar](20) NOT NULL,
	[otp_hash] [varchar](64) NOT NULL,
	[expires_at] [datetime2](7) NOT NULL,
	[sent_at] [datetime2](7) NOT NULL,
	[attempt_count] [int] NOT NULL,
 CONSTRAINT [PK_Email_Verification_OTP] PRIMARY KEY CLUSTERED
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

SET QUOTED_IDENTIFIER ON



GO

/****** Object:  Table [dbo].[Health_Profile]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Health_Profile](
	[profile_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[updated_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Health_Profile] PRIMARY KEY CLUSTERED
(
	[profile_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Health_P__DE0BA8A3225D94BC] UNIQUE NONCLUSTERED
(
	[horse_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Horse]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Horse](
	[horse_id] [varchar](20) NOT NULL,
	[owner_id] [varchar](20) NOT NULL,
	[horse_name] [nvarchar](100) NOT NULL,
	[date_of_birth] [date] NULL,
	[gender] [varchar](20) NULL,
	[breed] [nvarchar](100) NULL,
	[coat_color] [nvarchar](50) NULL,
	[sire] [nvarchar](100) NULL,
	[dam] [nvarchar](100) NULL,
	[height] [decimal](6, 2) NULL,
	[declared_medical_history] [nvarchar](1000) NULL,
	[image_url] [nvarchar](500) NULL,
	[health_status] [varchar](30) NULL,
	[training_locked] [bit] NOT NULL,
	[status] [varchar](20) NOT NULL,
	[registration_number] [varchar](100) NULL,
	[document_type] [varchar](50) NULL,
	[document_url] [nvarchar](500) NULL,
 CONSTRAINT [PK_Horse] PRIMARY KEY CLUSTERED
(
	[horse_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Horse_Admission]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Horse_Admission](
	[horse_id] [varchar](20) NOT NULL,
	[status] [varchar](50) NOT NULL,
	[medical_record_id] [varchar](20) NULL,
	[decision_by] [varchar](20) NULL,
	[decision_reason] [nvarchar](1000) NULL,
	[decided_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Horse_Admission] PRIMARY KEY CLUSTERED
(
	[horse_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Horse_Assignment]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Horse_Assignment](
	[id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[kind] [varchar](10) NOT NULL,
	[assigned_by] [varchar](20) NOT NULL,
	[assignee_id] [varchar](20) NOT NULL,
	[status] [varchar](20) NOT NULL,
	[reason] [nvarchar](1000) NULL,
	[created_at] [datetime2](7) NOT NULL,
	[responded_at] [datetime2](7) NULL,
	[medical_record_id] [varchar](20) NULL,
 CONSTRAINT [PK_Horse_Assignment] PRIMARY KEY CLUSTERED
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[HORSE_PACKAGE]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[HORSE_PACKAGE](
	[horse_package_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[package_id] [varchar](20) NOT NULL,
	[registered_at] [datetime] NOT NULL,
	[start_date] [date] NULL,
	[end_date] [date] NULL,
	[status] [varchar](20) NOT NULL,
	[total_price] [decimal](12, 2) NOT NULL,
	[paused_at] [datetime] NULL,
	[pause_reason] [nvarchar](255) NULL,
	[replaced_horse_package_id] [varchar](20) NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NOT NULL,
	[payment_status] [varchar](20) NOT NULL,
	[remaining_days] [int] NULL,
 CONSTRAINT [PK_HORSE_PACKAGE] PRIMARY KEY CLUSTERED
(
	[horse_package_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_HorsePackage_Horse] UNIQUE NONCLUSTERED
(
	[horse_package_id] ASC,
	[horse_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Horse_Plan]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Horse_Plan](
	[plan_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[start_date] [date] NULL,
	[end_date] [date] NULL,
	[status] [varchar](20) NOT NULL,
	[notes] [nvarchar](1000) NULL,
 CONSTRAINT [PK_Horse_Plan] PRIMARY KEY CLUSTERED
(
	[plan_id] ASC,
	[horse_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[HORSE_RACE_HISTORY]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[HORSE_RACE_HISTORY](
	[race_history_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[race_name] [nvarchar](150) NOT NULL,
	[race_date] [date] NULL,
	[distance] [int] NULL,
	[finish_position] [int] NULL,
	[completion_time] [varchar](20) NULL,
	[racecourse] [nvarchar](150) NULL,
	[jockey_name] [nvarchar](100) NULL,
	[prize] [decimal](15, 2) NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NOT NULL,
 CONSTRAINT [PK_HORSE_RACE_HISTORY] PRIMARY KEY CLUSTERED
(
	[race_history_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Horse_Trainer]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Horse_Trainer](
	[horse_id] [varchar](20) NOT NULL,
	[trainer_id] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Horse_Trainer] PRIMARY KEY CLUSTERED
(
	[horse_id] ASC,
	[trainer_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Id_Counter]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Id_Counter](
	[prefix] [varchar](16) NOT NULL,
	[next_value] [bigint] NOT NULL,
 CONSTRAINT [PK_Id_Counter] PRIMARY KEY CLUSTERED
(
	[prefix] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Medical_Clinical_Exam]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Medical_Clinical_Exam](
	[clinical_exam_id] [varchar](20) NOT NULL,
	[medical_record_id] [varchar](20) NOT NULL,
	[examination_area] [varchar](50) NOT NULL,
	[condition_status] [varchar](20) NOT NULL,
	[notes] [nvarchar](500) NULL,
 CONSTRAINT [PK_Medical_Clinical_Exam] PRIMARY KEY CLUSTERED
(
	[clinical_exam_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Medical_Record]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Medical_Record](
	[medical_record_id] [varchar](20) NOT NULL,
	[profile_id] [varchar](20) NOT NULL,
	[veterinarian_id] [varchar](20) NOT NULL,
	[correction_of_id] [varchar](20) NULL,
	[exam_type] [varchar](30) NOT NULL,
	[examined_at] [datetime2](7) NOT NULL,
	[health_status] [varchar](30) NULL,
	[diagnosis] [nvarchar](1000) NULL,
	[treatment] [nvarchar](1000) NULL,
	[medication] [nvarchar](1000) NULL,
	[care_recommendation] [nvarchar](1000) NULL,
	[notes] [nvarchar](1000) NULL,
	[system_note] [nvarchar](1000) NULL,
	[training_note] [nvarchar](1000) NULL,
	[status] [varchar](20) NOT NULL,
	[confirmed_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NOT NULL,
	[updated_at] [datetime2](7) NOT NULL,
	[training_eligible] [bit] NULL,
	[eligibility_reason] [nvarchar](1000) NULL,
	[suggested_conclusion] [varchar](30) NULL,
	[final_conclusion] [varchar](30) NULL,
	[override_reason] [nvarchar](1000) NULL,
	[monitoring_note] [nvarchar](1000) NULL,
	[training_lock_reason] [nvarchar](1000) NULL,
 CONSTRAINT [PK_Medical_Record] PRIMARY KEY CLUSTERED
(
	[medical_record_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Medical_Vital_Sign]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Medical_Vital_Sign](
	[vital_sign_id] [varchar](20) NOT NULL,
	[medical_record_id] [varchar](20) NOT NULL,
	[body_temperature] [decimal](4, 1) NULL,
	[resting_heart_rate] [int] NULL,
	[resting_respiratory_rate] [int] NULL,
	[weight] [decimal](7, 2) NULL,
 CONSTRAINT [PK_Medical_Vital_Sign] PRIMARY KEY CLUSTERED
(
	[vital_sign_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Medical___05C4C30BC5C7B0E4] UNIQUE NONCLUSTERED
(
	[medical_record_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Notification]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Notification](
	[notification_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [varchar](20) NOT NULL,
	[notification_type] [varchar](50) NOT NULL,
	[title] [nvarchar](200) NOT NULL,
	[message] [nvarchar](1000) NOT NULL,
	[is_read] [bit] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Notification] PRIMARY KEY CLUSTERED
(
	[notification_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Nutrition_Plan]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Nutrition_Plan](
	[nutrition_plan_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[created_by] [varchar](20) NOT NULL,
	[plan_name] [nvarchar](150) NOT NULL,
	[daily_amount] [decimal](10, 2) NULL,
	[feeding_frequency] [int] NULL,
	[start_date] [date] NULL,
	[end_date] [date] NULL,
	[status] [varchar](20) NOT NULL,
	[notes] [nvarchar](1000) NULL,
 CONSTRAINT [PK_Nutrition_Plan] PRIMARY KEY CLUSTERED
(
	[nutrition_plan_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Password_Reset_Token]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Password_Reset_Token](
	[reset_token_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [varchar](20) NOT NULL,
	[token_hash] [varchar](64) NOT NULL,
	[expires_at] [datetime2](7) NOT NULL,
	[used_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NOT NULL,
	[purpose] [varchar](30) NOT NULL,
 CONSTRAINT [PK_Password_Reset_Token] PRIMARY KEY CLUSTERED
(
	[reset_token_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Password__9F6BDB130699E4B3] UNIQUE NONCLUSTERED
(
	[token_hash] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Permission]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Permission](
	[permission_id] [int] IDENTITY(1,1) NOT NULL,
	[permission_name] [varchar](100) NOT NULL,
	[description] [nvarchar](500) NULL,
 CONSTRAINT [PK_Permission] PRIMARY KEY CLUSTERED
(
	[permission_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Permissi__81C0F5A2CCA36885] UNIQUE NONCLUSTERED
(
	[permission_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Refresh_Token]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Refresh_Token](
	[refresh_token_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [varchar](20) NOT NULL,
	[token_hash] [varchar](64) NOT NULL,
	[expires_at] [datetime2](7) NOT NULL,
	[revoked_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Refresh_Token] PRIMARY KEY CLUSTERED
(
	[refresh_token_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Refresh___9F6BDB1329F7A3FB] UNIQUE NONCLUSTERED
(
	[token_hash] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Registration_Request]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Registration_Request](
	[request_id] [varchar](20) NOT NULL,
	[user_id] [varchar](20) NOT NULL,
	[requested_role_id] [int] NOT NULL,
	[status] [varchar](20) NOT NULL,
	[reviewed_by] [varchar](20) NULL,
	[reviewed_at] [datetime2](7) NULL,
	[review_note] [nvarchar](500) NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Registration_Request] PRIMARY KEY CLUSTERED
(
	[request_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Role]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Role](
	[role_id] [int] IDENTITY(1,1) NOT NULL,
	[role_name] [varchar](50) NOT NULL,
 CONSTRAINT [PK_Role] PRIMARY KEY CLUSTERED
(
	[role_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Role__783254B10B6F6CDC] UNIQUE NONCLUSTERED
(
	[role_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Role_Permission]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Role_Permission](
	[role_id] [int] NOT NULL,
	[permission_id] [int] NOT NULL,
 CONSTRAINT [PK_Role_Permission] PRIMARY KEY CLUSTERED
(
	[role_id] ASC,
	[permission_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Supply_Item]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Supply_Item](
	[supply_item_id] [varchar](20) NOT NULL,
	[item_name] [nvarchar](150) NOT NULL,
	[category] [nvarchar](100) NULL,
	[unit] [nvarchar](30) NULL,
	[current_quantity] [decimal](10, 2) NOT NULL,
	[minimum_threshold] [decimal](10, 2) NULL,
	[status] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Supply_Item] PRIMARY KEY CLUSTERED
(
	[supply_item_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Trainer]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Trainer](
	[trainer_id] [varchar](20) NOT NULL,
	[user_id] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Trainer] PRIMARY KEY CLUSTERED
(
	[trainer_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Trainer_User] UNIQUE NONCLUSTERED
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Trainer_Detail]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Trainer_Detail](
	[trainer_id] [varchar](20) NOT NULL,
	[bio] [nvarchar](1000) NULL,
	[qualifications] [nvarchar](1000) NULL,
	[status] [varchar](20) NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Trainer_Detail] PRIMARY KEY CLUSTERED
(
	[trainer_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Training_Assignment]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Training_Assignment](
	[assignment_id] [varchar](20) NOT NULL,
	[horse_package_id] [varchar](20) NOT NULL,
	[ended_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED
(
	[assignment_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_TrainingAssignment_Package] UNIQUE NONCLUSTERED
(
	[assignment_id] ASC,
	[horse_package_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Training_Lock]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Training_Lock](
	[lock_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[medical_record_id] [varchar](20) NULL,
	[locked_by] [varchar](20) NOT NULL,
	[unlocked_by] [varchar](20) NULL,
	[locked_at] [datetime2](7) NOT NULL,
	[lock_reason] [nvarchar](1000) NOT NULL,
	[unlocked_at] [datetime2](7) NULL,
	[unlock_reason] [nvarchar](1000) NULL,
 CONSTRAINT [PK_Training_Lock] PRIMARY KEY CLUSTERED
(
	[lock_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

SET QUOTED_IDENTIFIER ON



GO

/****** Object:  Table [dbo].[TRAINING_PACKAGE]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[TRAINING_PACKAGE](
	[package_id] [varchar](20) NOT NULL,
	[package_name] [nvarchar](100) NOT NULL,
	[package_type] [varchar](30) NOT NULL,
	[description] [nvarchar](500) NULL,
	[duration_days] [int] NOT NULL,
	[price] [decimal](12, 2) NOT NULL,
	[status] [varchar](20) NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NOT NULL,
 CONSTRAINT [PK_TRAINING_PACKAGE] PRIMARY KEY CLUSTERED
(
	[package_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Training_Plan]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Training_Plan](
	[plan_id] [varchar](20) NOT NULL,
	[created_by] [varchar](20) NOT NULL,
	[plan_name] [nvarchar](150) NOT NULL,
	[goal] [nvarchar](500) NULL,
	[duration] [int] NULL,
	[status] [varchar](20) NOT NULL,
	[notes] [nvarchar](1000) NULL,
	[horse_package_id] [varchar](20) NOT NULL,
	[trainer_assignment_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[package_type] [varchar](30) NULL,
	[roadmap_version] [varchar](50) NULL,
 CONSTRAINT [PK_Training_Plan] PRIMARY KEY CLUSTERED
(
	[plan_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_TrainingPlan_Horse] UNIQUE NONCLUSTERED
(
	[plan_id] ASC,
	[horse_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

SET QUOTED_IDENTIFIER ON



GO

SET QUOTED_IDENTIFIER ON



GO

/****** Object:  Table [dbo].[Training_Session]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Training_Session](
	[session_id] [varchar](20) NOT NULL,
	[plan_id] [varchar](20) NOT NULL,
	[horse_id] [varchar](20) NOT NULL,
	[scheduled_start] [datetime2](7) NOT NULL,
	[scheduled_end] [datetime2](7) NULL,
	[distance] [decimal](8, 2) NULL,
	[intensity] [varchar](30) NULL,
	[surface] [nvarchar](100) NULL,
	[status] [varchar](20) NOT NULL,
	[actual_start] [datetime2](7) NULL,
	[actual_end] [datetime2](7) NULL,
	[evaluation] [nvarchar](1000) NULL,
	[notes] [nvarchar](1000) NULL,
	[heart_rate] [int] NULL,
	[avg_speed] [float] NULL,
	[max_speed] [float] NULL,
	[recorded_by] [varchar](20) NULL,
	[training_stage_id] [varchar](20) NULL,
	[resting_heart_rate] [int] NULL,
	[end_exercise_heart_rate] [int] NULL,
	[recovery_heart_rate_2_min] [int] NULL,
	[recovery_measured_at] [datetime2](7) NULL,
	[resting_medical_record_id] [varchar](20) NULL,
	[resting_measured_at] [datetime2](7) NULL,
 CONSTRAINT [PK_Training_Session] PRIMARY KEY CLUSTERED
(
	[session_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UX_TrainingSession_HorseStart] UNIQUE NONCLUSTERED
(
	[horse_id] ASC,
	[scheduled_start] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[Training_Stage]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[Training_Stage](
	[stage_id] [varchar](20) NOT NULL,
	[plan_id] [varchar](20) NOT NULL,
	[stage_order] [int] NOT NULL,
	[start_day] [int] NOT NULL,
	[end_day] [int] NOT NULL,
	[activity_name] [nvarchar](500) NOT NULL,
	[intensity] [varchar](30) NOT NULL,
	[weekdays_json] [nvarchar](200) NOT NULL,
	[session_time] [time](7) NOT NULL,
	[phase_code] [varchar](50) NULL,
	[title] [nvarchar](150) NULL,
	[objective] [nvarchar](1000) NULL,
	[session_end_time] [time](7) NULL,
 CONSTRAINT [PK__Training__CFC78760CF16D2D2] PRIMARY KEY CLUSTERED
(
	[stage_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UX_TrainingStage_Order] UNIQUE NONCLUSTERED
(
	[plan_id] ASC,
	[stage_order] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UX_TrainingStage_PlanStage] UNIQUE NONCLUSTERED
(
	[stage_id] ASC,
	[plan_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[User]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[User](
	[user_id] [varchar](20) NOT NULL,
	[role_id] [int] NOT NULL,
	[full_name] [nvarchar](150) NOT NULL,
	[email] [varchar](255) NOT NULL,
	[password] [varchar](255) NULL,
	[phone] [varchar](20) NULL,
	[status] [varchar](20) NOT NULL,
	[email_verified] [bit] NOT NULL,
	[avatar_url] [nvarchar](500) NULL,
	[requested_role_id] [int] NULL,
 CONSTRAINT [PK_User] PRIMARY KEY CLUSTERED
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__User__AB6E616435708F9A] UNIQUE NONCLUSTERED
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

/****** Object:  Table [dbo].[User_External_Login]    Script Date: 10/26/2026 4:17:09 PM ******/
SET ANSI_NULLS ON



GO

SET QUOTED_IDENTIFIER ON



GO

CREATE TABLE [dbo].[User_External_Login](
	[external_login_id] [varchar](20) NOT NULL,
	[user_id] [varchar](20) NOT NULL,
	[provider] [varchar](20) NOT NULL,
	[provider_user_id] [varchar](255) NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_User_External_Login] PRIMARY KEY CLUSTERED
(
	[external_login_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UX_UserExternalLogin_ProviderUser] UNIQUE NONCLUSTERED
(
	[provider] ASC,
	[provider_user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UX_UserExternalLogin_UserProvider] UNIQUE NONCLUSTERED
(
	[user_id] ASC,
	[provider] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]



GO

SET ANSI_PADDING ON



GO

/****** Object:  Index [UX_RegistrationRequest_User_Pending]    Script Date: 10/26/2026 4:17:09 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_RegistrationRequest_User_Pending] ON [dbo].[Registration_Request]
(
	[user_id] ASC
)
WHERE ([status]='PENDING')
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]



GO

SET ANSI_PADDING ON



GO

/****** Object:  Index [IX_TrainingPlan_Package]    Script Date: 10/26/2026 4:17:09 PM ******/
CREATE NONCLUSTERED INDEX [IX_TrainingPlan_Package] ON [dbo].[Training_Plan]
(
	[horse_package_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]



GO

ALTER TABLE [dbo].[Audit_Log] ADD  DEFAULT (sysdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Email_Verification_OTP] ADD  DEFAULT ((0)) FOR [attempt_count]



GO

ALTER TABLE [dbo].[Health_Profile] ADD  DEFAULT (sysdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Health_Profile] ADD  DEFAULT (sysdatetime()) FOR [updated_at]



GO

ALTER TABLE [dbo].[Horse] ADD  DEFAULT ((0)) FOR [training_locked]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] ADD  CONSTRAINT [DF__HORSE_PAC__regis__756D6ECB]  DEFAULT (getdate()) FOR [registered_at]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] ADD  CONSTRAINT [DF__HORSE_PAC__statu__76619304]  DEFAULT ('PENDING') FOR [status]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] ADD  CONSTRAINT [DF__HORSE_PAC__creat__7755B73D]  DEFAULT (getdate()) FOR [created_at]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] ADD  CONSTRAINT [DF__HORSE_PAC__updat__7849DB76]  DEFAULT (getdate()) FOR [updated_at]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] ADD  CONSTRAINT [DF__HORSE_PAC__payme__793DFFAF]  DEFAULT ('PENDING') FOR [payment_status]



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY] ADD  DEFAULT (getdate()) FOR [created_at]



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY] ADD  DEFAULT (getdate()) FOR [updated_at]



GO

ALTER TABLE [dbo].[Medical_Record] ADD  DEFAULT (sysdatetime()) FOR [examined_at]



GO

ALTER TABLE [dbo].[Medical_Record] ADD  DEFAULT ('DRAFT') FOR [status]



GO

ALTER TABLE [dbo].[Medical_Record] ADD  DEFAULT (sysdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Medical_Record] ADD  DEFAULT (sysdatetime()) FOR [updated_at]



GO

ALTER TABLE [dbo].[Notification] ADD  DEFAULT ((0)) FOR [is_read]



GO

ALTER TABLE [dbo].[Notification] ADD  DEFAULT (sysdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Password_Reset_Token] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Password_Reset_Token] ADD  CONSTRAINT [DF_Password_Reset_Token_Purpose]  DEFAULT ('PASSWORD_RESET') FOR [purpose]



GO

ALTER TABLE [dbo].[Refresh_Token] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Registration_Request] ADD  DEFAULT ('PENDING') FOR [status]



GO

ALTER TABLE [dbo].[Registration_Request] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Supply_Item] ADD  DEFAULT ((0)) FOR [current_quantity]



GO

ALTER TABLE [dbo].[Trainer_Detail] ADD  CONSTRAINT [DF__Trainer_D__statu__664B26CC]  DEFAULT ('ACTIVE') FOR [status]



GO

ALTER TABLE [dbo].[Trainer_Detail] ADD  CONSTRAINT [DF__Trainer_D__creat__673F4B05]  DEFAULT (sysdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] ADD  CONSTRAINT [DF__TRAINING___statu__2BC97F7C]  DEFAULT ('ACTIVE') FOR [status]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] ADD  CONSTRAINT [DF__TRAINING___creat__2CBDA3B5]  DEFAULT (getdate()) FOR [created_at]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] ADD  CONSTRAINT [DF__TRAINING___updat__2DB1C7EE]  DEFAULT (getdate()) FOR [updated_at]



GO

ALTER TABLE [dbo].[User] ADD  DEFAULT ((5)) FOR [role_id]



GO

ALTER TABLE [dbo].[User] ADD  DEFAULT ((0)) FOR [email_verified]



GO

ALTER TABLE [dbo].[User_External_Login] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]



GO

ALTER TABLE [dbo].[Audit_Log]  WITH CHECK ADD  CONSTRAINT [FK_AuditLog_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Audit_Log] CHECK CONSTRAINT [FK_AuditLog_Horse]



GO

ALTER TABLE [dbo].[Audit_Log]  WITH CHECK ADD  CONSTRAINT [FK_AuditLog_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Audit_Log] CHECK CONSTRAINT [FK_AuditLog_User]



GO

ALTER TABLE [dbo].[Care_Task]  WITH CHECK ADD  CONSTRAINT [FK_CareTask_AssignedBy] FOREIGN KEY([assigned_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Care_Task] CHECK CONSTRAINT [FK_CareTask_AssignedBy]



GO

ALTER TABLE [dbo].[Care_Task]  WITH CHECK ADD  CONSTRAINT [FK_CareTask_AssignedTo] FOREIGN KEY([assigned_to])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Care_Task] CHECK CONSTRAINT [FK_CareTask_AssignedTo]



GO

ALTER TABLE [dbo].[Care_Task]  WITH CHECK ADD  CONSTRAINT [FK_CareTask_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Care_Task] CHECK CONSTRAINT [FK_CareTask_Horse]



GO

ALTER TABLE [dbo].[Email_Verification_OTP]  WITH CHECK ADD  CONSTRAINT [FK_EmailVerificationOtp_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Email_Verification_OTP] CHECK CONSTRAINT [FK_EmailVerificationOtp_User]



GO

ALTER TABLE [dbo].[Health_Profile]  WITH CHECK ADD  CONSTRAINT [FK_HealthProfile_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Health_Profile] CHECK CONSTRAINT [FK_HealthProfile_Horse]



GO

ALTER TABLE [dbo].[Horse]  WITH CHECK ADD  CONSTRAINT [FK_Horse_Owner] FOREIGN KEY([owner_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Horse] CHECK CONSTRAINT [FK_Horse_Owner]



GO

ALTER TABLE [dbo].[Horse_Admission]  WITH CHECK ADD  CONSTRAINT [FK_TeamAdmission_DecisionUser] FOREIGN KEY([decision_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Horse_Admission] CHECK CONSTRAINT [FK_TeamAdmission_DecisionUser]



GO

ALTER TABLE [dbo].[Horse_Admission]  WITH CHECK ADD  CONSTRAINT [FK_TeamAdmission_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Horse_Admission] CHECK CONSTRAINT [FK_TeamAdmission_Horse]



GO

ALTER TABLE [dbo].[Horse_Admission]  WITH CHECK ADD  CONSTRAINT [FK_TeamAdmission_Medical] FOREIGN KEY([medical_record_id])
REFERENCES [dbo].[Medical_Record] ([medical_record_id])



GO

ALTER TABLE [dbo].[Horse_Admission] CHECK CONSTRAINT [FK_TeamAdmission_Medical]



GO

ALTER TABLE [dbo].[Horse_Assignment]  WITH CHECK ADD  CONSTRAINT [FK_TeamAssignment_AssignedBy] FOREIGN KEY([assigned_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Horse_Assignment] CHECK CONSTRAINT [FK_TeamAssignment_AssignedBy]



GO

ALTER TABLE [dbo].[Horse_Assignment]  WITH CHECK ADD  CONSTRAINT [FK_TeamAssignment_Assignee] FOREIGN KEY([assignee_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Horse_Assignment] CHECK CONSTRAINT [FK_TeamAssignment_Assignee]



GO

ALTER TABLE [dbo].[Horse_Assignment]  WITH CHECK ADD  CONSTRAINT [FK_TeamAssignment_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Horse_Assignment] CHECK CONSTRAINT [FK_TeamAssignment_Horse]



GO

ALTER TABLE [dbo].[Horse_Assignment]  WITH CHECK ADD  CONSTRAINT [FK_TeamAssignment_Medical] FOREIGN KEY([medical_record_id])
REFERENCES [dbo].[Medical_Record] ([medical_record_id])



GO

ALTER TABLE [dbo].[Horse_Assignment] CHECK CONSTRAINT [FK_TeamAssignment_Medical]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [FK_HORSE_PACKAGE_HORSE] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [FK_HORSE_PACKAGE_HORSE]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [FK_HORSE_PACKAGE_PACKAGE] FOREIGN KEY([package_id])
REFERENCES [dbo].[TRAINING_PACKAGE] ([package_id])



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [FK_HORSE_PACKAGE_PACKAGE]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [FK_HORSE_PACKAGE_REPLACED] FOREIGN KEY([replaced_horse_package_id])
REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id])



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [FK_HORSE_PACKAGE_REPLACED]



GO

ALTER TABLE [dbo].[Horse_Plan]  WITH CHECK ADD  CONSTRAINT [FK_HorsePlan_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Horse_Plan] CHECK CONSTRAINT [FK_HorsePlan_Horse]



GO

ALTER TABLE [dbo].[Horse_Plan]  WITH CHECK ADD  CONSTRAINT [FK_HorsePlan_Plan] FOREIGN KEY([plan_id])
REFERENCES [dbo].[Training_Plan] ([plan_id])



GO

ALTER TABLE [dbo].[Horse_Plan] CHECK CONSTRAINT [FK_HorsePlan_Plan]



GO

ALTER TABLE [dbo].[Horse_Plan]  WITH CHECK ADD  CONSTRAINT [FK_HorsePlan_PlanHorse] FOREIGN KEY([plan_id], [horse_id])
REFERENCES [dbo].[Training_Plan] ([plan_id], [horse_id])



GO

ALTER TABLE [dbo].[Horse_Plan] CHECK CONSTRAINT [FK_HorsePlan_PlanHorse]



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY]  WITH CHECK ADD  CONSTRAINT [FK_RaceHistory_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY] CHECK CONSTRAINT [FK_RaceHistory_Horse]



GO

ALTER TABLE [dbo].[Horse_Trainer]  WITH CHECK ADD  CONSTRAINT [FK_HorseTrainer_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Horse_Trainer] CHECK CONSTRAINT [FK_HorseTrainer_Horse]



GO

ALTER TABLE [dbo].[Horse_Trainer]  WITH CHECK ADD  CONSTRAINT [FK_HorseTrainer_Trainer] FOREIGN KEY([trainer_id])
REFERENCES [dbo].[Trainer] ([trainer_id])



GO

ALTER TABLE [dbo].[Horse_Trainer] CHECK CONSTRAINT [FK_HorseTrainer_Trainer]



GO

ALTER TABLE [dbo].[Medical_Clinical_Exam]  WITH CHECK ADD  CONSTRAINT [FK_MedicalClinicalExam_Record] FOREIGN KEY([medical_record_id])
REFERENCES [dbo].[Medical_Record] ([medical_record_id])



GO

ALTER TABLE [dbo].[Medical_Clinical_Exam] CHECK CONSTRAINT [FK_MedicalClinicalExam_Record]



GO

ALTER TABLE [dbo].[Medical_Record]  WITH CHECK ADD  CONSTRAINT [FK_MedicalRecord_Correction] FOREIGN KEY([correction_of_id])
REFERENCES [dbo].[Medical_Record] ([medical_record_id])



GO

ALTER TABLE [dbo].[Medical_Record] CHECK CONSTRAINT [FK_MedicalRecord_Correction]



GO

ALTER TABLE [dbo].[Medical_Record]  WITH CHECK ADD  CONSTRAINT [FK_MedicalRecord_Profile] FOREIGN KEY([profile_id])
REFERENCES [dbo].[Health_Profile] ([profile_id])



GO

ALTER TABLE [dbo].[Medical_Record] CHECK CONSTRAINT [FK_MedicalRecord_Profile]



GO

ALTER TABLE [dbo].[Medical_Record]  WITH CHECK ADD  CONSTRAINT [FK_MedicalRecord_Veterinarian] FOREIGN KEY([veterinarian_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Medical_Record] CHECK CONSTRAINT [FK_MedicalRecord_Veterinarian]



GO

ALTER TABLE [dbo].[Medical_Vital_Sign]  WITH CHECK ADD  CONSTRAINT [FK_MedicalVitalSign_Record] FOREIGN KEY([medical_record_id])
REFERENCES [dbo].[Medical_Record] ([medical_record_id])



GO

ALTER TABLE [dbo].[Medical_Vital_Sign] CHECK CONSTRAINT [FK_MedicalVitalSign_Record]



GO

ALTER TABLE [dbo].[Notification]  WITH CHECK ADD  CONSTRAINT [FK_Notification_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Notification] CHECK CONSTRAINT [FK_Notification_User]



GO

ALTER TABLE [dbo].[Nutrition_Plan]  WITH CHECK ADD  CONSTRAINT [FK_NutritionPlan_CreatedBy] FOREIGN KEY([created_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Nutrition_Plan] CHECK CONSTRAINT [FK_NutritionPlan_CreatedBy]



GO

ALTER TABLE [dbo].[Nutrition_Plan]  WITH CHECK ADD  CONSTRAINT [FK_NutritionPlan_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Nutrition_Plan] CHECK CONSTRAINT [FK_NutritionPlan_Horse]



GO

ALTER TABLE [dbo].[Password_Reset_Token]  WITH CHECK ADD  CONSTRAINT [FK_PasswordResetToken_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Password_Reset_Token] CHECK CONSTRAINT [FK_PasswordResetToken_User]



GO

ALTER TABLE [dbo].[Refresh_Token]  WITH CHECK ADD  CONSTRAINT [FK_RefreshToken_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Refresh_Token] CHECK CONSTRAINT [FK_RefreshToken_User]



GO

ALTER TABLE [dbo].[Registration_Request]  WITH CHECK ADD  CONSTRAINT [FK_RegistrationRequest_Reviewer] FOREIGN KEY([reviewed_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Registration_Request] CHECK CONSTRAINT [FK_RegistrationRequest_Reviewer]



GO

ALTER TABLE [dbo].[Registration_Request]  WITH CHECK ADD  CONSTRAINT [FK_RegistrationRequest_Role] FOREIGN KEY([requested_role_id])
REFERENCES [dbo].[Role] ([role_id])



GO

ALTER TABLE [dbo].[Registration_Request] CHECK CONSTRAINT [FK_RegistrationRequest_Role]



GO

ALTER TABLE [dbo].[Registration_Request]  WITH CHECK ADD  CONSTRAINT [FK_RegistrationRequest_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Registration_Request] CHECK CONSTRAINT [FK_RegistrationRequest_User]



GO

ALTER TABLE [dbo].[Role_Permission]  WITH CHECK ADD  CONSTRAINT [FK_RolePermission_Permission] FOREIGN KEY([permission_id])
REFERENCES [dbo].[Permission] ([permission_id])



GO

ALTER TABLE [dbo].[Role_Permission] CHECK CONSTRAINT [FK_RolePermission_Permission]



GO

ALTER TABLE [dbo].[Role_Permission]  WITH CHECK ADD  CONSTRAINT [FK_RolePermission_Role] FOREIGN KEY([role_id])
REFERENCES [dbo].[Role] ([role_id])



GO

ALTER TABLE [dbo].[Role_Permission] CHECK CONSTRAINT [FK_RolePermission_Role]



GO

ALTER TABLE [dbo].[Trainer]  WITH CHECK ADD  CONSTRAINT [FK_Trainer_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Trainer] CHECK CONSTRAINT [FK_Trainer_User]



GO

ALTER TABLE [dbo].[Trainer_Detail]  WITH CHECK ADD  CONSTRAINT [FK_TrainerDetail_Trainer] FOREIGN KEY([trainer_id])
REFERENCES [dbo].[Trainer] ([trainer_id])



GO

ALTER TABLE [dbo].[Trainer_Detail] CHECK CONSTRAINT [FK_TrainerDetail_Trainer]



GO

ALTER TABLE [dbo].[Training_Assignment]  WITH CHECK ADD  CONSTRAINT [FK_TrainingAssignment_Package] FOREIGN KEY([horse_package_id])
REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id])



GO

ALTER TABLE [dbo].[Training_Assignment] CHECK CONSTRAINT [FK_TrainingAssignment_Package]



GO

ALTER TABLE [dbo].[Training_Assignment]  WITH CHECK ADD  CONSTRAINT [FK_TrainingAssignment_Request] FOREIGN KEY([assignment_id])
REFERENCES [dbo].[Horse_Assignment] ([id])



GO

ALTER TABLE [dbo].[Training_Assignment] CHECK CONSTRAINT [FK_TrainingAssignment_Request]



GO

ALTER TABLE [dbo].[Training_Lock]  WITH CHECK ADD  CONSTRAINT [FK_TrainingLock_Horse] FOREIGN KEY([horse_id])
REFERENCES [dbo].[Horse] ([horse_id])



GO

ALTER TABLE [dbo].[Training_Lock] CHECK CONSTRAINT [FK_TrainingLock_Horse]



GO

ALTER TABLE [dbo].[Training_Lock]  WITH CHECK ADD  CONSTRAINT [FK_TrainingLock_LockedBy] FOREIGN KEY([locked_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Training_Lock] CHECK CONSTRAINT [FK_TrainingLock_LockedBy]



GO

ALTER TABLE [dbo].[Training_Lock]  WITH CHECK ADD  CONSTRAINT [FK_TrainingLock_MedicalRecord] FOREIGN KEY([medical_record_id])
REFERENCES [dbo].[Medical_Record] ([medical_record_id])



GO

ALTER TABLE [dbo].[Training_Lock] CHECK CONSTRAINT [FK_TrainingLock_MedicalRecord]



GO

ALTER TABLE [dbo].[Training_Lock]  WITH CHECK ADD  CONSTRAINT [FK_TrainingLock_UnlockedBy] FOREIGN KEY([unlocked_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Training_Lock] CHECK CONSTRAINT [FK_TrainingLock_UnlockedBy]



GO

ALTER TABLE [dbo].[Training_Plan]  WITH CHECK ADD  CONSTRAINT [FK_Plan_AssignmentPackage] FOREIGN KEY([trainer_assignment_id], [horse_package_id])
REFERENCES [dbo].[Training_Assignment] ([assignment_id], [horse_package_id])



GO

ALTER TABLE [dbo].[Training_Plan] CHECK CONSTRAINT [FK_Plan_AssignmentPackage]



GO

ALTER TABLE [dbo].[Training_Plan]  WITH CHECK ADD  CONSTRAINT [FK_Plan_PackageHorse] FOREIGN KEY([horse_package_id], [horse_id])
REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id], [horse_id])



GO

ALTER TABLE [dbo].[Training_Plan] CHECK CONSTRAINT [FK_Plan_PackageHorse]



GO

ALTER TABLE [dbo].[Training_Plan]  WITH CHECK ADD  CONSTRAINT [FK_TrainingPlan_Assignment] FOREIGN KEY([trainer_assignment_id])
REFERENCES [dbo].[Training_Assignment] ([assignment_id])



GO

ALTER TABLE [dbo].[Training_Plan] CHECK CONSTRAINT [FK_TrainingPlan_Assignment]



GO

ALTER TABLE [dbo].[Training_Plan]  WITH CHECK ADD  CONSTRAINT [FK_TrainingPlan_CreatedBy] FOREIGN KEY([created_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Training_Plan] CHECK CONSTRAINT [FK_TrainingPlan_CreatedBy]



GO

ALTER TABLE [dbo].[Training_Plan]  WITH CHECK ADD  CONSTRAINT [FK_TrainingPlan_Package] FOREIGN KEY([horse_package_id])
REFERENCES [dbo].[HORSE_PACKAGE] ([horse_package_id])



GO

ALTER TABLE [dbo].[Training_Plan] CHECK CONSTRAINT [FK_TrainingPlan_Package]



GO

ALTER TABLE [dbo].[Training_Session]  WITH CHECK ADD  CONSTRAINT [FK_TrainingSession_HorsePlan] FOREIGN KEY([plan_id], [horse_id])
REFERENCES [dbo].[Horse_Plan] ([plan_id], [horse_id])



GO

ALTER TABLE [dbo].[Training_Session] CHECK CONSTRAINT [FK_TrainingSession_HorsePlan]



GO

ALTER TABLE [dbo].[Training_Session]  WITH CHECK ADD  CONSTRAINT [FK_TrainingSession_PlanStage] FOREIGN KEY([training_stage_id], [plan_id])
REFERENCES [dbo].[Training_Stage] ([stage_id], [plan_id])



GO

ALTER TABLE [dbo].[Training_Session] CHECK CONSTRAINT [FK_TrainingSession_PlanStage]



GO

ALTER TABLE [dbo].[Training_Session]  WITH CHECK ADD  CONSTRAINT [FK_TrainingSession_RecordedBy] FOREIGN KEY([recorded_by])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[Training_Session] CHECK CONSTRAINT [FK_TrainingSession_RecordedBy]



GO

ALTER TABLE [dbo].[Training_Session]  WITH CHECK ADD  CONSTRAINT [FK_TrainingSession_RestingMedical] FOREIGN KEY([resting_medical_record_id])
REFERENCES [dbo].[Medical_Record] ([medical_record_id])



GO

ALTER TABLE [dbo].[Training_Session] CHECK CONSTRAINT [FK_TrainingSession_RestingMedical]



GO

ALTER TABLE [dbo].[Training_Stage]  WITH CHECK ADD  CONSTRAINT [FK__Training___plan___075714DC] FOREIGN KEY([plan_id])
REFERENCES [dbo].[Training_Plan] ([plan_id])



GO

ALTER TABLE [dbo].[Training_Stage] CHECK CONSTRAINT [FK__Training___plan___075714DC]



GO

ALTER TABLE [dbo].[User]  WITH CHECK ADD  CONSTRAINT [FK_User_RequestedRole] FOREIGN KEY([requested_role_id])
REFERENCES [dbo].[Role] ([role_id])



GO

ALTER TABLE [dbo].[User] CHECK CONSTRAINT [FK_User_RequestedRole]



GO

ALTER TABLE [dbo].[User]  WITH CHECK ADD  CONSTRAINT [FK_User_Role] FOREIGN KEY([role_id])
REFERENCES [dbo].[Role] ([role_id])



GO

ALTER TABLE [dbo].[User] CHECK CONSTRAINT [FK_User_Role]



GO

ALTER TABLE [dbo].[User_External_Login]  WITH CHECK ADD  CONSTRAINT [FK_UserExternalLogin_User] FOREIGN KEY([user_id])
REFERENCES [dbo].[User] ([user_id])



GO

ALTER TABLE [dbo].[User_External_Login] CHECK CONSTRAINT [FK_UserExternalLogin_User]



GO

ALTER TABLE [dbo].[Care_Task]  WITH CHECK ADD  CONSTRAINT [CK_Code_Care_Task] CHECK  ((datalength([care_task_id])=(7) AND ([care_task_id]) collate Latin1_General_100_BIN2 like 'CAR-[0-9][0-9][0-9]' AND [care_task_id]<>'CAR-000'))



GO

ALTER TABLE [dbo].[Care_Task] CHECK CONSTRAINT [CK_Code_Care_Task]



GO

ALTER TABLE [dbo].[Health_Profile]  WITH CHECK ADD  CONSTRAINT [CK_Code_Health_Profile] CHECK  ((datalength([profile_id])=(7) AND ([profile_id]) collate Latin1_General_100_BIN2 like 'HLT-[0-9][0-9][0-9]' AND [profile_id]<>'HLT-000'))



GO

ALTER TABLE [dbo].[Health_Profile] CHECK CONSTRAINT [CK_Code_Health_Profile]



GO

ALTER TABLE [dbo].[Horse]  WITH CHECK ADD  CONSTRAINT [CK_Code_Horse] CHECK  ((datalength([horse_id])=(7) AND ([horse_id]) collate Latin1_General_100_BIN2 like 'HOR-[0-9][0-9][0-9]' AND [horse_id]<>'HOR-000'))



GO

ALTER TABLE [dbo].[Horse] CHECK CONSTRAINT [CK_Code_Horse]



GO

ALTER TABLE [dbo].[Horse_Assignment]  WITH CHECK ADD  CONSTRAINT [CK_Code_Horse_Assignment] CHECK  ((datalength([id])=(7) AND ([id]) collate Latin1_General_100_BIN2 like 'ASN-[0-9][0-9][0-9]' AND [id]<>'ASN-000'))



GO

ALTER TABLE [dbo].[Horse_Assignment] CHECK CONSTRAINT [CK_Code_Horse_Assignment]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_Code_HORSE_PACKAGE] CHECK  ((datalength([horse_package_id])=(7) AND ([horse_package_id]) collate Latin1_General_100_BIN2 like 'HPG-[0-9][0-9][0-9]' AND [horse_package_id]<>'HPG-000'))



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [CK_Code_HORSE_PACKAGE]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_HORSE_PACKAGE_DATE] CHECK  (([end_date] IS NULL OR [start_date] IS NULL OR [end_date]>=[start_date]))



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [CK_HORSE_PACKAGE_DATE]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_HORSE_PACKAGE_PAYMENT_STATUS] CHECK  (([payment_status]='FAILED' OR [payment_status]='PAID' OR [payment_status]='PENDING'))



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [CK_HORSE_PACKAGE_PAYMENT_STATUS]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_HORSE_PACKAGE_PRICE] CHECK  (([total_price]>=(0)))



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [CK_HORSE_PACKAGE_PRICE]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_HORSE_PACKAGE_REMAINING_DAYS] CHECK  (([remaining_days] IS NULL OR [remaining_days]>=(0)))



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [CK_HORSE_PACKAGE_REMAINING_DAYS]



GO

ALTER TABLE [dbo].[HORSE_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_HORSE_PACKAGE_STATUS] CHECK  (([status]='CANCELLED' OR [status]='COMPLETED' OR [status]='PAUSED' OR [status]='ACTIVE' OR [status]='PENDING'))



GO

ALTER TABLE [dbo].[HORSE_PACKAGE] CHECK CONSTRAINT [CK_HORSE_PACKAGE_STATUS]



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY]  WITH CHECK ADD  CONSTRAINT [CK_Code_HORSE_RACE_HISTORY] CHECK  ((datalength([race_history_id])=(7) AND ([race_history_id]) collate Latin1_General_100_BIN2 like 'RAC-[0-9][0-9][0-9]' AND [race_history_id]<>'RAC-000'))



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY] CHECK CONSTRAINT [CK_Code_HORSE_RACE_HISTORY]



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY]  WITH CHECK ADD  CONSTRAINT [CK_RaceHistory_Distance] CHECK  (([distance] IS NULL OR [distance]>(0)))



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY] CHECK CONSTRAINT [CK_RaceHistory_Distance]



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY]  WITH CHECK ADD  CONSTRAINT [CK_RaceHistory_Position] CHECK  (([finish_position] IS NULL OR [finish_position]>(0)))



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY] CHECK CONSTRAINT [CK_RaceHistory_Position]



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY]  WITH CHECK ADD  CONSTRAINT [CK_RaceHistory_Prize] CHECK  (([prize] IS NULL OR [prize]>=(0)))



GO

ALTER TABLE [dbo].[HORSE_RACE_HISTORY] CHECK CONSTRAINT [CK_RaceHistory_Prize]



GO

ALTER TABLE [dbo].[Id_Counter]  WITH CHECK ADD  CONSTRAINT [CK_IdCounter_ThreeDigits] CHECK  (([next_value]>=(0) AND [next_value]<=(999)))



GO

ALTER TABLE [dbo].[Id_Counter] CHECK CONSTRAINT [CK_IdCounter_ThreeDigits]



GO

ALTER TABLE [dbo].[Medical_Clinical_Exam]  WITH CHECK ADD  CONSTRAINT [CK_ClinicalExam_GroupCondition] CHECK  (([condition_status]='ABNORMAL' OR [condition_status]='NORMAL'))



GO

ALTER TABLE [dbo].[Medical_Clinical_Exam] CHECK CONSTRAINT [CK_ClinicalExam_GroupCondition]



GO

ALTER TABLE [dbo].[Medical_Clinical_Exam]  WITH CHECK ADD  CONSTRAINT [CK_Code_Medical_Clinical_Exam] CHECK  ((datalength([clinical_exam_id])=(7) AND ([clinical_exam_id]) collate Latin1_General_100_BIN2 like 'CLN-[0-9][0-9][0-9]' AND [clinical_exam_id]<>'CLN-000'))



GO

ALTER TABLE [dbo].[Medical_Clinical_Exam] CHECK CONSTRAINT [CK_Code_Medical_Clinical_Exam]



GO

ALTER TABLE [dbo].[Medical_Record]  WITH CHECK ADD  CONSTRAINT [CK_Code_Medical_Record] CHECK  ((datalength([medical_record_id])=(7) AND ([medical_record_id]) collate Latin1_General_100_BIN2 like 'MED-[0-9][0-9][0-9]' AND [medical_record_id]<>'MED-000'))



GO

ALTER TABLE [dbo].[Medical_Record] CHECK CONSTRAINT [CK_Code_Medical_Record]



GO

ALTER TABLE [dbo].[Medical_Record]  WITH CHECK ADD  CONSTRAINT [CK_Medical_GroupConclusion] CHECK  (([final_conclusion] IS NULL OR ([final_conclusion]='NOT_FIT' OR [final_conclusion]='FIT_WITH_MONITORING' OR [final_conclusion]='FIT')))



GO

ALTER TABLE [dbo].[Medical_Record] CHECK CONSTRAINT [CK_Medical_GroupConclusion]



GO

ALTER TABLE [dbo].[Medical_Record]  WITH CHECK ADD  CONSTRAINT [CK_Medical_GroupStatus] CHECK  (([status]='CANCELLED' OR [status]='CONFIRMED' OR [status]='DRAFT'))



GO

ALTER TABLE [dbo].[Medical_Record] CHECK CONSTRAINT [CK_Medical_GroupStatus]



GO

ALTER TABLE [dbo].[Medical_Vital_Sign]  WITH CHECK ADD  CONSTRAINT [CK_Code_Medical_Vital_Sign] CHECK  ((datalength([vital_sign_id])=(7) AND ([vital_sign_id]) collate Latin1_General_100_BIN2 like 'VIT-[0-9][0-9][0-9]' AND [vital_sign_id]<>'VIT-000'))



GO

ALTER TABLE [dbo].[Medical_Vital_Sign] CHECK CONSTRAINT [CK_Code_Medical_Vital_Sign]



GO

ALTER TABLE [dbo].[Medical_Vital_Sign]  WITH CHECK ADD  CONSTRAINT [CK_MedicalVitalSign_GroupWeight] CHECK  (([weight] IS NULL OR [weight]>(0)))



GO

ALTER TABLE [dbo].[Medical_Vital_Sign] CHECK CONSTRAINT [CK_MedicalVitalSign_GroupWeight]



GO

ALTER TABLE [dbo].[Nutrition_Plan]  WITH CHECK ADD  CONSTRAINT [CK_Code_Nutrition_Plan] CHECK  ((datalength([nutrition_plan_id])=(7) AND ([nutrition_plan_id]) collate Latin1_General_100_BIN2 like 'NUT-[0-9][0-9][0-9]' AND [nutrition_plan_id]<>'NUT-000'))



GO

ALTER TABLE [dbo].[Nutrition_Plan] CHECK CONSTRAINT [CK_Code_Nutrition_Plan]



GO

ALTER TABLE [dbo].[Password_Reset_Token]  WITH CHECK ADD  CONSTRAINT [CK_Password_Reset_Token_Purpose] CHECK  (([purpose]='STAFF_INVITATION' OR [purpose]='PASSWORD_RESET'))



GO

ALTER TABLE [dbo].[Password_Reset_Token] CHECK CONSTRAINT [CK_Password_Reset_Token_Purpose]



GO

ALTER TABLE [dbo].[Registration_Request]  WITH CHECK ADD  CONSTRAINT [CK_Code_Registration_Request] CHECK  ((datalength([request_id])=(7) AND ([request_id]) collate Latin1_General_100_BIN2 like 'REQ-[0-9][0-9][0-9]' AND [request_id]<>'REQ-000'))



GO

ALTER TABLE [dbo].[Registration_Request] CHECK CONSTRAINT [CK_Code_Registration_Request]



GO

ALTER TABLE [dbo].[Registration_Request]  WITH CHECK ADD  CONSTRAINT [CK_RegistrationRequest_Status] CHECK  (([status]='REJECTED' OR [status]='APPROVED' OR [status]='PENDING'))



GO

ALTER TABLE [dbo].[Registration_Request] CHECK CONSTRAINT [CK_RegistrationRequest_Status]



GO

ALTER TABLE [dbo].[Supply_Item]  WITH CHECK ADD  CONSTRAINT [CK_Code_Supply_Item] CHECK  ((datalength([supply_item_id])=(7) AND ([supply_item_id]) collate Latin1_General_100_BIN2 like 'SUP-[0-9][0-9][0-9]' AND [supply_item_id]<>'SUP-000'))



GO

ALTER TABLE [dbo].[Supply_Item] CHECK CONSTRAINT [CK_Code_Supply_Item]



GO

ALTER TABLE [dbo].[Trainer]  WITH CHECK ADD  CONSTRAINT [CK_Code_Trainer] CHECK  ((datalength([trainer_id])=(7) AND ([trainer_id]) collate Latin1_General_100_BIN2 like 'HTR-[0-9][0-9][0-9]' AND [trainer_id]<>'HTR-000'))



GO

ALTER TABLE [dbo].[Trainer] CHECK CONSTRAINT [CK_Code_Trainer]



GO

ALTER TABLE [dbo].[Training_Lock]  WITH CHECK ADD  CONSTRAINT [CK_Code_Training_Lock] CHECK  ((datalength([lock_id])=(7) AND ([lock_id]) collate Latin1_General_100_BIN2 like 'LCK-[0-9][0-9][0-9]' AND [lock_id]<>'LCK-000'))



GO

ALTER TABLE [dbo].[Training_Lock] CHECK CONSTRAINT [CK_Code_Training_Lock]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_Code_TRAINING_PACKAGE] CHECK  ((datalength([package_id])=(7) AND ([package_id]) collate Latin1_General_100_BIN2 like 'PKG-[0-9][0-9][0-9]' AND [package_id]<>'PKG-000'))



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] CHECK CONSTRAINT [CK_Code_TRAINING_PACKAGE]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_TRAINING_PACKAGE_DURATION] CHECK  (([duration_days]>(0)))



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] CHECK CONSTRAINT [CK_TRAINING_PACKAGE_DURATION]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_TRAINING_PACKAGE_PRICE] CHECK  (([price]>=(0)))



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] CHECK CONSTRAINT [CK_TRAINING_PACKAGE_PRICE]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_TRAINING_PACKAGE_STATUS] CHECK  (([status]='INACTIVE' OR [status]='ACTIVE'))



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] CHECK CONSTRAINT [CK_TRAINING_PACKAGE_STATUS]



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE]  WITH CHECK ADD  CONSTRAINT [CK_TRAINING_PACKAGE_TYPE] CHECK  (([package_type]='RECOVERY' OR [package_type]='PERFORMANCE' OR [package_type]='RACING' OR [package_type]='BASIC'))



GO

ALTER TABLE [dbo].[TRAINING_PACKAGE] CHECK CONSTRAINT [CK_TRAINING_PACKAGE_TYPE]



GO

ALTER TABLE [dbo].[Training_Plan]  WITH CHECK ADD  CONSTRAINT [CK_Code_Training_Plan] CHECK  ((datalength([plan_id])=(7) AND ([plan_id]) collate Latin1_General_100_BIN2 like 'PLN-[0-9][0-9][0-9]' AND [plan_id]<>'PLN-000'))



GO

ALTER TABLE [dbo].[Training_Plan] CHECK CONSTRAINT [CK_Code_Training_Plan]



GO

ALTER TABLE [dbo].[Training_Plan]  WITH CHECK ADD  CONSTRAINT [CK_TrainingPlan_PackageType] CHECK  (([package_type] IS NULL OR ([package_type]='RECOVERY' OR [package_type]='PERFORMANCE' OR [package_type]='RACING' OR [package_type]='BASIC')))



GO

ALTER TABLE [dbo].[Training_Plan] CHECK CONSTRAINT [CK_TrainingPlan_PackageType]



GO

ALTER TABLE [dbo].[Training_Session]  WITH CHECK ADD  CONSTRAINT [CK_Code_Training_Session] CHECK  ((datalength([session_id])=(7) AND ([session_id]) collate Latin1_General_100_BIN2 like 'SES-[0-9][0-9][0-9]' AND [session_id]<>'SES-000'))



GO

ALTER TABLE [dbo].[Training_Session] CHECK CONSTRAINT [CK_Code_Training_Session]



GO

ALTER TABLE [dbo].[Training_Session]  WITH CHECK ADD  CONSTRAINT [CK_TrainingSession_PlannedWindow] CHECK  (([scheduled_end] IS NULL OR [scheduled_end]>[scheduled_start] AND CONVERT([date],[scheduled_end])=CONVERT([date],[scheduled_start])))



GO

ALTER TABLE [dbo].[Training_Session] CHECK CONSTRAINT [CK_TrainingSession_PlannedWindow]



GO

ALTER TABLE [dbo].[Training_Session]  WITH CHECK ADD  CONSTRAINT [CK_TrainingSession_RecoveryResults] CHECK  ((([resting_heart_rate] IS NULL OR [resting_heart_rate]>(0)) AND ([end_exercise_heart_rate] IS NULL OR [end_exercise_heart_rate]>(0)) AND ([recovery_heart_rate_2_min] IS NULL OR [recovery_heart_rate_2_min]>(0)) AND ([distance] IS NULL OR [distance]>=(0)) AND ([actual_end] IS NULL OR [actual_start] IS NOT NULL AND [actual_end]>[actual_start]) AND ([recovery_measured_at] IS NULL OR [actual_end] IS NOT NULL AND [recovery_measured_at]>=[actual_end])))



GO

ALTER TABLE [dbo].[Training_Session] CHECK CONSTRAINT [CK_TrainingSession_RecoveryResults]



GO

ALTER TABLE [dbo].[Training_Stage]  WITH CHECK ADD  CONSTRAINT [CK__Training___weekd__093F5D4E] CHECK  ((isjson([weekdays_json])=(1)))



GO

ALTER TABLE [dbo].[Training_Stage] CHECK CONSTRAINT [CK__Training___weekd__093F5D4E]



GO

ALTER TABLE [dbo].[Training_Stage]  WITH CHECK ADD  CONSTRAINT [CK__Training_Stage__084B3915] CHECK  (([stage_order]>(0) AND [start_day]>(0) AND [end_day]>=[start_day]))



GO

ALTER TABLE [dbo].[Training_Stage] CHECK CONSTRAINT [CK__Training_Stage__084B3915]



GO

ALTER TABLE [dbo].[Training_Stage]  WITH CHECK ADD  CONSTRAINT [CK_Code_Training_Stage] CHECK  ((datalength([stage_id])=(7) AND ([stage_id]) collate Latin1_General_100_BIN2 like 'STG-[0-9][0-9][0-9]' AND [stage_id]<>'STG-000'))



GO

ALTER TABLE [dbo].[Training_Stage] CHECK CONSTRAINT [CK_Code_Training_Stage]



GO

ALTER TABLE [dbo].[Training_Stage]  WITH CHECK ADD  CONSTRAINT [CK_TrainingStage_TimeWindow] CHECK  (([session_end_time] IS NULL OR [session_end_time]>[session_time]))



GO

ALTER TABLE [dbo].[Training_Stage] CHECK CONSTRAINT [CK_TrainingStage_TimeWindow]



GO

ALTER TABLE [dbo].[User]  WITH CHECK ADD  CONSTRAINT [CK_User_BusinessId] CHECK  ((([user_id]) collate Latin1_General_100_BIN2 like 'CM-[0-9][0-9][0-9]' AND datalength([user_id])=(6) OR ([user_id]) collate Latin1_General_100_BIN2 like 'HTR-[0-9][0-9][0-9]' AND datalength([user_id])=(7) OR ([user_id]) collate Latin1_General_100_BIN2 like 'VET-[0-9][0-9][0-9]' AND datalength([user_id])=(7) OR ([user_id]) collate Latin1_General_100_BIN2 like 'GRM-[0-9][0-9][0-9]' AND datalength([user_id])=(7) OR ([user_id]) collate Latin1_General_100_BIN2 like 'OWN-[0-9][0-9][0-9]' AND datalength([user_id])=(7) OR ([user_id]) collate Latin1_General_100_BIN2 like 'ADM-[0-9][0-9][0-9]' AND datalength([user_id])=(7)))



GO

ALTER TABLE [dbo].[User] CHECK CONSTRAINT [CK_User_BusinessId]



GO

ALTER TABLE [dbo].[User_External_Login]  WITH CHECK ADD  CONSTRAINT [CK_Code_User_External_Login] CHECK  ((datalength([external_login_id])=(7) AND ([external_login_id]) collate Latin1_General_100_BIN2 like 'EXT-[0-9][0-9][0-9]' AND [external_login_id]<>'EXT-000'))



GO

ALTER TABLE [dbo].[User_External_Login] CHECK CONSTRAINT [CK_Code_User_External_Login]



GO
