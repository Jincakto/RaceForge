# Session change sets

Source: `D:\SWP391\RaceForge-premain4-premain\RaceForge-premain4`.

Các tên dưới đây là **nhãn bàn giao**, không phải branch/tag/commit. Không có commit hoặc push tự động.

## session-back-end-up

Mốc backend Post-Training Assessment đã làm trước frontend: contract, validation/scoring, persistence chuẩn bị, Complete/Attendance, notification/Start guard, Medical linkage và unit/controller tests.

- Snapshot trước thay đổi frontend: [session-back-end-up.patch](./session-back-end-up.patch).
- Danh sách file và hash tại thời điểm chụp: [session-back-end-up.files.json](./session-back-end-up.files.json).
- Báo cáo lịch sử: [TRAINING_ASSESSMENT_BACKEND_REPORT.md](../../backend/docs/TRAINING_ASSESSMENT_BACKEND_REPORT.md).
- Mốc này có quy tắc cũ: mỗi Concern phải có note. Quy tắc đó đã được người dùng thay thế trong mốc dưới.
- Kết quả kiểm tra lịch sử: 484 unit/MockMvc/regression PASS. Schema và kiểm chứng DB vẫn hoãn.

## session-front-end-up

Phạm vi: chỉ Session/Assessment. Không thay giao diện chuông, Medical, thanh tiến độ Plan, lịch tập hoặc các trang khác.

**Quy tắc mới được người dùng chốt ngày 10/11/2026:**

- Đủ 10 lựa chọn Pass / Concern observed; không chọn sẵn.
- Concern observed nghĩa là có dấu hiệu đáng lo được quan sát.
- Không có ô ghi chú riêng hoặc note bắt buộc cho từng Concern.
- Chỉ có một ô **Overall notes (optional)** ở cuối form, có thể để trống.
- Ghi chú chung dùng lại `CompleteSessionRequest.performanceNotes` / Session evaluation; frontend trim và giới hạn 1.000 ký tự. Không thêm field/cột/bảng cho ghi chú này.
- `failNotes` legacy vẫn được backend đọc để tương thích; khi có dữ liệu cũ, các kiểm tra kiểu/mã/độ dài vẫn áp dụng.
- Reason cho hành động **Request a Vet Check** là nghiệp vụ riêng của API gửi tay, tiếp tục bắt buộc; không phải ghi chú từng tiêu chí.
- Không thay đổi điểm, override, auto notification, pending review hoặc Medical Lock.

Thay đổi frontend: form checklist/template, preview, summary/detail readonly trong Session, gửi vet thủ công, hiển thị lý do chặn Start, typed Complete payload và adapter tests.

Thay đổi backend tối thiểu đi kèm: bỏ yêu cầu failNote khi false, cập nhật mô tả Swagger và test. Do đó mốc frontend có một phần sửa backend để tương thích quy tắc mới.

Kết quả mới nhất:
- Backend compatibility: **492 PASS**, 0 failure/error/skipped; log `backend/target/session-front-end-up-backend-compat.log`.
- Frontend focused: **99/99 PASS** (Session/Assessment, schedule, loading, clock, preview).
- `npm run typecheck`: PASS; `npm run build`: PASS, bản build đã cập nhật sau chỉnh accessibility cuối.
- Full frontend: **235 tests; 225 PASS, 10 FAIL**. Đối chiếu HEAD trong thư mục tạm: **189 tests; 177 PASS, 12 FAIL**. Cả 10 lỗi hiện tại đã có ở HEAD; hai test Start cũ được cập nhật cho hành vi cho phép khác ngày đã có trong source.
- Visual: đã chụp form thật ở 1440, 1024, 768, 390 và 320px; các trạng thái Normal, Urgent và Waiting ở 390px. Rà ảnh không thấy cắt/tràn nội dung. API được mock, không có tài khoản hoặc database thật.
- Automated layout checker của skill: **ERROR**, dừng ở `Cannot read properties of undefined (reading 'map') / r.sections is not iterable`; không báo PASS hoặc sửa kit để né lỗi. Không chạy lại checker. Các quy tắc hero/landing page không được áp vào màn hình nghiệp vụ Session theo phạm vi đã chốt.

Không SQL/migration/database, không commit/push. Bell/deep link/Medical UI và kiểm chứng end-to-end còn hoãn.

## Sửa hoặc gỡ về sau

1. Xác định muốn sửa/gỡ mốc nào bằng đúng nhãn.
2. Đọc manifest và diff hiện tại trước; có file backend được cả hai mốc chạm tới.
3. Gỡ frontend trước nếu gỡ cả hai; gỡ backend đơn lẻ cần xem tương thích với frontend đang giữ.
4. Patch là bản đối chiếu để phục hồi chính xác; chỉ áp dụng sau khi kiểm tra conflict và bảo toàn các thay đổi mới hơn.
5. Không dùng reset/checkout toàn repository hoặc xóa nguyên thư mục module để gỡ feature.

Mỗi patch chỉ chứa source/test/docs thuộc mốc; không chứa node_modules, dist, target, ảnh kiểm tra, token hoặc dữ liệu database.

## API và kiểm tra của session-front-end-up

| API | Frontend dùng trong đợt này |
|---|---|
| GET /api/training-assessments/template | Tải đúng 10 tiêu chí/version; lỗi có Retry và chặn Save |
| PATCH /api/training-sessions/{id}/complete | Measurements + assessment; không nhận điểm/mức từ UI; performanceNotes tùy chọn |
| GET /api/training-sessions/{id}/assessment | Mở chi tiết readonly; 404 là lịch sử chưa có assessment, 403 giữ thông báo quyền |
| POST /api/training-sessions/{id}/vet-notification | Trainer hiện tại có assignment accepted gửi reason; backend quyết định recipient/pending |
| PATCH /api/training-sessions/{id}/start | Hiển thị pending/code từ server; không khôi phục kiểm tra trùng ngày dự kiến |

Không dùng API target từ chuông hoặc thêm UI khám trong đợt này. Giữ luồng HR/RecoveryReview độc lập. Overall notes được đọc lại từ Session evaluation, không suy ra từ notes lịch dự kiến.

Lệnh kiểm tra thực tế (cwd frontend):

```powershell
npm test
npm run typecheck
npm run build
node --test tests/trainingAssessment.test.mjs tests/trainingAssessmentUi.test.mjs tests/trainingSchedule.test.mjs tests/trainingReadLoading.test.mjs tests/trainingClock.test.mjs tests/sessionPreview.test.mjs
```

Logs: `frontend/session-front-end-up-{tests,baseline-tests,focused-tests,typecheck,build}.log`.
Ảnh/checker log: `backend/target/session-front-end-up-visual/`. Các file này là artifacts, không nằm trong patch.

Các lỗi full suite còn tồn tại, đã tái hiện trên HEAD:

1. Owner health-profile missing/error expectations.
2. Admin loading expected business API calls.
3. Admin createTrainerProfile action expectation.
4. Trainer professional profile load/update expectation.
5. Trainer-selected stage times fixture.
6. Trainer-selected intensity fixture.
7. English source scan (text cũ ngoài phần mới).
8. Trainer profile/protocol render text expectation.
9. Account creation expected automatic professional profile.
10. Account partial-success/retry expected professional-profile creation.

Không sửa các nghiệp vụ đó vì người dùng yêu cầu giữ nguyên phần khác.

### Đối chiếu T01–T42 cho đợt frontend giới hạn Session

PASS dưới đây chỉ là unit/SSR/fetch mock; không thay thế DB hoặc browser end-to-end.

| Test | Kết quả trong phạm vi đợt này |
|---|---|
| T01–T03 | PASS — mặc định chưa chọn, 9/10 chặn, kiểu/key/version/DTO kiểm tra đúng |
| T04 | PASS theo yêu cầu mới — Concern không cần note riêng |
| T05 | PASS theo yêu cầu mới — Overall notes tùy chọn, trim/max 1.000; backend legacy notes vẫn kiểm tra khi có |
| T06–T17 | PASS — preview đủ biên/override, summary dùng kết quả server, nhãn thân thiện |
| T18–T23 | PASS bằng mock/SSR — Normal gửi tay không tự pending, chống gửi lặp, waiting, current assignment/recorder; DB delivery/assignment DEFERRED |
| T24 | DEFERRED theo người dùng — mở từ chuông/deep link |
| T25–T29 | Backend mock đã có bằng chứng ở mốc trước; frontend Medical/chuông và DB DEFERRED |
| T30–T33 | PASS bằng mock — pending/code theo ngựa chặn Start UI, không tự xóa hold; DB/API server thật DEFERRED |
| T34–T35 | Backend regression PASS; frontend giữ Stop/measurements/MISSED cũ; kiểm chứng DB DEFERRED |
| T36 | PASS bằng mock cho khóa gửi lặp và duplicate-409 đọc lại assessment; hai request DB đồng thời DEFERRED |
| T37–T38 | Backend propagation/lock-order mock PASS; rollback/race thật DEFERRED |
| T39 | PASS — lịch sử không dựng 10 Pass, 403 khác 404 |
| T40 | PASS — regression HR/measurement timestamp; không thay schedule từ assessment |
| T41 | PASS mock/SSR và backend authorization; quyền thật với DB DEFERRED |
| T42 | PASS SSR/ảnh — nhãn tiếng Anh, không render enum; ngoài Session không sửa |

Skill được áp dụng: [design-taste-frontend](D:/SWP391/RaceForge-main/.agents/skills/design-taste-frontend/SKILL.md). Chỉ phần form, bố cục, typography, accessibility, focus/reduced motion và công cụ screenshot theo phạm vi người dùng; không đổi palette/font chung, thêm hero, ảnh hoặc hiệu ứng nền.

Snapshot frontend: [session-front-end-up.patch](./session-front-end-up.patch) và [session-front-end-up.files.json](./session-front-end-up.files.json). Patch này là delta sau snapshot backend, gồm cả thay đổi bỏ bắt note riêng phía backend.

Patch frontend đã được kiểm tra áp/gỡ trong bản sao tạm; sau gỡ frontend, patch backend vẫn kiểm tra gỡ được. Không áp/gỡ vào source đang làm. Manifest frontend ghi 26 file (16 frontend và 10 backend tương thích/tài liệu).
