-- Manual one-time criterion rename. This file is NOT a Flyway migration.
-- Stop the backend and select the intended RaceForge database in SSMS first.
-- Back up that database before applying. Deploy matching backend/frontend code together.
-- Never start old enum code against renamed data. Refresh the frontend after deployment.
-- Safe to re-run: already-renamed rows and empty assessment tables are supported.
-- No score recalculation, deletes, notifications, medical changes or package changes.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF @@TRANCOUNT <> 0
    THROW 51000, 'Run this script outside an existing transaction.', 1;

IF OBJECT_ID('dbo.Training_Session_Assessment_Item', 'U') IS NULL
   OR OBJECT_ID('dbo.Training_Session_Assessment', 'U') IS NULL
    THROW 51000, 'Select the database containing the two Training Assessment tables first.', 1;

IF COL_LENGTH('dbo.Training_Session_Assessment_Item', 'session_id') IS NULL
   OR COL_LENGTH('dbo.Training_Session_Assessment_Item', 'criterion_code') IS NULL
   OR COL_LENGTH('dbo.Training_Session_Assessment', 'session_id') IS NULL
   OR COL_LENGTH('dbo.Training_Session_Assessment', 'trigger_codes') IS NULL
    THROW 51000, 'Required Assessment columns are missing. No schema creation is performed.', 1;

-- OPENJSON provides token ordinals on SQL Server 2016+ at compatibility level 130+.
-- STRING_AGG requires SQL Server 2017+; this project uses SQL Server 2019.
IF CONVERT(int, SERVERPROPERTY('ProductMajorVersion')) < 14
   OR (SELECT compatibility_level FROM sys.databases WHERE database_id = DB_ID()) < 130
    THROW 51000, 'SQL Server 2017+ and database compatibility level 130+ are required.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @CodeMap TABLE (
        old_code varchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
        new_code varchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL UNIQUE
    );
    INSERT INTO @CodeMap (old_code, new_code) VALUES
        ('ALERTNESS', 'TASK_COMPLETION'),
        ('COORDINATION', 'SPEED_CONTROL'),
        ('BREATHING_EFFORT', 'MOVEMENT_STABILITY'),
        ('GAIT', 'BALANCE'),
        ('LIMB_CONDITION', 'COMMAND_RESPONSE'),
        ('MUSCLE_COMFORT', 'FOCUS'),
        ('EXTERNAL_INJURY', 'STAMINA'),
        ('SWEATING', 'SPEED_TRANSITION'),
        ('MUCOUS_MEMBRANES', 'COOPERATION'),
        ('NASAL_BLEEDING', 'PERFORMANCE_CONSISTENCY');

    -- Prevent concurrent writes throughout validation, rename and verification.
    DECLARE @AssessmentCount bigint, @ItemCount bigint;
    SELECT @AssessmentCount = COUNT_BIG(*)
    FROM dbo.Training_Session_Assessment WITH (TABLOCKX, HOLDLOCK);
    SELECT @ItemCount = COUNT_BIG(*)
    FROM dbo.Training_Session_Assessment_Item WITH (TABLOCKX, HOLDLOCK);

    -- Require exact uppercase tokens, including length; SQL equality alone ignores trailing spaces.
    IF EXISTS (
        SELECT 1 FROM dbo.Training_Session_Assessment_Item AS i
        WHERE NOT EXISTS (
            SELECT 1 FROM @CodeMap AS m
            WHERE (i.criterion_code COLLATE Latin1_General_100_BIN2 = m.old_code
                   AND DATALENGTH(i.criterion_code) = DATALENGTH(m.old_code))
               OR (i.criterion_code COLLATE Latin1_General_100_BIN2 = m.new_code
                   AND DATALENGTH(i.criterion_code) = DATALENGTH(m.new_code))
        )
    )
        THROW 51001, 'Unknown or malformed criterion_code found. Nothing has been renamed.', 1;

    -- A session must not have both the old and new code for the same final criterion.
    IF EXISTS (
        SELECT i.session_id,
               COALESCE(m.new_code, i.criterion_code COLLATE Latin1_General_100_BIN2)
        FROM dbo.Training_Session_Assessment_Item AS i
        LEFT JOIN @CodeMap AS m
          ON i.criterion_code COLLATE Latin1_General_100_BIN2 = m.old_code
        GROUP BY i.session_id,
                 COALESCE(m.new_code, i.criterion_code COLLATE Latin1_General_100_BIN2)
        HAVING COUNT_BIG(*) > 1
    )
        THROW 51002, 'Renaming would create duplicate criteria within a session.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Training_Session_Assessment WHERE trigger_codes IS NULL)
        THROW 51003, 'A null trigger_codes value was found; expected a CSV string or an empty string.', 1;

    DECLARE @TokenMap TABLE (
        input_code varchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL PRIMARY KEY,
        output_code varchar(40) COLLATE Latin1_General_100_BIN2 NOT NULL
    );
    INSERT INTO @TokenMap (input_code, output_code)
        SELECT old_code, new_code FROM @CodeMap
        UNION ALL SELECT new_code, new_code FROM @CodeMap
        UNION ALL SELECT 'SCORE_REVIEW', 'SCORE_REVIEW'
        UNION ALL SELECT 'SCORE_URGENT', 'SCORE_URGENT';

    DECLARE @TriggerTokens TABLE (
        session_id varchar(20) NOT NULL,
        ordinal int NOT NULL,
        original_token nvarchar(500) NOT NULL,
        mapped_token varchar(40) NULL,
        PRIMARY KEY (session_id, ordinal)
    );
    -- JSON escaping preserves the input before splitting. Ordinals come from OPENJSON keys.
    -- Do not use unordered STRING_SPLIT or substring REPLACE for criterion mapping.
    INSERT INTO @TriggerTokens (session_id, ordinal, original_token, mapped_token)
        SELECT a.session_id, CONVERT(int, j.[key]), j.[value], m.output_code
        FROM dbo.Training_Session_Assessment AS a
        CROSS APPLY OPENJSON(
            N'["' + REPLACE(STRING_ESCAPE(CONVERT(nvarchar(max), a.trigger_codes), 'json'),
                           N',', N'","') + N'"]'
        ) AS j
        LEFT JOIN @TokenMap AS m
          ON j.[value] COLLATE Latin1_General_100_BIN2 = m.input_code
         AND DATALENGTH(j.[value]) = 2 * DATALENGTH(m.input_code)
        WHERE DATALENGTH(a.trigger_codes) > 0;

    IF EXISTS (SELECT 1 FROM @TriggerTokens WHERE mapped_token IS NULL)
        THROW 51004, 'Unknown, blank or malformed trigger token found. Nothing has been renamed.', 1;

    DECLARE @TriggerRewrites TABLE (
        session_id varchar(20) NOT NULL PRIMARY KEY,
        rewritten_codes varchar(max) NOT NULL
    );
    INSERT INTO @TriggerRewrites (session_id, rewritten_codes)
        SELECT session_id,
               STRING_AGG(CONVERT(varchar(max), mapped_token), ',')
                   WITHIN GROUP (ORDER BY ordinal)
        FROM @TriggerTokens
        GROUP BY session_id;

    IF EXISTS (SELECT 1 FROM @TriggerRewrites WHERE DATALENGTH(rewritten_codes) > 500)
        THROW 51005, 'Renamed trigger_codes would exceed the existing 500-byte column.', 1;

    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.Training_Session_Assessment_Item')
          AND name = 'CK_TSAI_Criterion'
    )
        ALTER TABLE dbo.Training_Session_Assessment_Item DROP CONSTRAINT CK_TSAI_Criterion;

    UPDATE i SET criterion_code = m.new_code
    FROM dbo.Training_Session_Assessment_Item AS i
    JOIN @CodeMap AS m ON i.criterion_code COLLATE Latin1_General_100_BIN2 = m.old_code;
    DECLARE @RenamedItems int = @@ROWCOUNT;

    ALTER TABLE dbo.Training_Session_Assessment_Item WITH CHECK
    ADD CONSTRAINT CK_TSAI_Criterion CHECK (
        criterion_code COLLATE Latin1_General_100_BIN2 IN (
            'TASK_COMPLETION', 'SPEED_CONTROL', 'MOVEMENT_STABILITY', 'BALANCE',
            'COMMAND_RESPONSE', 'FOCUS', 'STAMINA', 'SPEED_TRANSITION',
            'COOPERATION', 'PERFORMANCE_CONSISTENCY'
        )
        AND DATALENGTH(criterion_code) = DATALENGTH(RTRIM(criterion_code))
    );

    UPDATE a SET trigger_codes = r.rewritten_codes
    FROM dbo.Training_Session_Assessment AS a
    JOIN @TriggerRewrites AS r ON r.session_id = a.session_id
    WHERE a.trigger_codes COLLATE Latin1_General_100_BIN2
           <> r.rewritten_codes COLLATE Latin1_General_100_BIN2;
    DECLARE @RenamedTriggers int = @@ROWCOUNT;

    -- Verify row counts and exact output; every non-code column is untouched by the UPDATEs.
    IF @ItemCount <> (SELECT COUNT_BIG(*) FROM dbo.Training_Session_Assessment_Item)
       OR @AssessmentCount <> (SELECT COUNT_BIG(*) FROM dbo.Training_Session_Assessment)
        THROW 51006, 'Assessment row counts changed unexpectedly.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Training_Session_Assessment_Item AS i
        WHERE NOT EXISTS (
            SELECT 1 FROM @CodeMap AS m
            WHERE i.criterion_code COLLATE Latin1_General_100_BIN2 = m.new_code
              AND DATALENGTH(i.criterion_code) = DATALENGTH(m.new_code)
        )
    )
        THROW 51007, 'Criterion verification failed: old or unknown codes remain.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Training_Session_Assessment AS a
        LEFT JOIN @TriggerRewrites AS r ON r.session_id = a.session_id
        WHERE a.trigger_codes COLLATE Latin1_General_100_BIN2
               <> COALESCE(r.rewritten_codes, '') COLLATE Latin1_General_100_BIN2
           OR DATALENGTH(a.trigger_codes) <> DATALENGTH(COALESCE(r.rewritten_codes, ''))
    )
        THROW 51008, 'Trigger order or token verification failed.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Training_Session_Assessment AS a
        CROSS APPLY OPENJSON(
            N'["' + REPLACE(STRING_ESCAPE(CONVERT(nvarchar(max), a.trigger_codes), 'json'),
                           N',', N'","') + N'"]'
        ) AS j
        JOIN @CodeMap AS m ON j.[value] COLLATE Latin1_General_100_BIN2 = m.old_code
        WHERE DATALENGTH(a.trigger_codes) > 0
    )
        THROW 51009, 'Trigger verification failed: an old criterion token remains.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.Training_Session_Assessment_Item')
          AND name = 'CK_TSAI_Criterion' AND is_disabled = 0 AND is_not_trusted = 0
    )
        THROW 51010, 'The new criterion check constraint is missing, disabled or untrusted.', 1;

    COMMIT TRANSACTION;
    PRINT CONCAT('Assessment criterion rename complete. Items changed: ', @RenamedItems,
                 '; trigger CSV rows changed: ', @RenamedTriggers, '.');
    PRINT 'Scores, booleans, notes, review/delivery state, medical links and sent notifications were not changed.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
