# FE–BE integration

This change only edits frontend files. Existing backend changes in the working tree are not part of this integration. The existing components, CSS, page structure and navigation remain in use. A few existing form fields/labels now represent the fields actually accepted by the API (UELN, package type, exercise/recovery measurements).

## Run

### Current authorization blocker (21 October 2026)

Read-only inspection confirmed the existing DB catalogue is ADMIN=1,
CLUB_MANAGER=2, HEAD_TRAINER=3, VETERINARIAN=4, GROOM=5, HORSE_OWNER=6.
`AccountConstants.java` instead uses ADMIN=7, CLUB_MANAGER=1,
HEAD_TRAINER=2, VETERINARIAN=3, GROOM=4, HORSE_OWNER=5. The business
security gate tests those numeric constants and excludes the actual owner role 6,
even for an ACTIVE, email-verified owner. This explains the authenticated 403s.

The user explicitly chose to keep BE unchanged. FE now retains the returned
role ID, sends staff role IDs matching the actual DB, stops cascading business
requests after a global ACCESS_DENIED and displays one actionable error. This
does **not** grant access or resolve BE's inconsistent authorization. Aligning BE
constants with the DB remains necessary before this owner can use protected APIs.

```powershell
cd frontend
npm run dev
```

The default development proxy sends `/api` to `http://localhost:8080`. Override `VITE_API_PROXY_TARGET` in a local frontend `.env` if needed. `VITE_API_BASE_URL` defaults to `/api`. For a production static host, configure its reverse proxy for `/api`, or set an explicit API base URL and configure the existing BE's CORS/cookie settings outside this change. Never put passwords or server secrets into `VITE_*` variables.

Development uses port **5173** with `strictPort: true`, matching the existing BE
email link configuration. If another process occupies 5173, Vite stops with an
error instead of silently serving this FE on 5174. Stop the duplicate FE process
before starting this project; do not change the email link to a fallback port.

### Staff email password setup

- Admin creates staff through the existing API. BE creates an `INVITED` account
  with its assigned role and emails the single-use invitation link.
- Opening `/reset-password?invitation=true&token=…` uses the existing login layout
  in password-setup mode. FE does not restore a previous browser session on this
  visit, including an existing admin session. A late refresh also cannot redirect
  over a password link.
- The email field is disabled in setup mode: the token identifies the account.
  Submission sends only `token` and `newPassword` to `/auth/staff/set-password`.
  Ordinary reset links continue to use `/auth/reset-password`.
- Password length is checked at 8–100 characters. In-flight submission is locked
  against repeated clicks/Enter. Invalid/expired/used invitations explain that the
  user needs the newest invitation email from admin. Network errors allow retry.
- On success, FE removes the token URL, clears the password and email fields,
  and presents normal login with a success message. It does not automatically log
  in as the browser's previous user or select a role locally.
- Automated checks cover the HTTP boundary, session-restore races and rendering
  of the actual login component. No real invitation email was sent for these
  checks; real-mail end-to-end validation requires a designated test account.

The backend is a single-centre API. The old UI's club filters use an internal `api-center` key, not a database club ID. No club membership or role assignment is simulated.

## Existing tabs and API operations

| Screen / tab | API operations connected |
| --- | --- |
| Public registration | `POST /auth/register`, `/auth/verify-email`, `/auth/resend-otp`. Payload contains full name, email, password and phone only. BE assigns **HORSE_OWNER**. Groom is staff, not public registration. |
| Sign in / sign out | `POST /auth/login`, `/auth/refresh`, `/auth/logout`. Access token stays in memory; refresh cookie uses `credentials: include`. Concurrent expired requests share one refresh. A 403 does not trigger a refresh. |
| Staff invitation / password link | Existing login screen handles `?invitation=true&token=…` with `POST /auth/staff/set-password`; other reset tokens use `/auth/reset-password`. No locally generated staff passwords. |
| Admin accounts | Paginated `GET /users`, `POST /admin/users`, `PATCH /users/{id}/status`, `POST /admin/users/{id}/invitation`. Manager, trainer, veterinarian and groom role IDs match the existing DB catalogue. BE's inconsistent numeric role checks remain a blocker as described above. |
| Admin permissions / history | `GET /admin/permissions/{roleName}`, `/audit-log`, `POST /grant`, `DELETE /revoke`. Mutable training permissions are mapped to the real permission codes. Features secured directly by BE role checks cannot be granted by a UI-only switch. |
| Profile | `GET /users/me`, `PUT /users/me`. Email and role are not edited through this API. |
| Horse list / my horses | `GET /horses`; search the returned authorized horses by name, actual horse ID or UELN. Canonical genders are Stallion, Mare and Gelding. |
| Horse registration / profile | `POST /horses`, `PUT /horses/{id}`, `POST /horses/{id}/admission`. Real BE IDs are retained. UELN is 3 country digits + 12 alphanumeric characters; it is not an ISO microchip number. Image/document URLs use BE fields. Approved registration fields stay locked. |
| Race history / awards | `GET/POST /horses/{id}/race-history`, `PUT/DELETE /horses/race-history/{id}`. Awards are derived from persisted race results, placing and prize, not a separate local collection. |
| Multiple trainers | `trainerIds` and the trainer-history tab retain all relationships. Requests use `POST /horses/{id}/trainers`; removal uses `DELETE /horses/{id}/trainers/{userId}`. Direct requests appear on the trainer's existing acceptance tab via `/trainers/assignments/mine`, `/accept`, `/decline`. |
| Intake / veterinary assignment | `GET/POST /medical/assignments/horses/{horseId}`, `GET /medical/assignments/mine/history`, `/accept`, `/decline`. Replacement is a new BE assignment, preserving history. Intake decisions use `/horses/{id}/admission/approve` and `/reject`. |
| Examination | `GET /horses/{id}/health-profile`, `POST /medical/horses/{id}/evaluation`, `POST /medical/records`, `PUT /medical/records/{id}/draft`, `POST /medical/records/{id}/confirm`. The selected decision is saved in the draft before confirmation. A failed confirmation retains the BE draft ID for retry. |
| Examination history | `GET /medical/horses/{id}/records`; the existing history/comparison UI uses returned record IDs, dates, clinician IDs, measurements, clinical findings and confirmed conclusions. The previous-exam panel uses the latest confirmed record, excluding drafts. |
| Package catalogue | `GET /training-packages`, `/all`, `POST /training-packages`. Existing package form uses the actual BE package types BASIC, RACING, PERFORMANCE and RECOVERY. The API has no purchased session-count field; actual session counts come from generated sessions. |
| Package registration / payment | `GET /horse-packages/horse/{horseId}`, `/manage/horse/{horseId}`, `POST /horse-packages/register`, `/{id}/simulate-payment` or `/simulate-recovery-payment`. Both success and failure scenarios are sent to BE. Cancellation sends no payment. An unpaid pending registration is reused on retry. Receipts require BE `paymentStatus=PAID`. |
| Trainer package assignments | `GET /trainer-profiles`, `POST /trainer-assignments`, `/{id}/replace`, `GET /trainer-assignments/me`, `/{id}/respond`, `GET /horse-packages/{id}/trainer-assignments`. Profile IDs and user IDs are mapped separately. Pending requests remain visible before private horse access is granted. |
| Training plan | `GET /horses/{id}/training-plans`, `GET /horse-packages/{id}/training-context`, `POST /horse-packages/{id}/training-recommendations`, `POST /horses/{id}/training-plans`. The wizard uses BE's approved protocol recommendation, not the old client score/weight algorithm. Dates must equal the paid package period. |
| Session preview / generation | `GET /training-plans/{id}/stages`, `POST /training-plans/{id}/generate-sessions`. Bulk preview uses stored stage weekdays, dates and times. A changed preview is rejected instead of silently generating a different schedule. Single-session creation uses `POST /training-sessions`. |
| Schedule / results | `GET /training-sessions/horse/{horseId}`, `PATCH /training-sessions/{id}/start`, `/stop`, `/complete`; `PUT /{id}/attendance` with `MISSED` for absence. BE has no separate PRESENT-only action. Existing result inputs collect actual km, average speed, end-exercise HR and recovery HR. Recovery submission is checked by BE against its stopped-at timestamp and the two-minute minimum. |
| Recovery | Manager approval uses `POST /horse-packages/horse/{horseId}/approve-recovery` with actual RECOVERY package IDs. Veterinary unlocking uses `POST /medical/horses/{id}/training-lock/unlock`. |
| Notifications | `GET /notifications` with pagination, `PATCH /notifications/{id}/read`. |
| Performance | Existing charts use returned session/race data. Unsupported fitness and AI metrics show no value rather than demo scores. |

Paths in the table are relative to `/api`.

## BE/UI boundaries still relevant before a complete demo

- There are no controller routes for editing/disabling packages, an independent achievements collection, a photo gallery, stable/stall persistence, evidence notes, post-approval edit requests, care, inventory or PDF reports. Existing screens remain, but unsupported writes report an error and do not show a successful save. Approved horse registration data cannot be changed through BE.
- BE supplies horse image/document URLs, not a file upload endpoint. Additional photos cannot be persisted as a gallery.
- The BE permission API does not support per-user page permissions or arbitrarily changing a business account's role. Staff roles are selected only when admin creates staff. Public registration always remains owner-only.
- Trainer profile/protocol lifecycle endpoints exist but have no corresponding management forms in the current UI. Recommendation creation requires an existing active Trainer profile and an approved veterinarian protocol for the package/weight band. This integration does not invent or automatically approve a medical protocol. If either is missing, BE's error is shown. The current BE security chain also excludes ADMIN from general business endpoints such as `/trainer-profiles`, despite controller annotations mentioning ADMIN; this is left untouched.
- BE has recovery resumption endpoints (`resume-original`, `resume-after-unlock`), but the current manager UI has no resumption confirmation action. Unlocking is not reported as automatic resumption.
- `MedicalRecordResponse` exposes `veterinarianId`, not the doctor's name. FE resolves names from authorized user/assignment data where available; otherwise it displays the exact clinician ID. Owner accounts cannot fetch the staff directory to fill missing historical names.
- Identity verification is a manager review acknowledgement in the current browser session. There is no separate BE field/endpoint to persist that acknowledgement; admission approval is persisted by BE.
- Request outcomes are based on BE responses. No seeded users/horses/payments are merged into authenticated data, and a failed request does not grant permissions or create local substitutes.

## Clinical reference

The displayed reference ranges use [University of Arizona Cooperative Extension, Knowing What is Normal for Your Horse (2022)](https://extension.arizona.edu/sites/default/files/2024-08/AZ1986-2022.pdf): resting adult horses, temperature 99–101°F (approximately 37.2–38.3°C), pulse 25–40/min and respiration 8–24/min. Input sanity bounds are validation limits, not published diagnostic cutoffs.

BE's unmodified configured evaluator uses 37.5–38.5°C, 28–44 bpm and 10–20 breaths/min. The existing source text explicitly explains this difference. The save recommendation comes from the BE evaluation endpoint; the veterinarian still selects and confirms the final conclusion, including an override reason when appropriate.

## Validation

- `npm run build` includes TypeScript checking and the Vite production build.
- `npm test` includes actual HTTP/adaptor contract tests with mocked HTTP: owner-only registration payload, bearer/cookies, concurrent refresh, 403/error handling, canonical horse IDs and multiple trainers, medical draft/confirmation, payment failure/retry, and pending trainer access.
- On 21 October 2026, live BE health and OpenAPI were read from `localhost:8080`; the Vite `/api/health` proxy also returned HTTP 200.
- No real account was registered, no OTP/invitation email was sent, and no live medical/payment/permission data was changed during verification. All-role authenticated end-to-end browser testing remains unverified. The available browser could not reach the local Vite server, so no claim is made about visual browser QA.


Forgot password: màn hình đăng nhập dùng POST /api/auth/forgot-password với email, áp dụng cho mọi role đã có mật khẩu. Link email mở hai ô mật khẩu mới và xác nhận; FE chặn mật khẩu không khớp. Admin tạo nhân sự vẫn dùng email mời và /api/auth/staff/set-password. Đã bỏ thao tác đặt lại mật khẩu khỏi quản lý tài khoản. Không sửa BE; tài khoản INVITED chưa có mật khẩu phải dùng email mời ban đầu.


Club Manager: mở chi tiết ngựa đã duyệt và bấm Kích hoạt ngựa, gọi PATCH /api/horses/{id}/activate rồi tải lại dữ liệu. FE chặn đăng ký gói khi status còn INACTIVE ngay từ bước chọn ngựa và kiểm tra lại trước thanh toán. Kích hoạt không thay đổi kết quả khám hay khóa huấn luyện.


Trainer Profile: trang Profile có form giới thiệu/kinh nghiệm và chứng chỉ/bằng cấp (văn bản, tối đa 1000 ký tự mỗi trường). Đọc GET /api/trainer-profiles/{id}, đối chiếu user_id rồi cập nhật PUT với bio/qualifications. Không có API tra mã hồ sơ của bản thân; Trainer nhập mã do admin cung cấp (hiển thị trong bảng tài khoản admin). Không hỗ trợ upload chứng chỉ. Hồ sơ phải được admin tạo trước; lỗi phân quyền BE ở API tạo hồ sơ vẫn cần bản sửa đã đề xuất.


Veterinarian: Profile hoặc Khám sau tập & Khóa huấn luyện có quản lý phác đồ. GET/POST /training-protocols; POST /training-protocols/{id}/approve hoặc /retire. Tạo nháp với loại gói, khoảng cân nặng [min,max), giai đoạn và 1–6 ngày mỗi tuần, giờ bắt đầu/kết thúc, nguồn HTTPS thuộc danh sách BE, cơ sở áp dụng. Phê duyệt/ngừng sử dụng cần xác nhận; BE là nơi kiểm tra trùng khoảng và quyền cuối cùng. Không thêm dữ liệu mẫu chuyên môn hoặc tự công bố phác đồ. Trainer tải lại trang lập lộ trình sau khi bác sĩ công bố phác đồ phù hợp.
