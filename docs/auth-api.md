# RaceForge User/Auth API

## Swagger UI

After configuring the database and starting the backend with `backend/mvnw.cmd spring-boot:run`, open:

- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs

The UI and specification are public. Business API permissions still apply.
Choose an endpoint, select **Try it out**, edit the request, and select **Execute**.
Call `POST /api/auth/login`, copy `data.accessToken`, and paste it into **Authorize**
without the `Bearer ` prefix. Swagger adds the header to protected API calls.
Public registration and login endpoints do not require authorization.
Registration OTP requires configured SMTP; manager APIs require an active manager account.
Login also sets the HttpOnly refresh cookie, which the browser sends automatically
to `/api/auth/refresh`. Leave the refresh request body empty to use that cookie.

## Required configuration

Copy `backend/.env.example` to `backend/.env` and provide real values for:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` for the SQL Server `RaceForge` database.
- `JWT_SECRET` and `OTP_HMAC_SECRET`, each at least 32 random bytes.
- `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, and `MAIL_FROM` for OTP/reset email delivery.
- `GOOGLE_CLIENT_ID` for Google ID token verification.
- `FRONTEND_URL` for password reset links.

The backend loads this local file when started from the repository root or the
`backend` directory. `backend/.env` is ignored by Git. Environment variables can
also supply these settings and take precedence over the file.

Missing SMTP or Google configuration returns `503` for email/Google flows. The backend does not silently fake delivery or Google login.

## Migration

Run the Spring Boot application or:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Flyway first runs `V1__account_auth.sql` for the original schema, then
`V2__Integer_ids_and_user_auth.java` converts all application primary IDs and
foreign keys to SQL Server `int`. Java uses `Integer`; API IDs are JSON numbers.
Per-table SQL sequences generate IDs for both JPA and direct SQL inserts.
`Legacy_Id_Mapping` retains the old-to-new ID mapping. Existing relationships,
including composite and self-referencing keys, are preserved transactionally.

Before applying V2 to a populated database, take a full backup and test on a
restored clone. V2 removes `Email_Verification_OTP` and `User_External_Login`.
Google subject and link date move to `User.google_subject` / `google_linked_at`.
Google subjects remain strings because they are external identifiers, not local
database IDs. Unsupported providers or ambiguous links stop the migration.
OTP hash, expiry, resend time and failed-attempt count live on `User`; raw OTPs
are never stored. Outstanding OTPs are invalidated and must be resent.
Existing refresh/reset tokens are invalidated because JWT/user IDs changed.
Legacy plaintext passwords are BCrypt-hashed; existing BCrypt hashes are kept.
`User.phone` remains a string, preserving leading zeros.

Local rollout on 2026-10-11: V2 was applied to `HuyVo/RaceForge` after clone
testing. The 2 existing users and 4 training packages were preserved; all
constraints passed `DBCC CHECKCONSTRAINTS`. The verified pre-migration backup is
`C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\Backup\RaceForge_before_integer_ids_20261011_final.bak`.
The disposable test database is `RaceForge_IdMigrationTest_20261011`.

Existing databases without Flyway history are baselined at version 0 so V1 is
applied rather than skipped. Hibernate validates mappings after migration.

Roles: `1=CLUB_MANAGER`, `2=HEAD_TRAINER`, `3=VETERINARIAN`, `4=GROOM`,
`5=HORSE_OWNER`, `6=USER`. New accounts always start with role `USER`.
Basic USER accounts may access the public landing page and their own profile,
password/Google-link management and logout, but not business or manager APIs.

## Authentication endpoints

All responses use the existing `ApiResponse` envelope.

`POST /api/auth/register`

```json
{
  "fullName": "Nguyen Van A",
  "email": "owner@example.com",
  "password": "StrongPass123",
  "phone": "0900000000",
  "requestedRoleId": 6
}
```

Omit `requestedRoleId` (or use `6`) for a basic account. Optional business-role
requests accept `2`, `3`, `4`, or `5`, while the account keeps role `USER` until
approval. Public manager registration (`1`) is rejected.

`POST /api/auth/verify-email`

```json
{ "email": "owner@example.com", "otp": "123456" }
```

For basic registration, verification activates the USER account immediately.
For a business-role request, the account becomes `PENDING`, one pending request
is created, and active managers receive notifications. Incorrect OTP attempts
persist even when the API returns an error; expiry, attempt limits and resend
cooldown are enforced.

`POST /api/auth/login`

```json
{ "email": "owner@example.com", "password": "StrongPass123" }
```

Returns an access token in JSON and sets the refresh token in an HttpOnly cookie. `PENDING` and `REJECTED` users can log in for `/me` endpoints only. `UNVERIFIED` and `INACTIVE` cannot log in.

`POST /api/auth/refresh`

Uses the HttpOnly cookie, or accepts:

```json
{ "refreshToken": "raw-refresh-token" }
```

Refresh rotates the token and revokes the old one inside a transaction.

Other auth endpoints:

- `POST /api/auth/resend-otp`
- `POST /api/auth/google`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Current user endpoints

- `GET /api/users/me`
- `PUT /api/users/me`
- `PUT /api/users/me/password`
- `GET /api/users/me/registration-request`
- `POST /api/users/me/external-logins/google`

Profile updates never accept `role` or `status`. Password change and password reset revoke all refresh tokens.

## Manager endpoints

Only `ACTIVE` `CLUB_MANAGER` users can call:

- `GET /api/users?search=&status=&roleId=&page=0&size=20`
- `GET /api/users/{id}`
- `PATCH /api/users/{id}/status`
- `GET /api/registration-requests?search=&status=&page=0&size=20`
- `GET /api/registration-requests/{id}`
- `POST /api/registration-requests/{id}/approve`
- `POST /api/registration-requests/{id}/reject`

Managers cannot self-lock or lock other managers through the normal user management endpoint. Only `ACTIVE` and `INACTIVE` approved users can be locked/unlocked.

Approve assigns the requested role and activates the user. Reject requires a reason and marks both request and user as rejected.

## Verification

`backend/mvnw.cmd test` runs unit/API-security tests without requiring a database.
`IntegerIdsMigrationTest` is opt-in through `RACEFORGE_MIGRATION_TEST_URL` and
requires a fresh pre-V2 clone named `RaceForge_IdMigrationTest_*`; never point it
at real data. It checks rollback, foreign keys, row counts, password preservation
and generated integer IDs. After migration, run `mvnw.cmd -Dtest=AuthDatabaseIT test`
against the same clone to test registration, OTP persistence, Google storage and
USER permissions with real SQL Server and mocked email/Google verification.

The frontend is still an in-memory prototype: its login/OTP demonstrations are
not connected to this backend. Prototype IDs are integers and basic accounts
use the USER role; real authentication and password hashing happen in the backend.
