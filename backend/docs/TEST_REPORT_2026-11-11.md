# RaceForge — báo cáo kiểm thử tối đa 10 lượt (11/11/2026)

Source: D:\SWP391\RaceForge-premain4-premain\RaceForge-premain4
Nhánh premain4. Không commit/push. Không ghi hoặc áp dụng SQL vào RaceForge gốc.

## Kết luận

Các nhóm Training, backend unit/controller, frontend và Chrome bên dưới đã đạt đủ 3 lần liên tiếp theo từng nhóm rồi được ngừng chạy. **Chưa thể kết luận toàn bộ dự án đã hoàn tất kiểm chứng:** Auth có DB mới đạt 2 lần sau sửa fixture ở giới hạn lượt 10; 5 ca lịch sử còn bị chặn bởi schema/migration hoặc artifact chưa có.

Không dùng test mock làm bằng chứng rollback/concurrency hay E2E có database thật. Không đánh đồng test Chrome dùng fixture với UI kết nối backend thật.

| Nhóm | Kết quả cuối | Các lượt đạt liên tiếp dùng để xác nhận |
|---|---|---|
| Backend unit/service/controller còn lại: 630 ca | PASS, đủ 3 lần | 1, 2, 3; không chạy lại sau đó |
| HorseAdmissionServiceTest: 8 ca | PASS, đủ 3 lần | 3, 4, 5 |
| BackendApplicationTests: 17 ca, gồm context/Swagger/quyền/ID | PASS, đủ 3 lần | 5, 6, 7 |
| HorsePackageLifecycleDatabaseTest | PASS, đủ 3 lần | 2, 4, 5 |
| TrainingAssessmentCodesDatabaseTest — SQL 07 | PASS, đủ 3 lần | 2, 4, 5 |
| TrainingCertificateDatabaseTest | PASS, đủ 3 lần với schema validate | 2, 4, 5 |
| TrainingCalendarFixDatabaseTest | PASS, đủ 3 lần | 4, 5, 6 |
| TrainingRoadmapDatabaseTest#schemaSeedTransactionIsolationAndSwagger | PASS, đủ 3 lần | 4, 5, 6 |
| TrainingAssessmentWorkflowDatabaseTest — HTTP + SQL thật | PASS, đủ 3 lần | 6, 7, 8; lượt 8 có XML Surefire làm bằng chứng |
| Frontend npm test: 258 ca | PASS, đủ 3 lần | 2, 3, 4 |
| Frontend TypeScript + Vite build | PASS, đủ 3 lần sau sửa remoteActions | 2, 3, 4 |
| Chrome Swagger: 10 tình huống trong script hiện có | PASS, đủ 3 lần | 5, 6, 7 |
| Chrome assessment: form/preview/submission/read-only/retry/mobile | PASS, đủ 3 lần | 7, 8, 9 |
| AuthDatabaseIT: 4 ca với SQL thật; email/Google mock | PASS ở lượt 9 và 10; **chưa đủ 3 lần** | 9, 10 |
| 4 test migration lịch sử | BLOCKED ở bước chuẩn bị schema tiền nhiệm | Xem mục còn chờ |
| Merged full-database SQL test | BLOCKED/NOT RUN: thiếu artifact đầu vào | Xem mục còn chờ |

655 ca backend unit/controller đã được kiểm tra theo nhóm; không phải tuyên bố một lệnh full-suite cuối cùng đã chạy xanh 3 lần. Các test DB là nhóm riêng. Số test frontend tăng từ 257 lên 258 do thêm kiểm tra chống tạo tài khoản trùng.

## Kết quả các lượt và nguyên nhân

| Lượt | Kết quả thực tế |
|---|---|
| 1 | Backend 655 ca: 636 pass, 19 error. Frontend 257 ca: 247 pass, 10 fail; build pass. DB 5 ca: 1 pass, 1 fail, 2 error, 1 skipped có điều kiện. |
| 2 | Backend vẫn 19 error: đã tìm tiếp dependency context và prefix UELN. Frontend 258/258 và build pass. DB 6 ca: 3 pass, 2 error, 1 skipped có điều kiện; SQL07/lifecycle/certificate pass. |
| 3 | Backend 655 ca: 638 pass, 17 error đều thuộc context Spring; các nhóm 630 ca còn lại đủ 3 lần nên nghỉ. HorseAdmission 8/8 pass. Frontend 258/258 và build pass. |
| 4 | Chỉ còn 30 ca backend/DB: 25 pass, 5 fail thuộc kỳ vọng API của context test; các DB hiện hành đều pass. Frontend 258/258 và build pass, nghỉ nhóm frontend. |
| 5 | 31 ca backend/DB: 30 pass, 1 fail ở test E2E mới do kỳ vọng lỗi constraint 500 trong khi handler đúng là 409. Context 17/17 pass. Các nhóm lifecycle/SQL07/certificate/HorseAdmission đủ 3 lần, nghỉ. Chrome Swagger pass. |
| 6 | 20 ca backend/DB đều pass, 0 skip. E2E thật pass; calendar/roadmap đủ 3 lần, nghỉ. Swagger Chrome pass. Browser assessment phát hiện selector test chưa tính số thứ tự trong legend; sửa test selector. |
| 7 | 18 ca context + E2E đều pass. Context đủ 3 lần, nghỉ. Hai script Chrome pass; Swagger đủ 3 lần, nghỉ. |
| 8 | E2E HTTP thật pass lần thứ 3, nghỉ. AuthDatabaseIT: 2 fail + 2 error do canonical fixture chưa có seq_business_OWN/ADM; tạo fixture sequence chỉ cho DB test. Browser assessment pass. |
| 9 | AuthDatabaseIT 4/4 pass. Browser assessment pass lần thứ 3, nghỉ. Thử dựng 4 DB migration lịch sử riêng: sau sửa QUOTED_IDENTIFIER cho sqlcmd, dựng schema tiền nhiệm bị chặn tại V4 vì thiếu cột của các bước chuyển đổi lịch sử không có trong source. Các DB đều được dọn. |
| 10 | AuthDatabaseIT 4/4 pass, DB tạm được dọn. Dừng theo giới hạn đã chốt, không tự chạy lượt 11 để nâng Auth lên 3 lần. |

Ở lượt 8, PowerShell ban đầu xử lý cảnh báo stderr của Mockito thành lỗi runner dù test process đã ghi kết quả. Runner đã được sửa để dùng exit code Maven; không sửa hoặc bỏ assertion. XML Surefire của E2E lượt 8 được lưu trong thư mục bằng chứng.

## Training đã kiểm chứng bằng database/HTTP thật

TrainingAssessmentWorkflowDatabaseTest dùng server cổng ngẫu nhiên, JWT thật, request HTTP thật và SQL Server riêng. Chỉ sự kiện xác nhận thanh toán là giả lập qua boundary hiện có; không gọi PayOS thật.

- Owner đăng ký gói, xác nhận thanh toán giả lập, Manager phân công, Trainer nhận và tạo Plan/lịch.
- Sai role không được Start; Owner không được đọc API assessment hoặc target chuông của Vet.
- Start/Stop/Complete lưu đúng một assessment và đủ 10 tiêu chí mới.
- Normal gửi tay khi chưa có Vet: WAITING_FOR_VET_ASSIGNMENT, không tạo pending chặn Start.
- Concern BALANCE: Recommended, tự thông báo Manager khi chưa có Vet, pending chặn buổi tiếp theo.
- Phân công/nhận Vet sau đó: cả yêu cầu Normal gửi tay và cảnh báo pending được chuyển đến Vet; target đúng Session.
- Đọc chuông không resolve. Medical DRAFT không resolve; Confirm FIT resolve đúng assessment đã liên kết.
- Concern SPEED_CONTROL: Urgent, tự gửi Vet. Confirm NOT_FIT resolve assessment nhưng giữ khóa y tế; Start tiếp tục bị chặn.
- Gây lỗi constraint lúc lưu Notification: HTTP 409 theo handler, Session không bị Complete và assessment không được lưu; bỏ lỗi thử lại thành công.
- Complete lặp trả 409; không tạo assessment trùng.

Các nhóm DB khác kiểm chứng:

- Start buổi có lịch hôm qua/hôm nay/ngày mai khi đủ điều kiện; giữ điều kiện assignment, gói, khóa và buổi chưa hoàn tất.
- Hủy đúng gói, chỉ xóa buổi SCHEDULED chưa Start; giữ thanh toán, assessment, Medical linkage và lịch sử.
- Complete gói chấp nhận COMPLETED/MISSED, bỏ qua CANCELLED, tạo đúng một chứng nhận; Owner đọc PDF và snapshot tên ngựa.
- EXPIRED không tạo chứng nhận.
- Rollback thật khi tạo certificate, xóa Session có FK phụ thuộc hoặc ghi audit thất bại.
- Race thực tế: Start/Start cùng trainer, Complete/Complete, Cancel/Start, Complete/thêm Session.
- SQL07 đổi mã và token theo thứ tự; không đổi boolean/notes/score/review/delivery/Medical ID/notification cũ; chạy lại và bảng rỗng; collision, mã/token lạ, token rỗng và overflow phải rollback.

Không tuyên bố đã kiểm tra mọi race có thể xảy ra hoặc UI production nối toàn bộ các API trên trong một browser session.

## File thay đổi trong đợt kiểm thử

### Sửa production có nguyên nhân rõ ràng

1. backend/src/main/java/com/raceforge/backend/training/controller/TrainingPackageController.java
   - Bổ sung validation PKG-XXX cho API đọc catalogue; mã sai trả 400, mã đúng không tồn tại trả 404.
2. frontend/src/shared/api/remoteActions.ts
   - Chặn workload không hợp lệ thay vì âm thầm dùng intensity mặc định.
   - Sửa thông báo thiếu profile theo luồng hiện tại: Trainer tự hoàn thành profile sau khi kích hoạt.

Không mở rộng quyền đọc ngựa. HorseAccess vẫn kiểm tra scope trước và trả 403 khi không có quyền/không thấy ngựa; context fixture được sửa để phản ánh điều này.

### Sửa fixture/test hiện có

- BackendApplicationTests.java: mock đầy đủ repository/JDBC/transaction/persistence factory trong context cố ý không có DB; giữ các kiểm tra Swagger và bảo vệ API.
- HorseAdmissionServiceTest.java: UELN giả lập dùng prefix thực sự có trong reference offline.
- TrainingCalendarFixDatabaseTest.java: schema assessment/SQL06/07, Complete luôn có checklist, kiểm chứng bỏ chặn ngày; không bỏ guard nghiệp vụ.
- TrainingRoadmapDatabaseTest.java: đúng seed 3 package/11 stage sau bỏ Recovery, Complete có assessment, schema hiện hành.
- TrainingCertificateDatabaseTest.java: thêm schema assessment, đổi từ ddl-auto=none sang validate.
- HorsePackageLifecycleDatabaseTest.java: sửa định dạng thời gian seed, không đổi assertions rollback/race.
- frontend/tests/apiIntegration.test.mjs: self-service profile, /me, lỗi chi tiết theo source, roadmap trong draft thay cho endpoint recommendation đã bỏ.
- frontend/tests/trainerAccountCreation.test.mjs: invitation/self-service, lỗi không giả thành công và email trùng; không phục hồi API tạo profile admin đã bỏ.
- frontend/tests/englishSource.test.mjs: phân biệt alias nhập CSV với nhãn UI; SSR kiểm tra đúng trạng thái loading thực tế.

### Tạo mới

- backend/src/test/java/com/raceforge/backend/training/service/TrainingAssessmentCodesDatabaseTest.java
- backend/src/test/java/com/raceforge/backend/training/service/TrainingAssessmentWorkflowDatabaseTest.java
- backend/src/test/resources/training/business_id_sequences_TEST_ONLY.sql
- frontend/tests/browser/trainingAssessment.browser.cjs

backend/scripts/training/02_reset_training_TEST_ONLY.sql đã được cập nhật thứ tự dọn FK assessment/certificate và chặn chạy ngoài tên DB test cho phép. Đây là script reset dữ liệu test, không phải hủy gói của Owner, không được chạy trên RaceForge gốc.

Các thay đổi hủy/hoàn thành gói, đổi 10 mã assessment và frontend có sẵn từ trước vẫn được giữ. Không sửa snapshot session-*-up; không sửa migration đã phát hành, package.json, package-lock.json hoặc pom.xml.

## Phần còn chờ — không đánh dấu PASS

1. AuthDatabaseIT đã xanh 4/4 ở lượt 9 và 10 nhưng chưa đủ 3 lần liên tiếp. Cần thêm một lượt xác nhận trong đợt được phép tiếp theo.
2. IdentityMigrationTest và IntegerIdsMigrationTest yêu cầu schema tiền nhiệm và migration V7 chuyển ID; BusinessStringIdsMigrationTest yêu cầu V9; AdmissionMigrationTest cũng dùng chuỗi phiên bản cũ.
   - Source hiện tại không có V2/V7/V9 tương ứng.
   - Thử chuẩn bị V0 → V6 bằng các file hiện có bị chặn tại V4: thiếu otp_sent_at/otp_attempt_count và sent_at của schema tiền nhiệm.
   - Không tạo cột giả, tự viết lại migration lịch sử hoặc bỏ assertion để làm xanh.
   - Các thân test migration chưa được chạy vì precondition schema không đạt. Cần đúng snapshot/schema và bộ migration lịch sử tương ứng, hoặc một quyết định riêng về việc thay thế các test lỗi thời.
3. TrainingRoadmapDatabaseTest#mergedFullDatabaseScriptIsSelfContained yêu cầu MERGED_TRAINING_SQL; không có đường dẫn/artifact này. Ca này skip có điều kiện ở lượt 1/2, sau đó được tách thành BLOCKED thay vì tính PASS.
4. Chưa kiểm chứng khởi động trên RaceForge gốc, PayOS thật, email/Google thật hoặc toàn bộ production frontend → backend → database trong cùng browser flow. Ngoài phạm vi DB test riêng đã chốt.

## Lệnh, log và dọn dẹp

Các lệnh thực tế đã dùng, selector được thu hẹp khi nhóm đủ 3 lần:

~~~powershell
# Backend unit/controller ban đầu
mvn.cmd '-Dtest=*Test,*Tests,!*DatabaseTest,!*MigrationTest' '-Dspring.devtools.restart.enabled=false' test

# Integration Training ban đầu
$env:RUN_TRAINING_DB_TESTS='true'
mvn.cmd '-Dtest=*DatabaseTest' '-Dspring.devtools.restart.enabled=false' test

# Frontend
npm.cmd test
npm.cmd run build

# Browser: Playwright chỉ cài trong TEMP, Chrome có sẵn
$env:NODE_PATH = Join-Path $env:TEMP 'RaceForge_verification_20261111/browser-runtime/node_modules'
node tests/browser/trainingAssessment.browser.cjs
# Từ backend, bundle Swagger được trích từ dependency Maven vào TEMP:
node src/test/js/swagger-errors.cjs <duong-dan-swagger-ui-bundle-trong-TEMP>
~~~

Auth dùng Invoke-IsolatedAuthTests.ps1: chuẩn bị canonical schema + SQL13–18 + fixture assessment/sequence + SQL06/07 trên DB UUID; chạy AuthDatabaseIT với Flyway tắt, JPA validate; email/Google mock; dọn DB trong finally. Legacy dùng Invoke-IsolatedLegacyMigrationTests.ps1; chỉ chuẩn bị schema trên DB UUID và dọn trong finally, không thay nguồn migration.

Log và runner được sao chép vào backend/target/verification/2026-11-11/; không đưa dependency Playwright trong TEMP vào repo. Đây là build artifacts, không phải commit.

Kiểm tra cuối:
- sys.databases trên master: **0** database khớp RaceForge%Test[_]% còn tồn tại.
- Vite cổng 5179 đã dừng.
- Không còn tiến trình Java test của tác vụ.
- git diff --check đạt.
- Không có thay đổi file migration đã phát hành hoặc manifest dependency.
- Không chạy thêm test sau lượt 10; không commit/push, không áp dụng SQL trên RaceForge gốc.
