# Frontend / Backend contract audit

Audited on 2026-10-12 against the fetched RaceForge refs. Only `frontend/` is changed; no BE code or BE branch was merged.

- `origin/User`: `46d6dd6e4449e64e7b82360c9da04487faa9a288` (AuthController, AuthResponse, UserResponse, RoleResponse).
- `origin/Horse`: `e6dacc8c252d1c04dde24d7fc064d47a55abe904` (Horse, Medical, Training Package, Recovery and Package Resumption controllers/services/DTOs).
- These are separate backend branches. Horse currently uses Basic security, while User provides JWT. A deployed BE must combine compatible authentication/contracts before live integration can be verified. This frontend does not modify or merge BE to do that.

## Run and modes

Run commands from `frontend/`: `npm ci`, `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Without `VITE_API_BASE_URL`, the existing supplied UI runs in explicitly labelled DEMO mode. Demo data remains in React memory until a page reload. Sign out and use the quick login accounts to test the owner → CM → veterinarian → owner flow within one tab. Demo accounts use password `123456`. IDs are numeric; local demo IDs are never used as persisted API IDs.

To use a real server, copy `.env.example` to `.env.local`, set `VITE_API_BASE_URL` to the server origin (without `/api`) and restart Vite. Access tokens remain in memory and use `Authorization: Bearer`. Requests include credentials for the HttpOnly refresh cookie. Refresh/logout adapters are provided; expired or rejected sessions require login again. No password/token is persisted in localStorage. A 401 clears the session and returns to login; 403 displays an error without signing out. Mutations are not automatically retried. Live mode uses API data and never falls back to seed demo users/horses.

## Verified routes and DTO details

| Function | Method and route | Contract |
| --- | --- | --- |
| Login | POST `/api/auth/login` | `{email,password}` → accessToken, tokenType, expiresInSeconds, user |
| Register | POST `/api/auth/register` | fullName, email, password, phone, requestedRoleId (number or null) |
| Email OTP | POST `/api/auth/verify-email`, `/api/auth/resend-otp` | `{email,otp}` / `{email}`; OTP delivered by BE, not displayed/generated in live UI |
| Refresh / Logout | POST `/api/auth/refresh`, `/api/auth/logout` | Cookie credentials; no mandatory request body |
| Horse create | POST `/api/horses?ownerId={number}` | HorseCreateRequest descriptive fields only; no status, lock or clearance override |
| Horse list / detail / edit | GET `/api/horses`, GET / PUT `/api/horses/{horseId}` | HorseResponse uses horseId, horseName, coatColor, background, healthStatus, trainingLocked |
| Medical draft | POST `/api/medical/records` | profileId, optional correctionOfId, examType, examinedAt, healthStatus, clinicalExams, vitalSign and notes; server sets veterinarianId |
| Update draft | PUT `/api/medical/records/{id}/draft` | MedicalRecordUpdateRequest; no examType/profileId override |
| Confirm | POST `/api/medical/records/{id}/confirm` | **No request body**; returns MedicalRecordResponse |
| Medical history | GET `/api/medical/horses/{horseId}/records` | DRAFT and CONFIRMED; show systemNote, trainingNote, healthStatus separately |
| Previous exam | GET `/api/medical/horses/{horseId}/previous-examination` | Latest CONFIRMED; HTTP 204 means none |
| Unlock / history | POST `/api/medical/horses/{horseId}/training-lock/unlock`, GET corresponding `/history` | Explicit veterinarian action with `{reason}`; READY never automatically clears a lock |
| Package catalog | GET `/api/training-packages` | packageId, packageName, packageType, durationDays, price, status |
| Register package | POST `/api/horse-packages/register` | `{horseId,packageId}`; owner; pending package/payment |
| Package history | GET `/api/horse-packages/horse/{horseId}` | **Owner-only**, not callable by CM |
| Normal payment | POST `/api/horse-packages/{id}/simulate-payment` | `{successful:boolean}`; simulation only |
| Recovery approval | POST `/api/horse-packages/horse/{horseId}/approve-recovery` | CM; `{recoveryPackageId,reason}`; normal package pauses at approval |
| Recovery payment | POST `/api/horse-packages/{id}/simulate-recovery-payment` | Owner; `{successful:boolean}` |
| Resume | POST `/api/horse-packages/{recoveryId}/resume-original` | CM; `{reason}`; returns the **original** resumed HorsePackageResponse, not Recovery |

The API envelope is `{success,message,data,timestamp}`. Errors expose message/status and optional validationErrors. HTTP 204 is handled before JSON parsing. Numeric path/query identifiers are checked before requests. UI select values are converted from DOM strings to numbers.

Medical health states are READY / INJURED / QUARANTINED. Exam types are INITIAL / PERIODIC / FOLLOW_UP. Initial and periodic examinations require LEGS, EYES, RESPIRATORY, SKIN, MOVEMENT and GENERAL_CONDITION. Conditions and severity follow MedicalClinicalExamValidator. A draft may be incomplete; Confirm remains a separate server-validated action. Confirmed records are read-only. Editing a draft makes Confirm unavailable until Save Draft succeeds. READY retains existing Training Lock; only explicit veterinary Unlock with a reason can clear it.

Package catalog types are BASIC / RACING / PERFORMANCE / RECOVERY. UI displays raw package and payment states (including PENDING, PAUSED, ACTIVE, COMPLETED, CANCELLED, PAID and FAILED), dates, price, remaining days and replacedHorsePackageId. Failed Recovery payment does not auto-resume the original.

After successful mutations, frontend reloads supported authoritative horse, medical, lock and catalog data; owners also reload package history. A reload failure blocks further mutations and asks for an explicit reload, preventing accidental duplicate requests. Successful Resume reconciles the returned original plus the known Recovery as COMPLETED, matching PackageResumptionService. CM can submit an actual Recovery ID because its backend role cannot read owner package history. Unknown package history is never fabricated; the returned original is shown and a subsequent owner login retrieves full authoritative history.

## Missing BE capabilities exposed by the UI

1. No CM horse-registration approval endpoint exists in the inspected HorseController. Demo approval implements the intended progression to Initial Medical. Live approval is disabled with an explanation. **Activate is not used as approval.**
2. HorseResponse has no profileId and no Health Profile lookup endpoint was found. Live Medical requires an actual supplied profileId and a manual acknowledgement that CM approval was checked externally. Frontend does not equate horseId and profileId or claim to verify approval through an unavailable endpoint.
3. UserResponse has no clubId; live users are not assigned a demo club. Role names are mapped from the real RoleResponse, not guessed role IDs. Live registration accepts the actual requestedRoleId or null.
4. CM cannot fetch owner-only package history. CM uses actual Recovery IDs for Resume; BE remains the authority for ownership, payment and lifecycle validation.
5. Payments in these controllers are simulations; no real checkout or charge is implemented.

## Verification scope

Tests cover JWT expiry/401/403, credentials, bodyless Confirm, 204 responses, numeric IDs, route/payload contracts, normal package eligibility, no automatic unlock, Resume reconciliation, nullable medical draft rendering, notes, lock/payment UI, owner scope and existing page SSR rendering. The original source-hash checks remain for untouched declarations/styles; deliberately changed auth/layout/model declarations are excluded and covered by behavior/rendering tests instead.

Validation uses mock fetch plus Vite SSR and TypeScript/lint/build. No deployed backend round trip or browser click-through is claimed. BE authentication unification, CM approval and Health Profile discovery remain backend integration dependencies listed above.

## Integration with Phuc frontend

The active entry is now Phuc's `main.jsx` / `App.jsx` / `AppRoutes.jsx`. All JSX and retained TS/TSX imports use explicit extensions to avoid duplicate-basename resolution. Domain IDs in Phuc's seed data, declarations, selects and horse URLs are numbers as well. `apiClient.js` delegates to the existing TypeScript HTTP/JWT client; there is no second localStorage token store. `VITE_API_URL` is accepted for compatibility and normalized to the server origin.

Phuc's forms and pages remain the demo UI; their Medical, enrollment, recovery and resume mutations use pure transitions in `utils/phucWorkflow.js`. Drafts never affect training eligibility. Normal packages remain pending until simulated payment succeeds. Explicit Unlock leaves paused packages untouched; CM Resume completes Recovery and resumes the linked original. Schedules require trainer reconfirmation. Live API mode loads `/api-workflow` using the existing verified DTO adapters, not demo mutations or fabricated endpoints. Role scope is applied before routing data into pages; CM retains access to pending horse requests belonging to its club.

Backend audit refs and missing endpoints above remain unchanged. The integration merges frontend history only and does not edit backend code. Full verification adds `tests/phuc-integration.test.js` for registration/approval/medical/payment/recovery/resume, owner and club scope, numeric IDs, primary React Router/AppProvider and rendering Phuc's role pages. Browser interaction and deployed BE round trips have not been run.
