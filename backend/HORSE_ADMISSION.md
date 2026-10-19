# Horse admission workflow

Registration → manager assigns veterinarian → veterinarian accepts → examination confirmed → manager admission decision → manager assigns head trainer → trainer accepts.

Public registration of accounts is unchanged. Horse registration requires an active HORSE_OWNER; the server uses the authenticated owner, not the optional legacy ownerId query parameter. A health profile is created with the horse.

## API

All responses below use ApiResponse. Horse IDs are HOR-000 through HOR-999; assignment IDs are integers.

| Method and path | Actor / purpose |
|---|---|
| POST /api/horses | Owner creates a pending admission |
| GET /api/horse-admissions | Visible admissions and assignment history |
| GET /api/horse-admissions/{horseId} | Admission, horse name, owner, health profile ID and assignments |
| GET /api/horse-admissions/staff | CM: active veterinarians and head trainers |
| POST /api/horse-admissions/{horseId}/assignments | CM: `{ "kind": "VET", "assigneeId": "VET-000" }` or TRAINER / HTR-000 |
| POST /api/horse-admissions/{horseId}/assignments/{assignmentId}/response | Recipient: ACCEPT/REJECT; CM: CANCEL. Body `{ "action": "REJECT", "reason": "Unavailable" }` |
| POST /api/medical/records | Assigned, accepted veterinarian creates INITIAL draft using returned profileId |
| POST /api/medical/records/{medicalRecordId}/confirm | Author confirms complete examination; admission advances atomically |
| POST /api/horse-admissions/{horseId}/decision | CM after confirmed examination: `{ "accepted": true, "reason": "Reviewed" }` |

Rejection/cancellation requires a nonblank reason (maximum 1000 characters). Only pending assignments can be cancelled. Reassignment creates a new row; history is retained. Repeated actions return 409 without repeating notifications. Mutations lock the horse row, serializing assignment, response and admission decisions. SQL also enforces one pending assignment of each kind per horse. All writes, notifications and audit events participate in the same transaction.

Confirmed examinations expose nullable `trainingEligible` and `eligibilityReason`; legacy examinations retain null, without fabricating a clinical conclusion. Confirmation requires a diagnosis explaining ineligibility. Admission and trainer acceptance never clear a training lock. Training package registration, plan creation and session operations require completed admission in addition to existing medical checks.

Owners may edit while waiting for initial CM handling or veterinarian reassignment. Changes after the veterinarian accepts are blocked to preserve the reviewed information. Confirmed medical records use the existing correction mechanism; corrections must reference the same type/profile and belong to the author of the original confirmed record.

## Deployment and boundaries

V10 follows V9 and preserves existing data. Every pre-existing horse receives NEEDS_REVIEW because no trustworthy assignment/acceptance history exists. CM sends it through a new initial examination and decision; old medical records and trainer references remain. New training operations require completion of review. Back up and use a maintenance window; never trial the migration against the application database.

The current backend has no Club entity or user/horse membership relationship. It operates as one club: active CMs receive admission notifications and may process the queue. The demo additionally enforces its existing clubId. Multi-club backend isolation requires a separate membership model and is not claimed here.

The live Medical & Training page supports owners, CMs, veterinarians and head trainers. Its admission notification list uses the existing notifications API; opening a notification selects the horse. Use Refresh to retrieve new notifications. Demo pages share the same admission controls and require examination before approval.

## Verification

Run backend unit/API tests, frontend tests, TypeScript and Vite build. SQL tests are opt-in and skipped without configuration. To run V10 verification, set RACEFORGE_ADMISSION_TEST_URL to a **fresh empty** database named RaceForge_AdmissionTest_<suffix>, plus DB_USERNAME and DB_PASSWORD, then run `mvn -Dtest=AdmissionMigrationTest test`. The test checks legacy preservation, pending uniqueness, required rejection reason and transaction rollback. Real SQL verification must be reported separately from mocked service tests.
