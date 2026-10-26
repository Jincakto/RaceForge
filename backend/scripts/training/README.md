# Training roadmaps in SQL Server ? team handover

Status: implementation prepared locally. No reset/migration has been executed against the existing RaceForge database. No commit or push is part of this task.

## Application changes
- Four package types are preserved. Manager creates a package with an explicit roadmap and stages in one transaction.
- Package_Roadmap_Template: one roadmap per catalogue package; title, goal, source URLs, revision.
- Package_Stage_Template: ordered stages with metadata, relative days, intensity, weekdays and start/end times. New template IDs are UUID strings, not business sequence codes.
- Existing Training_Plan and Training_Stage store the trainer's independent snapshot. Horse_Plan preserves the original calendar anchor; one plan per horse_package_id is enforced by a unique index and the existing registration write lock.
- PackageRoadmapPolicy and frontend Recommendation/Protocol clients are removed. There is no Java fallback curriculum.
- Template edits are not exposed in this release. A sold package's type/duration/template cannot be changed; create a new catalogue package.
- Stage gaps are allowed and shown as rest days. Sessions are not a purchased quota. Trainer may add multiple non-overlapping sessions per day, within saved stages and the current registration period; at most six distinct days per Monday?Sunday week.
- Recovery/Medical/Training Lock, payment decisions and CENTER_COVERED rules are unchanged. Recovery templates describe authorized exercise, not veterinary appointment records.

## API contract (existing endpoints and permissions)
POST /api/training-packages now requires roadmapTemplate:

    {
      "packageName": "Individual basic", "packageType": "BASIC",
      "description": "Training", "durationDays": 30, "price": 3000000,
      "roadmapTemplate": {
        "title": "Foundation", "goal": "Practice consistent cues", "sources": [],
        "stages": [{
          "startDay": 1, "endDay": 30, "phaseCode": "FOUNDATION",
          "title": "Foundation", "objective": "Review responses",
          "activityName": "Trainer-defined activity", "intensity": "LOW",
          "daysOfWeek": ["MONDAY", "WEDNESDAY", "FRIDAY"],
          "sessionTime": "09:00", "sessionEndTime": "09:30"
        }]
      }
    }

GET /api/training-packages/{id}/roadmap-template and GET /api/horse-packages/{id}/roadmap-template return title, goal, sources, revision, stages. Selection is by the catalogue package ID, never by package type. Missing configuration is an explicit business error.

GET /api/horse-packages/{id}/training-context continues exposing medical data and blocking reasons.

POST /api/horses/{id}/training-plans accepts assignmentId, planName, goal, registered start/end dates and explicit stages. Stage DTO now includes title, objective, phaseCode. No recommendationId/confirmation flag is sent. The server stamps the template revision; it never trusts a client-supplied revision.

POST /api/training-plans/{id}/generate-sessions creates the entire calendar transactionally. Existing sessions cause a clear rejection; retry never adds a second full calendar. Existing single-session add/adjust/start/stop/complete endpoints remain in use.

## Calendar after pause/resume
Resumption still changes registration dates and preserves the remaining paid days. Existing plan stages retain Horse_Plan.start_date as their day-one anchor; they are not silently restarted at stage day one. Both package and horse-plan date windows still apply. There is no automatic shift, extension or regeneration of old stages. If the saved stages no longer cover a resumed date, scheduling is rejected clearly; automated rebuilding of resumed plans is outside this release. A registration without a plan may load its original template but the trainer must edit out-of-period days before saving.

## Existing development database (manual, reviewed execution only)
1. Stop the backend; back up test data if needed. Keep FLYWAY_ENABLED=false until preflight is reviewed.
2. Run 00_preflight.sql, confirm DB name and Flyway history. Existing schemas that already completed V12 can apply V13 normally. If history/schema diverges, resolve that explicitly; do not repair checksums or fake old history.
3. Review/run 02_reset_training_TEST_ONLY.sql. It removes sessions, stages, horse-plan links, plans, recommendation snapshots, package assignment links, registrations and catalogue/template rows. It preserves users, roles, Trainer/Trainer_Detail, Horse_Assignment history, Horse_Trainer, Medical, Training_Lock, Audit_Log and Flyway history. It does not clear a horse's training lock or medical status.
4. Apply V13 with Flyway OR run 01_schema.sql as the standalone alternative. Never run both. Standalone DDL does not mark Flyway history; explicitly baseline only in a NEW disposable setup, not an already-versioned team database.
5. Run 03_seed_demo.sql only on the empty catalogue. It creates four example packages and 14 stages; hours, durations and LOW intensity are demo defaults exported from the former policy, not scientific thresholds. Repeat seed without reset intentionally fails.
6. Optionally run 04_cleanup_legacy.sql separately: removes retired Recommendation, Protocol, Training_Medical_Context and Training_Plan.recommendation_id plus legacy foreign keys. Review historical snapshots first. Existing Medical tables are not deleted.
7. Start the matching backend/frontend versions, inspect Swagger and walk through registration/payment/assignment/plan/generation.

## Fresh development database
Do not assume the historical V0?V12 sequence creates the full current schema. In particular V11 references the retired recommendation table.
- Create a NEW empty development/test DB yourself.
- Import 00_canonical_base_schema.sql into that DB. It contains no CREATE DATABASE, server paths, application data or Flyway history. It is a schema baseline derived from Test.sql and excludes retired Training tables.
- Establish a Flyway baseline at version 12, then migrate V13. For Flyway CLI configured using environment variables FLYWAY_URL/FLYWAY_USER/FLYWAY_PASSWORD, use: flyway -baselineVersion=12 baseline, then flyway migrate with the repository migration location.
- Run 03_seed_demo.sql. Account/role bootstrap follows the existing application; this Training seed does not create staff, owners, horses or Medical records. Create those through the existing flows to test registration.
- Do not baseline a populated/versioned team DB. Do not edit applied historical migration files.

## Automated verification
Run from backend:

    mvn '-Dtest=com.raceforge.backend.training.**.*Test' test

The SQL/Swagger integration test is opt-in:

    $env:RUN_TRAINING_DB_TESTS='true'
    mvn '-Dtest=TrainingRoadmapDatabaseTest' test

It connects to master only to create/drop a random RaceForgeTrainingTest_<uuid> database, imports the canonical schema, baselines V12/migrates V13, seeds, boots the application on a random port, checks Swagger and package transaction rollback, then closes the app and drops that test DB. It never uses the RaceForge catalogue. Credentials come from DB_USERNAME/DB_PASSWORD (existing local defaults if unset); server from TRAINING_TEST_SQL_SERVER. Requires CREATE DATABASE permission. Do not point this opt-in test at a shared SQL server without team agreement.

Frontend: npm run build; node --test --test-name-pattern='plan|stage|package creation|schedule|session|overlap|week|generation|adjust|roadmap' tests/apiIntegration.test.mjs tests/trainingSchedule.test.mjs

Test results and known unrelated full-suite failures are recorded in VERIFICATION.md.
