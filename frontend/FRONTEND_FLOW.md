# Frontend workflows connected to backend branch N

The frontend calls the contracts present in backend branch `N`; IDs and role names come from API responses. The existing visual system remains in use. Only frontend files were changed.

| Workflow | Frontend integration | Backend API limitation |
| --- | --- | --- |
| Sign in and registration | Login, owner-only public registration, OTP, Google auth, refresh/logout and password recovery use `/api/auth`. Staff activation uses the emailed single-use token. | Owner-only registration is also enforced by the backend. |
| Admin and staff | Admin lists accounts, invites manager/trainer/vet/groom, resends invitations, activates/deactivates accounts, grants/revokes permissions and reads permission audit history. Admin account bootstrap skips business endpoints that reject Admin. | The API has no permission-catalog endpoint; the UI uses the permission codes seeded by branch N and unions them with codes returned for roles. There is no staff role-change endpoint. |
| Horse registration and review | Owner creates and edits the API-supported profile fields, submits for admission, and can view manager approval/rejection. Horse ID, UELN, image URL, document URL/type and race history use server data. Search uses horse name, ID or registration number. | The API has no microchip verification, file upload, photo album, separate achievement CRUD, or post-approval change-request workflow. Unsupported edits are not saved locally. |
| Multiple trainers | Manager creates a horse-level assignment request; trainer sees and accepts/declines it. Package-level assignments support manager assignment, trainer response, replacement/end and history. Accepted trainers are read from the horse trainer relation. | A pending request does not become an active trainer until the trainer accepts, as enforced by N. |
| Veterinary workflow | Manager assigns/reassigns a veterinarian; veterinarian accepts/declines. The examination form sends a non-persisting evaluation preview before saving a draft, then confirms the record. Medical history, previous exam, lock history and unlock use API responses. | The API requires an accepted assignment before examination. The frontend keeps the server's recommendation visible and requires an override reason when the veterinarian chooses a different conclusion. |
| Packages and payment | Owner registers a horse for an eligible package, reviews the pending registration, then simulates success/failure. Dates and payment status come from the server. Manager and owner package histories are loaded from their respective endpoints. | Branch N exposes package creation and read APIs but no package edit/status endpoints; those controls stay disabled. |
| Training roadmap and sessions | Head trainer loads paid-package medical context, generates and confirms a recommendation, creates/edits a staged plan, generates sessions, then records start/stop/attendance/adjustment/results and feedback. Vet protocols can be drafted, approved or retired. | The server validates eligibility, package window, stages, and session completion. Roadmap generation is through the plan endpoint; no local session records are fabricated. |
| Recovery | Manager approves recovery package registration and resumes an original package; owner simulates recovery payment. Vet manages recovery protocols. | Recovery actions require the backend's package and medical preconditions. |
| Notifications | Reads backend notifications, displays unread state and marks items read through the API. | Admin notification access is not exposed by the current business-role security rules. |

Medical reference ranges shown in the examination UI are for adult horses at rest: temperature 37.2–38.3 °C, resting heart rate 28–48 bpm and respiratory rate 8–14/min, sourced from [Rutgers Equine Science Center FS1262](https://njaes.rutgers.edu/fs1262/). The backend evaluation preview remains authoritative for its decision rules.

## Validation

Run the backend from branch `N`, then run `npm run dev` in this directory. Vite proxies `/api` to `localhost:8080`; set `VITE_API_BASE_URL` when the backend uses another origin.

- `npm run typecheck` and `npm run build` check TypeScript and production bundling.
- `npm test` covers the HTTP client, session lifecycle, medical ranges, mapping, roles, package status and roadmap IDs.
- `node tests/live-smoke.mjs` exercises the existing UI against a mocked API; it does not verify mail delivery, database migrations, permissions or real backend transactions.
