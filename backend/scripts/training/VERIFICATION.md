# Verification ? 26 October 2026

Local implementation in RaceForge-premain4; no commit or push performed.

## Passed
- Backend: mvn '-Dtest=com.raceforge.backend.training.**.*Test' package ? BUILD SUCCESS, 77 tests, zero failures/errors/skips (opt-in SQL test enabled locally).
- Frontend: npm run build ? TypeScript and Vite passed.
- Frontend Training adapter/calendar/template checks: 22 tests passed using the targeted command documented below.
- git diff --check: passed.
- Removed curriculum class is absent from runtime source; frontend has no calls to training-recommendations or training-protocols.

## Disposable SQL Server test
Only randomly named RaceForgeTrainingTest_<uuid> databases were created and dropped. Existing RaceForge was not reset, migrated or seeded. The test closes the Spring context and removes the temporary DB in finally.

Verified:
1. Canonical schema import, real Flyway baseline at V12 and migration V13.
2. Four catalogue packages and all 14 stages seeded from the former policy.
3. Hibernate schema validation, Swagger UI and /v3/api-docs return HTTP 200; retired Recommendation APIs absent.
4. Two packages with the same type can return different roadmaps by package ID.
5. Independent saved horse stages and unchanged catalogue template.
6. Concurrent plan requests produce exactly one plan for the registration.
7. Forced SQL failure partway through generation rolls back all sessions; retry creates one complete calendar; a further retry is rejected.
8. Multiple non-overlapping sessions on one day are accepted and overlapping slots rejected.
9. Start/stop/complete and backend heart-rate note work with the existing workflow.
10. Changing registration dates as on resume retains the original Horse_Plan anchor: the later stage remains the later stage, and completed results stay completed.
11. Forced stage insert failure rolls back the new Package and its template.
12. Conditional legacy cleanup runs against both legacy and already-cleaned schemas; Training reset and reseed succeed.

The injected SQL CHECK failures in the logs are expected assertions, not failed tests.

## Existing frontend full-suite failures (outside Training roadmap scope)
Full npm test: 104 tests, 97 passed, 7 failed. Each failing scenario was independently reproduced against an untouched HEAD snapshot exported to an ignored cache folder before calling it pre-existing:
- Owner missing health-profile error handling.
- Admin data-loading endpoint expectations.
- Old createTrainerProfile adapter expectation.
- Trainer profile-by-ID versus /me endpoint expectation.
- Trainer profile SSR expects controls before async loading completes.
- Staff-account test expects a separate trainer-profile request.
- Staff-account test expects partial profile-creation failure/retry behavior.

No Account/Medical production code was changed to satisfy these unrelated expectations. The English source-label check passes; only the old trainer-profile SSR assertion fails in that test file.

## Commands
From backend (PowerShell), for the local disposable SQL test:

    $env:RUN_TRAINING_DB_TESTS='true'
    mvn '-Dtest=com.raceforge.backend.training.**.*Test' package

Without RUN_TRAINING_DB_TESTS, the SQL test is skipped and no DB is created.

From frontend:

    npm run build
    node --test --test-name-pattern='plan|stage|package creation|schedule|session|overlap|week|generation|adjust|roadmap|midnight|outside term' tests/apiIntegration.test.mjs tests/trainingSchedule.test.mjs
    npm test

## Remaining deployment work (intentionally not executed)
Team must review/reset the intended dev/test Training data, apply V13, and run seed as described in README.md. The new application requires the two template tables. Do not start this version against the old schema expecting the Java curriculum fallback; it has been removed.

Trainer/surface conflict checks in backend, automatic recovery-plan rebuilding and physical vet approval changes are outside this release. Existing authorization and Recovery payment decisions are preserved.
