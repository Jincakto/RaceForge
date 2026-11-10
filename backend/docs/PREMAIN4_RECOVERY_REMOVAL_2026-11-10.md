# Pull premain4 và loại bỏ Recovery package — 10/11/2026

Source: `D:/SWP391/RaceForge-premain4-premain/RaceForge-premain4`.

## Kết quả

- Đã fetch và fast-forward nhánh `premain4` từ `d2093b9` lên `75f8f74`, nhận hai commit `3e2365e` và `75f8f74`.
- Có **một conflict thực tế** khi áp lại thay đổi Session/Assessment chưa commit: `backend/src/main/java/com/raceforge/backend/medical/service/MedicalRecordService.java`.
- Đã gộp conflict bằng cách giữ cả `StorageService` của Medical mới và `TrainingAssessmentMedicalBridge` của Assessment. Giữ các hook tạo DRAFT, liên kết, kiểm tra trước Confirm và resolve sau Confirm. Không thay thế file Medical bằng bản cũ.
- Không còn unmerged entries hoặc conflict marker trong source. Không tạo commit/push.
- Đã bỏ Recovery package khỏi backend, frontend và database RaceForge. Heart-rate recovery, feedback, Assessment và Medical Training Lock vẫn giữ.

## Khả năng khôi phục

- Source trước pull được lưu tại `C:/Users/HP/AppData/Local/Temp/raceforge-before-premain4-pull-20261110170757`: patch, 78 file đã sửa/tạo và stash reference.
- Stash `codex-preserve-session-before-premain4-pull-20261110` vẫn còn; chỉ apply, không pop/drop. Không apply lại trực tiếp lên working tree hiện tại vì các thay đổi đã được khôi phục và gộp.
- Snapshot `docs/session-up/session-back-end-up.*` và `session-front-end-up.*` giữ nguyên.
- Full database COPY_ONLY backup đã tạo và RESTORE VERIFYONLY WITH CHECKSUM thành công:
  `C:/Program Files/Microsoft SQL Server/MSSQL15.SQLEXPRESS/MSSQL/Backup/RaceForge_before_remove_recovery_20261110_1794306098925.bak`.
- Bản export JSON riêng của các hàng Recovery bị xóa: `C:/Users/HP/AppData/Local/Temp/raceforge-remove-recovery-20261110171106/backup-*.json`.
- Không tự động hoàn tác bằng cách restore toàn database: backup chứa toàn bộ trạng thái trước chỉnh sửa, việc restore sẽ ảnh hưởng những thay đổi mới khác.

## Backend đã dọn

Các đường dẫn sau nằm dưới `backend/src/main/java/com/raceforge/backend/`:

| File | Thay đổi của lượt này |
|---|---|
| `medical/service/MedicalRecordService.java` | Gộp conflict giữ cả Medical và Assessment |
| `training/service/TrainingPackageService.java` | Chỉ chấp nhận BASIC, RACING, PERFORMANCE; bỏ nhánh tái kích hoạt Recovery |
| `training/service/HorsePackageService.java` | Loại gói không được hỗ trợ không thể đăng ký/thanh toán |
| `training/service/TrainingPackageEligibilityService.java` | Dùng UNSUPPORTED_PACKAGE_TYPE; không còn ngoại lệ Recovery bỏ qua sức khỏe |
| `training/service/TrainingPackageSuggestionService.java` | Chỉ đề xuất ba loại còn lại |
| `training/service/TrainingPackagePauseService.java` | Medical Lock bảo lưu gói thông thường; không loại trừ Recovery riêng |
| `training/service/TrainingPackageExpirationService.java` | Bỏ sự kiện/hướng dẫn xử lý Recovery hết hạn |
| `training/service/PackageResumptionService.java` | Giữ luồng trainer của upstream, bỏ liên kết gói thay thế do CLB chi trả; có gói ACTIVE khác thì từ chối |
| `training/entity/HorsePackage.java` | Bỏ quan hệ replacedHorsePackage |
| `training/dto/HorsePackageResponse.java`, `training/mapper/HorsePackageMapper.java` | Bỏ trường replacedHorsePackageId của tính năng đã xóa |
| `payment/OwnerPayments.java` | Bỏ các nhánh checkout/reconcile Recovery; giữ luồng thanh toán thông thường |
| `horse/controller/TrainerController.java` | Không còn lọc/đối xử riêng Recovery |

Các class RecoveryPackageController/Service và DTO cũ đã được upstream xóa. Đã xác nhận không có các `.class` cũ tương ứng trong target/classes; Swagger không còn route Recovery cũ. Không tạo package `support`.

## Frontend đã dọn

- `frontend/src/packageBuilder.ts`: chỉ còn BASIC 30/60/90; PERFORMANCE 30/60/90; RACING 90/180.
- `trainingProtocols.ts`, `trainingProtocolsPage.tsx`: không còn lựa chọn Recovery.
- `trainingLogic.ts`, `trainingSuggestions.ts`: bỏ điều kiện mua/nhãn Recovery riêng; type cũ bị từ chối.
- `data.ts`: bỏ HorseRehab, RehabPackage, REHAB_PACKAGES, thuộc tính horse.rehab và lifecycle rehab. Giữ Recovery phase/exercise và các chỉ số hồi phục nhịp tim vì chúng không phải Recovery package.
- `App.tsx`, `admin.tsx`: bỏ trang Rehabilitation packages, menu, quyền trang frontend, badge và hành động kích hoạt của Manager. Thông báo khóa tập hướng về ngựa/khám thú y.
- `remote.ts`, `remoteActions.ts`: bỏ dựng dữ liệu horse.rehab và gọi approve-recovery.
- Tạo `frontend/src/TrainingResumptions.tsx`, nối tại `trainingPlans.tsx` và `App.tsx`: trainer thấy gói đã được Vet cho tập lại và có nút **Accept training resumption**; gọi route của upstream, chống bấm lặp, reload sau thành công và hiển thị lỗi khi bị chặn.
- Không thay đổi nội dung checklist Pass/Concern hoặc quy tắc Overall notes tùy chọn.

## Database đã thay đổi thật

Đã kiểm tra khóa ngoại trước khi sửa. **Không có** đăng ký, plan/session Recovery hoặc lịch sử thay thế gói; vì thế không cần xóa bất kỳ đăng ký hay session nào.

Trong transaction có kiểm tra dữ liệu bảo vệ trước/sau:

- Xóa **PKG-009**, **PKG-010**, **PKG-013**.
- Xóa **3 Package_Roadmap_Template**, **7 Package_Stage_Template** thuộc đúng ba gói đó.
- CHECK `CK_TRAINING_PACKAGE_TYPE` và `CK_TrainingPlan_PackageType` chỉ cho BASIC/RACING/PERFORMANCE; snapshot plan được phép NULL như trước.
- Bỏ `FK_HORSE_PACKAGE_REPLACED` và cột `HORSE_PACKAGE.replaced_horse_package_id` vốn không có dữ liệu.
- Áp dụng đúng phần schema Medical mới từ upstream V16: cột `Medical_Clinical_Exam.evidence_image_path` và CHECK cho NORMAL/ABNORMAL/CRITICAL.
- Không đổi `ddl-auto`, không bật auto-DDL, không chạy toàn bộ Flyway.

| Dữ liệu được bảo vệ | Trước | Sau transaction |
|---|---:|---:|
| Horse | 10 | 10 |
| HORSE_PACKAGE | 7 | 7 |
| Training_Plan | 6 | 6 |
| Training_Session | 112 | 112 |
| Medical_Record | 22 | 22 |
| Training_Lock | 3 | 3 |
| Training_Session_Assessment | 27 | 27 |
| Training_Session_Assessment_Item | 270 | 270 |
| Training_Assessment_Notification_Link | 47 | 47 |
| Catalogue ngoài Recovery | 13 | 13 |

Kết quả cuối: 6 BASIC, 4 PERFORMANCE, 3 RACING; **0 Recovery**. Đã thử UPDATE type RECOVERY vào catalogue và snapshot plan: cả hai bị SQL Server CHECK từ chối; transaction kiểm tra được rollback. Cột `recovery_heart_rate_2_min` và `recovery_measured_at` vẫn còn.

SQL được lưu trong `backend/src/main/resources/db/migration/V17__remove_recovery_package_type_and_unused_data.sql`. Script chủ động dừng khi có Recovery registration, plan snapshot hoặc replacement history; không tự xóa lịch sử chưa được kiểm tra trên database khác. Cập nhật schema cài mới `backend/scripts/training/00_canonical_base_schema.sql`, script reset TEST_ONLY và README; không chạy script reset.

Migration V0–V16 lịch sử được giữ nguyên. RaceForge hiện có Flyway baseline version 0; thay đổi lần này áp thủ công, không sửa flyway_schema_history. Tiếp tục chạy với Flyway tắt; việc đồng bộ lịch sử Flyway toàn dự án cần xử lý riêng, không tự bật để chạy toàn bộ V1…V17 trên schema đã có.

## Kiểm chứng đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `mvn -q -DskipTests compile` | PASS |
| `mvn -q '-Dtest=Training*Test,HorsePackage*Test,Package*Test,Medical*Test,!*DatabaseTest' test` | 466 PASS |
| `mvn -q '-Dtest=RacingMedicalEligibilityTest' test` | 18 PASS |
| Tổng hai lượt backend trên | **484 PASS**, 34 suite, 0 failure/error/skipped |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, gồm TypeScript và Vite |
| Sáu file test frontend tập trung | **114/114 PASS** |
| Thêm `apiIntegration.test.mjs` vào bộ trên | **169/175 PASS**, 6 FAIL |
| Đối chiếu riêng apiIntegration với source trước pull từ backup | **55/61 PASS**, cùng đúng 6 FAIL; đã xác nhận lỗi tồn tại trước lượt này |
| HTTP smoke trên RaceForge thật | **15 kiểm tra endpoint PASS**, thêm 4 login thành công và kiểm tra Swagger |
| Git diff check/unmerged/source marker | PASS |

Backend test mới gồm trainer đúng/sai, khóa y tế, pending payment, gói ACTIVE khác, bảo lưu số ngày, chống accept lặp và từ chối type cũ. Test Medical được điều chỉnh theo logic upstream: INITIAL CRITICAL thành NOT_FIT; FOLLOW_UP CRITICAL không được override FIT; override trường hợp không critical vẫn giữ giải thích. Không nới logic Medical để làm test xanh.

HTTP đã xác nhận:

- Manager/Owner đọc catalogue không còn Recovery; ba ID đã xóa trả 404.
- POST tạo Recovery với roadmap hợp lệ bị service từ chối 409, không tạo dữ liệu mới.
- Trainer đọc template và assessment SES-097 đủ 10 mục; Owner bị 403.
- Trainer GET `/api/horse-packages/resumptions/mine` trả 200; Manager/Vet trả 403.
- Route approve-recovery cũ trả 404; Swagger có route trainer resumption mới và Assessment.

Sáu lỗi frontend cũ còn tồn tại: owner xử lý thiếu health profile; admin load dữ liệu; admin tạo Trainer profile; trainer load/update profile; đổi lịch stage theo ngày/giờ; gửi intensity của các stage. Không sửa ngoài phạm vi lần này, không gọi toàn bộ frontend test là xanh.

Chưa chạy lại browser flow đầy đủ, positive resumption qua database thật hoặc concurrency/rollback của resumption trong lượt này. Positive resumption và bảo lưu ngày có unit test; các bài kiểm tra SQL Server/Training Assessment của lượt trước được lưu riêng trong `TRAINING_REAL_API_REPORT_2026-11-10.md`, không tính lại thành bằng chứng mới.

## Bằng chứng và trạng thái bàn giao

- Bằng chứng gọn: `backend/target/premain4-recovery-removal-2026-11-10/`.
- Log đầy đủ của lượt này: `C:/Users/HP/AppData/Local/Temp/raceforge-remove-recovery-20261110171106/`.
- Backend đã khởi động thành công và được để chạy tại port 8080 bằng `mvn spring-boot:run -Dspring-boot.run.arguments=--spring.flyway.enabled=false`, thêm tắt devtools restart khi kiểm tra để tránh biên dịch lại kích hoạt restart.
- Working tree còn toàn bộ thay đổi Session/Assessment và Recovery removal để review. Không commit, push, stash drop hoặc chỉnh các snapshot -up cũ.