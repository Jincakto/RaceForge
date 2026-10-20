# Account registration and staff provisioning

Public registration creates **HORSE_OWNER (5)** only. `POST /api/auth/register` accepts `fullName`, `email`, `password`, and optional `phone`; it no longer accepts a requested role. Complete `/api/auth/verify-email` with the emailed OTP to activate the account. Google registration also creates owners; Google login preserves the role of existing accounts. There is no manager review step for owner accounts. Horse dossier approval is separate and unchanged.

## First administrator

Migration V8 adds **ADMIN (7)**, distinct from **CLUB_MANAGER (1)**. Existing managers are not promoted. Configure `BOOTSTRAP_ADMIN_ENABLED=true`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` (12–100 characters) for a controlled startup, then disable bootstrap and remove these credentials. Passwords are hashed. Bootstrap neither promotes an existing non-admin email nor changes an existing admin password. Never commit real credentials.

## Staff APIs

Use the admin access token from `/api/auth/login` in Swagger's Authorize dialog.

| Endpoint | Access | Behavior |
| --- | --- | --- |
| `POST /api/admin/users` | Active ADMIN | Creates staff and sends a password setup invitation; returns 201 and UserResponse |
| `POST /api/admin/users/{id}/invitation` | Active ADMIN | Resends invitation for an INVITED account and invalidates previous links |
| `POST /api/auth/staff/set-password` | Public, invitation token required | Sets password, verifies email ownership and activates staff |
| `GET /api/users` and `GET /api/users/{id}` | Active ADMIN or CLUB_MANAGER | Reads user records |
| `PATCH /api/users/{id}/status` | Active ADMIN | Locks/unlocks active or inactive accounts; cannot activate invitations or modify admins |

Create staff request:

```json
{"fullName":"Staff Name","email":"staff@example.com","phone":"0900123456","roleId":3}
```

Allowed staff roles: 1 CLUB_MANAGER, 2 HEAD_TRAINER, 3 VETERINARIAN, 4 GROOM. This endpoint cannot create owners or admins and cannot convert an existing account to staff. Duplicate emails return 409. Staff starts as `INVITED` without a password and cannot log in, including through Google, until accepting the invitation.

Password setup request:

```json
{"token":"token-from-email","newPassword":"a-new-password"}
```

Invitation tokens are random, hashed in storage, single-use and expire after `PASSWORD_RESET_MINUTES` (default 15). They are purpose-bound: password reset tokens cannot activate staff, and invitation tokens cannot reset a password. SMTP must be configured; an email delivery failure rolls back account/token changes. Configure `FRONTEND_URL` as the password page URL (default `http://localhost:5173/reset-password`); the frontend handles both password reset and staff invitations.

## Existing data and compatibility

V8 rejects pending legacy role requests while preserving their history, clears requested roles, converts legacy USER (6) accounts to owners and activates verified pending USER accounts. Existing approved staff roles and disabled/rejected account statuses are preserved. Review this migration against a backup/disposable database before deployment.

The five legacy role-request APIs are completely removed: listing/detail and approval/rejection under `/api/registration-requests`, plus `/api/users/me/registration-request`. Their controller, service, repository, DTOs, mapper and obsolete runtime entity mappings have been removed. Authenticated callers, including ADMIN, receive 404; the APIs and old request/response schemas are absent from Swagger. Historical tables, columns, data and migrations are preserved in SQL Server; there is no longer a public or admin API for reading that history. Horse dossier approval remains a separate, unchanged workflow.

Public clients must stop sending requested roles. The live registration form has been updated. Staff provisioning is available through the documented API/Swagger; this change does not add an admin dashboard. User IDs are immutable strings assigned by role at account creation, for example `OWN-000` or `VET-000`. Role IDs remain integers.

## Business string IDs (V9)

The actual primary keys of Horse, User, TRAINING_PACKAGE and Medical_Record are now strings. Prefixes are HOR, OWN, VET, HTR, CM, PKG, MED, ADM and GRM. Each prefix has an independent SQL Server sequence from 000 to 999 with NO CYCLE and NO CACHE. Rollbacks may leave gaps. Deleting records does not reclaim IDs. Exhaustion returns HTTP 409 with `ID_CAPACITY_EXCEEDED`; the allocator never restarts sequences. IDs are assigned during persistence and are not accepted in public create requests.

All references to these four entities use strings, including historical tables, OTP shared primary keys, audit actors, composite horse-plan references and JWT subjects. Other IDs (role, permission, health profile, training plan/session, horse-package registration, token row and audit row IDs) remain integers. Audit `entity_id` is polymorphic: references to converted entities contain the new business ID; references to other entities contain the unchanged numeric value as a string. No separate horse identification/microchip/passport field is introduced.

Examples: `/api/horses/HOR-000`, `/api/training-packages/PKG-000`, `/api/medical/records/MED-000/confirm`, `{"horseId":"HOR-000","packageId":"PKG-000"}`. Numeric business IDs and malformed/wrong-prefix business IDs return 400; well-formed missing IDs return 404. This is a breaking API change: update backend, database and frontend together.

### Deployment and migration verification

Stop application writers and take a database backup before deploying V9. Flyway runs the conversion in a transaction with exclusive locks. V0–V8 are unchanged. The durable `String_Id_Mapping(entity_type,old_id,new_id)` table assigns codes in ascending old-ID order per prefix and preserves the earlier `Legacy_Id_Mapping`. Preflight rejects more than 1000 rows per prefix, unsupported user roles, orphaned references and schema features that cannot safely be rebuilt. The migration snapshots FK/index/default/check metadata, rebuilds affected tables (including unexposed history and composite-reference tables), verifies every transformed row and restores constraints. Unsupported custom dependencies fail rather than being silently discarded.

Existing refresh tokens and reset/invitation links are invalidated. Existing OTPs are expired and their resend cooldown cleared because the OTP hash includes the user ID. Users must log in again; unverified owners resend OTP; admins resend invitations for INVITED staff. Previously issued numeric JWT subjects are rejected. If deployment fails after database commit, restore the backup before running the old backend: old code cannot operate against the new key types.

SQL Server migration/concurrency tests are opt-in. Set `RACEFORGE_STRING_ID_TEST_URL` to a **fresh disposable** database named `RaceForge_StringIdTest_<suffix>`, with `DB_USERNAME` and `DB_PASSWORD`, then run `./mvnw -Dtest=BusinessStringIdsMigrationTest test`. The test applies V0–V8, checks capacity/unsupported-role failures and late rollback, applies V9, verifies references and payload, and tests concurrent allocation, deletion and exhaustion. It must never point to the application database. Account SQL integration tests continue to require `RACEFORGE_MIGRATION_TEST_URL` and an explicitly selected `AuthDatabaseIT` run. No production database is modified by the default test suite.

Run backend tests with `./mvnw test`; SQL Server integration tests require the disposable database configuration documented in their test classes. Frontend: `npm run typecheck`, `npm test`, `npm run build`.
