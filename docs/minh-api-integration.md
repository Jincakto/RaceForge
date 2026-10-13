# Nửa 1 — API integration (minh/api)

## Run locally

1. Run the existing Spring Boot backend with its local database configuration.
2. Flyway applies V7__horse_admission.sql. Back up existing data before migrations; ACTIVE legacy horses retain approved admission. Admission for other legacy horses starts NOT_SUBMITTED.
3. Create frontend/.env from .env.example and set VITE_API_BASE_URL=http://localhost:8080 (without /api).
4. Restart Vite after changing .env. Local .env files are ignored by Git.

## Live workflows

- Access tokens remain in memory. Refresh uses the HttpOnly cookie, restores sessions on reload, and retries authenticated requests once after 401. Logout invalidates pending refresh responses.
- Profile reads/writes /api/users/me; password changes use /api/users/me/password and sign out afterward.
- RaceForge has one club. Verified USER accounts submit a requested business role through POST /api/users/me/registration-request. They can track and resubmit rejected requests. Managers review the existing paginated registration API; approval assigns the requested role.
- Managers list/filter users and lock/unlock approved accounts. Roles are assigned at membership approval; this implementation does not invent a separate role-change endpoint.
- Permissions apply to a whole role, using the existing permission API. The new catalog lists available permission codes. MANAGE_PERMISSION stays exclusive to managers and cannot be revoked.
- Owners create/read/edit their horses, submit admission, and select an active verified trainer. Managers review pending admissions. Admission is separate from activation and medical eligibility.
- Approval creates the horse health profile in the same transaction. Medical & Training loads its actual profile id from GET /api/horses/{id}/health-profile instead of manual entry.
- Trainer lists are paginated and expose only public profile fields available in the current model (id, name, avatar); experience/certification fields are not present in the database.

## New backend endpoints

- POST /api/users/me/registration-request
- GET /api/admin/permissions/catalog
- POST /api/horses/{id}/admission
- POST /api/horses/{id}/admission/approve
- POST /api/horses/{id}/admission/reject
- GET /api/horses/{id}/health-profile
- GET /api/trainers and GET /api/trainers/{id}
- PUT /api/horses/{id}/trainer

Owner mutations and horse reads are authorized on the server. Admission rows are locked during review to prevent duplicate decisions. Approval does not set READY, unlock training, or resume packages.

## Verification

Frontend: npm run typecheck, npm run build, npm run lint, npm test.
Backend: ./mvnw test (Java 17 or newer).

Recommended manual sequence: register/verify USER → request role → manager approve → reload to restore session → edit profile → owner create horse → submit → manager approve → vet opens medical with real profile id → owner selects trainer. Also verify another owner cannot read/edit the horse and rejected requests retain their notes.

Nửa 2 (schedules, sessions, care, inventory, reports, race results, notifications and dashboards) remains outside this change. The live sidebar exposes implemented pages only.
