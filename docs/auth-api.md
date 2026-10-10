# RaceForge User/Auth API

## Required configuration

Copy `backend/.env.example` into your local environment and provide real values for:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` for the SQL Server `RaceForge` database.
- `JWT_SECRET` and `OTP_HMAC_SECRET`, each at least 32 random bytes.
- `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, and `MAIL_FROM` for OTP/reset email delivery.
- `GOOGLE_CLIENT_ID` for Google ID token verification.
- `FRONTEND_URL` for password reset links.

Missing SMTP or Google configuration returns `503` for email/Google flows. The backend does not silently fake delivery or Google login.

## Migration

Run the Spring Boot application or:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Flyway runs `V1__account_auth.sql`. The script uses SQL Server existence checks, preserves existing data, seeds the five role IDs, adds auth tables if missing, and adds `User.email_verified`, `User.avatar_url`, and `User.requested_role_id` when absent.

## Authentication endpoints

All responses use the existing `ApiResponse` envelope.

`POST /api/auth/register`

```json
{
  "fullName": "Nguyen Van A",
  "email": "owner@example.com",
  "password": "StrongPass123",
  "phone": "0900000000",
  "requestedRoleId": "ROL005"
}
```

Allowed public registration role IDs are `ROL002`, `ROL003`, `ROL004`, and `ROL005`. `ROL001` manager registration is rejected.

`POST /api/auth/verify-email`

```json
{ "email": "owner@example.com", "otp": "123456" }
```

On success, the account becomes `PENDING`, one pending registration request is created, and active managers receive notifications.

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
