# Bản copy thay đổi Permission / Training — String 3 số

Ngày 19/10/2026. Đây là bản tổng hợp để gửi nhóm; các bản SQL/tài liệu phụ đã được dọn theo yêu cầu. Quyết định mới nhất: mọi ID nghiệp vụ và FK tương ứng dùng String, tiền tố + 3 số 001–999; không giữ ngoại lệ INT cho Trainer/phân công/Health_Profile. Giữ role HEAD_TRAINER.

## A. Thay đổi thuộc phần mình

| **Bảng** | **Thay đổi** |
|---|---|
| TRAINING_PACKAGE | package_id String PKG-001; bốn loại BASIC, RACING, PERFORMANCE, RECOVERY. |
| HORSE_PACKAGE | Đăng ký riêng theo ngựa; các ID/FK String; payment_status, thời hạn, remaining_days và gói thay thế; bỏ paid_at theo yêu cầu. |
| Training_Assignment | **Tạo mới**: assignment_id String PK/FK Horse_Assignment.id; horse_package_id String FK; ended_at DATETIME2. Liên kết gói và giờ kết thúc không đặt trên Horse_Assignment của nhóm. |
| Trainer_Detail | **Tạo mới**: trainer_id String PK/FK Trainer; bio, qualifications, status, created_at. |
| Training_Plan | Thêm horse_package_id, horse_id, trainer_assignment_id, recommendation_id; kế hoạch thuộc đúng ngựa/gói/phân công; thêm package_type, roadmap_version. Các ID/FK String. |
| Horse_Plan | Giữ khóa ghép String (plan_id,horse_id), liên kết đúng ngựa của kế hoạch. |
| Training_Stage | **Tạo mới**: thứ tự, khoảng ngày, hoạt động, cường độ, các thứ trong tuần, giờ bắt đầu/kết thúc dự kiến, phase_code/title/objective. |
| Training_Protocol | **Tạo mới**: mẫu gợi ý theo gói/dải cân nặng, stages_json, sources_json, rationale, trạng thái và người/thời điểm duyệt. |
| Training_Recommendation | **Tạo mới**: snapshot dữ liệu ngựa/khám/gói/mẫu và nguồn khi gợi ý; Trainer xác nhận. |
| Training_Medical_Context | **Tạo mới**: medical_record_id String PK/FK, ideal_weight DECIMAL(8,2), body_condition_score INT; không thêm hai cột riêng này vào Medical_Record của nhóm. |
| Training_Session | Thêm training_stage_id; resting_heart_rate, resting_medical_record_id, resting_measured_at; end_exercise_heart_rate, recovery_heart_rate_2_min, recovery_measured_at. |
| Permission | permission_id String PER-001; tên quyền UNIQUE, mô tả. |
| Role_Permission | Khóa ghép String (role_id,permission_id); cấp/thu hồi quyền theo role, ghi audit. |
| Role / Audit_Log | Dùng hạ tầng chung và ID String; không thêm role TRAINER hoặc bảng audit riêng. |

Các field session scheduled_start/end, actual_start/end, distance, heart_rate, avg_speed, max_speed, recorded_by, evaluation, notes, intensity, surface đã có; không ghi là toàn bộ đều mới. Đã sửa luồng nhận/lưu quãng đường và start → stop → complete. Không tự sinh số đo hoặc tự hoàn tất theo giờ dự kiến.

## B. Cột mới của session

| **Cột** | **Kiểu / Ý nghĩa** |
|---|---|
| training_stage_id | VARCHAR(20), FK ghép cùng plan_id tới Training_Stage. |
| resting_heart_rate | INT NULL, nhịp nghỉ từ lần khám CONFIRMED gần nhất có số đo. |
| resting_medical_record_id | VARCHAR(20) NULL, FK hồ sơ nguồn. |
| resting_measured_at | DATETIME2 NULL, ngày khám nguồn; không giả là số đo trước buổi. |
| end_exercise_heart_rate | INT NULL, nhịp cuối bài, >0 khi có. |
| recovery_heart_rate_2_min | INT NULL, nhịp hồi phục, >0 khi có. |
| recovery_measured_at | DATETIME2 NULL, thời điểm đo thật, ít nhất 2 phút sau actual_end. |

Thời lượng và mức giảm nhịp tim tính từ timestamp/số đo, không thêm cột. Giữ heart_rate cũ vì chưa rõ thời điểm đo. Distance là km, tốc độ km/h, nhịp tim bpm. Feedback chỉ hỗ trợ Trainer, không dùng ngưỡng chung 100 bpm để tự chẩn đoán hay tự sửa lịch.

## C. ID được đồng bộ ở mọi module

| **Đối tượng / Cột liên quan** | **Ví dụ String** |
|---|---|
| User.user_id | USR-001 |
| Hồ sơ Owner / Vet / Manager | OWN-001 / VET-001 / CM-001 |
| Trainer.trainer_id và FK | HTR-001 |
| Horse_Assignment.id và assignment_id ở Training | ASN-001 |
| Health_Profile.profile_id và Medical_Record.profile_id | HLT-001 |
| Horse.horse_id và mọi FK | HOR-001 |
| package_id / horse_package_id | PKG-001 / HPG-001 |
| plan_id / stage_id / session_id | PLN-001 / STG-001 / SES-001 |
| protocol_id / recommendation_id | PRO-001 / REC-001 |
| role_id / permission_id | ROL-001 / PER-001 |

Cột ID là VARCHAR(20). Hậu tố đúng 001–999, không 000, không quay vòng hoặc sinh 1000; hết mã thì báo lỗi. Các ID khác đã String từ trước; đợt này đổi lại ba nhóm còn INT do V10 và toàn bộ tham chiếu/DTO/API của chúng. Không đổi số đo, số ngày, thứ tự, bộ đếm nội bộ hoặc Flyway installed_rank thành String.

## D. Giữ cấu trúc nghiệp vụ của nhóm

- Horse_Admission giữ các cột nhóm. Horse_Assignment giữ 10 cột, chỉ id đổi String theo ngoại lệ ID được phép; không giữ horse_package_id/ended_at trên đây.
- Medical_Record giữ training_eligible/eligibility_reason và các field nhóm chốt ở mục B; profile_id đổi String. Field riêng Training đưa sang bảng riêng.
- Trạng thái tiếp nhận, kết luận khám, cân nặng, nhịp nghỉ và khóa do module nhóm cung cấp; Training đọc/kiểm tra, không tự tạo kết luận hoặc số đo.
- Liên kết gói/giờ kết thúc đặt Training_Assignment, thông tin mở rộng đặt Training_Medical_Context. Đây là bảo vệ cấu trúc nhóm, khác việc copy báo cáo.

## E. Ngoài Training/Permission đã chạm gì

Đồng bộ ID được phép: entity/repository/DTO Medical liên quan profileId; service/controller Vet liên quan assignmentId; health-profile API; bộ cấp mã dùng chung. Không thêm quy tắc khám mới trong đợt này.

Những sửa tối thiểu để gỡ phần tôi đã thêm trên bảng nhóm cũng được ghi rõ:

| **File** | **Nội dung** |
|---|---|
| horse/service/HorseAccess.java | Đọc liên kết gói từ Training_Assignment. |
| horse/service/VetAssignmentService.java | Bỏ ghi ended_at vào bảng nhóm; ID đổi ASN String. |
| account/controller/AdminAccountsController.java | Giờ kết thúc phân công ghi bảng Training riêng, không ghi cột riêng trên Horse_Assignment. |
| medical/entity/MedicalRecord.java | Map hai field riêng sang SecondaryTable Training_Medical_Context, không thêm cột vào Medical_Record. |

Không khẳng định đã hoàn tác tất cả thay đổi ngoài phạm vi từ những đợt trước; các mục E và danh sách file dưới đây nêu phần đã chạm.

## F. SQL và tình trạng

- RACEFORGE_FULL_STRING_ID.sql: DB đầy đủ từ schema cuối, dùng để dựng mới; xem mục H.
- V11__isolate_training_extensions.sql: chuyển phần mở rộng riêng ra khỏi bảng nhóm, giữ dữ liệu.
- V12__all_business_ids_string.sql: đổi các khóa INT còn lại/FK về VARCHAR(20), khôi phục PK/FK/index/check và đồng bộ counter; không reset dữ liệu.
- Hai migration thuộc chuỗi V1–V12 của dự án này, không phải patch chạy trực tiếp trên mọi bản DB INT của nhóm; không sửa checksum V1–V10.
- Đã sửa source, lưu migration; **chưa áp dụng DB** vì RaceForge không còn trên localhost\SQLEXPRESS. Không tạo DB mới hoặc tự chọn DB khác.
- Không sửa frontend; chưa build/test/restart theo yêu cầu. Chưa xác nhận ứng dụng chạy thành công sau thay đổi mới.

## G. Bản copy danh sách file source đã sửa trong đợt này

- `backend/src/main/java/com/raceforge/backend/account/controller/AdminAccountsController.java`
- `backend/src/main/java/com/raceforge/backend/common/id/BusinessEntity.java`
- `backend/src/main/java/com/raceforge/backend/horse/controller/HorseAdmissionController.java`
- `backend/src/main/java/com/raceforge/backend/horse/controller/VetAssignmentController.java`
- `backend/src/main/java/com/raceforge/backend/horse/service/HorseAccess.java`
- `backend/src/main/java/com/raceforge/backend/horse/service/HorseAdmissionService.java`
- `backend/src/main/java/com/raceforge/backend/horse/service/VetAssignmentService.java`
- `backend/src/main/java/com/raceforge/backend/medical/dto/MedicalRecordCreateRequest.java`
- `backend/src/main/java/com/raceforge/backend/medical/dto/MedicalRecordResponse.java`
- `backend/src/main/java/com/raceforge/backend/medical/entity/HealthProfile.java`
- `backend/src/main/java/com/raceforge/backend/medical/entity/MedicalRecord.java`
- `backend/src/main/java/com/raceforge/backend/medical/repository/HealthProfileRepository.java`
- `backend/src/main/java/com/raceforge/backend/medical/repository/MedicalRecordRepository.java`
- `backend/src/main/java/com/raceforge/backend/medical/service/MedicalRecordService.java`
- `backend/src/main/java/com/raceforge/backend/permission/service/PermissionAccess.java`
- `backend/src/main/java/com/raceforge/backend/training/controller/TrainingWorkflowController.java`
- `backend/src/main/java/com/raceforge/backend/training/dto/TrainingPlanCreateRequest.java`
- `backend/src/main/java/com/raceforge/backend/training/dto/TrainingPlanResponse.java`
- `backend/src/main/java/com/raceforge/backend/training/dto/TrainingWorkflowDtos.java`
- `backend/src/main/java/com/raceforge/backend/training/entity/TrainerAssignment.java`
- `backend/src/main/java/com/raceforge/backend/training/entity/TrainerProfile.java`
- `backend/src/main/java/com/raceforge/backend/training/entity/TrainingPlan.java`
- `backend/src/main/java/com/raceforge/backend/training/service/TrainerAssignmentService.java`
- `backend/src/main/java/com/raceforge/backend/training/service/TrainingRecommendationService.java`
- `backend/src/main/java/com/raceforge/backend/training/service/TrainingWorkflowGuard.java`

Bản trước/sau được giữ trong workspace `.integration-staging/final-string-ids/before` và `next`. Các file migration gốc được giữ nguyên để không ảnh hưởng Flyway.


## G. Bộ bàn giao duy nhất và cách dùng SQL

- `backend/scripts/COPY_SQL_CAP_NHAT_PERMISSION_TRAINING.sql`: gộp toàn bộ migration V1–V12 trong một file, giữ thứ tự.
- `backend/scripts/RACEFORGE_FULL_STRING_ID.sql`: dựng DB hoàn chỉnh, xem mục H; không chạy đè bảng đang có.
- Tài liệu này gộp bảng thay đổi, phạm vi ngoài module và hướng dẫn chạy.

SQL cập nhật có hai chế độ, sửa đúng một giá trị trong dòng INSERT #DeliveryMode:

| Chế độ | Điều kiện | Nội dung chạy |
|---|---|---|
| UPDATE_V10 (mặc định) | DB đã có schema V10 của dự án này | V11–V12 |
| EMPTY | DB đã tồn tại nhưng hoàn toàn chưa có bảng người dùng | Toàn bộ V1–V12 |

**Không chế độ nào chuyển trực tiếp database INT hiện có của nhóm sang bản cuối.** Bản EMPTY dựng toàn bộ schema dự án và bao gồm thay đổi nhóm Horse/Medical; không được coi toàn bộ là đóng góp Training/Permission của mình. Đóng góp riêng nằm ở mục A; đồng bộ ID toàn hệ thống ở mục C.

Chưa chạy SQL hoặc build/test. Không tạo/xóa database và không sửa frontend. Script kiểm tra điều kiện trước khi chạy. Bật Query > SQLCMD Mode trong SSMS để :ON ERROR EXIT dừng toàn bộ khi lỗi, hoặc dùng:

```powershell
sqlcmd -S "TEN_SERVER\INSTANCE" -E -C -b -i "backend\scripts\COPY_SQL_CAP_NHAT_PERMISSION_TRAINING.sql"
```

Sao lưu trước và dùng đúng server. Ưu tiên Flyway qua các migration gốc; bản gộp thủ công không ghi lịch sử Flyway, không dùng cả hai cách trên cùng DB nếu chưa đối chiếu lịch sử. Các migration có transaction riêng: nếu bước sau lỗi, bước trước có thể đã commit.

Đã bỏ các bản phụ trong backend/scripts: PENDING_V11__isolate_training_extensions.sql, PHAN_RIENG_PERMISSION_TRAINING_SCHEMA.sql, TRAINING_PERMISSION_SCHEMA_REVIEW_20261019.sql, reset-test-data-for-string-ids.sql, verify-string-training-permission.sql; gộp HUONG_DAN_SQL_CAP_NHAT_PERMISSION_TRAINING.md vào tài liệu này. Giữ nguyên code backend và migration đang dùng.


## H. DB hoàn chỉnh của cả nhóm — file dùng để dựng mới

**File chính: `backend/scripts/RACEFORGE_FULL_STRING_ID.sql`.** File tạo thẳng schema cuối; không cần có V10 và không cần chạy V1–V12 trước. Bản cập nhật V1–V12 cũ là phương án khác, không chạy chung.

Đã gộp:

| Phần | Nội dung |
|---|---|
| Thành viên nhóm: Admission / Assignment | Horse_Admission, Horse_Assignment, training_eligible và eligibility_reason |
| Thành viên nhóm: Horse / Medical | Giấy tờ ngựa, Trainer, Horse_Trainer, sequence ngựa, cân nặng theo lần khám, kết luận và theo dõi |
| Phần mình: Training / Permission | Toàn bộ bảng ở mục A, PK/FK ghép ràng buộc ngựa–gói–phân công–plan–session, thời gian và kết quả |
| Hạ tầng chung | User, Role, OTP, token, audit, notification và các bảng nghiệp vụ có trong DB gốc |

Toàn bộ ID nghiệp vụ/FK dùng VARCHAR(20). Trainer/Assignment/Health_Profile cũng dùng String theo quyết định mới nhất; đây là ngoại lệ đã được phép so với bản INT thành viên gửi trước. Mã gốc có CHECK đúng tiền tố và 001–999; các bảng phụ dùng chung mã qua FK. Số đo và bộ đếm vẫn là số.

### Cách dùng

1. Mở file SQL chính trong SSMS ở chế độ SQL bình thường, không cần SQLCMD Mode.
2. Script mở đầu bằng `IF DB_ID('RaceForge') IS NULL ... CREATE DATABASE RaceForge`, sau đó `USE RaceForge`, giống mẫu nhóm. Muốn đổi tên DB thì đổi đồng bộ ở phần mở đầu.
3. Script chỉ tạo mới hoặc dùng DB hoàn toàn trống; nếu DB có bảng thì dừng, không xóa dữ liệu để chạy tiếp.
4. Khi lần đầu kết nối backend vào schema dựng bằng file này, đặt `FLYWAY_BASELINE_VERSION=12` (giữ baseline-on-migrate=true) để Flyway ghi baseline 12, không chạy lại V1. Ví dụ CMD: `set FLYWAY_BASELINE_VERSION=12` rồi `mvn spring-boot:run` trong cùng cửa sổ. Chỉ áp dụng cho DB dựng từ file full, không cho DB đang theo migration dở dang.

Có sẵn 7 role hệ thống (không tạo role TRAINER mới), 5 permission/grant mặc định và 4 gói từ DB nhóm đã gửi. Không tạo tài khoản người dùng hoặc mật khẩu giả. Không tự tạo phác đồ y khoa được duyệt.

**Chưa thực thi vào SQL Server, chưa build/test theo yêu cầu.** Đây là script hoàn chỉnh từ source đã hợp nhất; không phải bản backup DB đã được kiểm thử. Frontend không thay đổi.

### Danh sách bảng

- `Audit_Log`
- `Care_Task`
- `Email_Verification_OTP`
- `Health_Profile`
- `Horse`
- `HORSE_RACE_HISTORY`
- `Medical_Clinical_Exam`
- `Medical_Record`
- `Medical_Vital_Sign`
- `Notification`
- `Nutrition_Plan`
- `Password_Reset_Token`
- `Refresh_Token`
- `Registration_Request`
- `Role`
- `Supply_Item`
- `Training_Lock`
- `User`
- `User_External_Login`
- `Horse_Admission`
- `Horse_Assignment`
- `Permission`
- `Role_Permission`
- `Trainer_Detail`
- `TRAINING_PACKAGE`
- `HORSE_PACKAGE`
- `Training_Protocol`
- `Training_Recommendation`
- `Training_Plan`
- `Horse_Plan`
- `Training_Stage`
- `Training_Session`
- `Training_Assignment`
- `Training_Medical_Context`
- `Trainer`
- `Horse_Trainer`
- `Account_Role_Profile`
- `Id_Counter`

### Khóa và quan hệ

- Các bảng đều có PK; bảng nối Role_Permission/Horse_Plan/Horse_Trainer dùng khóa ghép.
- UNIQUE: email, tên role/permission, mỗi Trainer một User, mỗi Health_Profile một Horse, mỗi VitalSign một Medical_Record.
- FK đầy đủ giữa các thực thể cụ thể; Audit_Log.entity_id là tham chiếu đa loại theo entity_type nên không tạo FK giả tới một bảng duy nhất. Provider_user_id là ID bên Google, không đổi thành mã nội bộ.
- Gói–ngựa, phân công–gói, recommendation–gói, plan–ngựa, stage–plan dùng thêm UNIQUE/FK ghép; unique index được tạo trước FK phụ thuộc.
- Khóa khám, giới hạn gói và việc không đổi ngựa/plan của session có trigger hiện hành. Điều kiện thanh toán, Trainer đã nhận việc và giới hạn chọn tối đa 6 thứ/tuần còn được kiểm tra tại service; không khẳng định mọi luật đều là CHECK SQL.

### Danh sách FK trong file DB hoàn chỉnh

| Bảng nguồn | Cột FK | Bảng đích | Cột đích |
|---|---|---|---|
| Horse_Admission | horse_id | Horse | horse_id |
| Horse_Admission | medical_record_id | Medical_Record | medical_record_id |
| Horse_Admission | decision_by | User | user_id |
| Horse_Assignment | horse_id | Horse | horse_id |
| Horse_Assignment | assigned_by | User | user_id |
| Horse_Assignment | assignee_id | User | user_id |
| Horse_Assignment | medical_record_id | Medical_Record | medical_record_id |
| Trainer | user_id | User | user_id |
| Horse_Trainer | horse_id | Horse | horse_id |
| Horse_Trainer | trainer_id | Trainer | trainer_id |
| Account_Role_Profile | user_id | User | user_id |
| Account_Role_Profile | role_name | Role | role_name |
| Training_Assignment | assignment_id | Horse_Assignment | id |
| Training_Assignment | horse_package_id | HORSE_PACKAGE | horse_package_id |
| Training_Medical_Context | medical_record_id | Medical_Record | medical_record_id |
| Audit_Log | horse_id | Horse | horse_id |
| Audit_Log | user_id | User | user_id |
| Care_Task | assigned_by | User | user_id |
| Care_Task | assigned_to | User | user_id |
| Care_Task | horse_id | Horse | horse_id |
| Email_Verification_OTP | user_id | User | user_id |
| Health_Profile | horse_id | Horse | horse_id |
| Horse | owner_id | User | user_id |
| HORSE_RACE_HISTORY | horse_id | Horse | horse_id |
| Medical_Clinical_Exam | medical_record_id | Medical_Record | medical_record_id |
| Medical_Record | correction_of_id | Medical_Record | medical_record_id |
| Medical_Record | profile_id | Health_Profile | profile_id |
| Medical_Record | veterinarian_id | User | user_id |
| Medical_Vital_Sign | medical_record_id | Medical_Record | medical_record_id |
| Notification | user_id | User | user_id |
| Nutrition_Plan | created_by | User | user_id |
| Nutrition_Plan | horse_id | Horse | horse_id |
| Password_Reset_Token | user_id | User | user_id |
| Refresh_Token | user_id | User | user_id |
| Registration_Request | reviewed_by | User | user_id |
| Registration_Request | requested_role_id | Role | role_id |
| Registration_Request | user_id | User | user_id |
| Training_Lock | horse_id | Horse | horse_id |
| Training_Lock | locked_by | User | user_id |
| Training_Lock | medical_record_id | Medical_Record | medical_record_id |
| Training_Lock | unlocked_by | User | user_id |
| User | requested_role_id | Role | role_id |
| User | role_id | Role | role_id |
| User_External_Login | user_id | User | user_id |
| Role_Permission | permission_id | Permission | permission_id |
| Role_Permission | role_id | Role | role_id |
| Trainer_Detail | trainer_id | Trainer | trainer_id |
| HORSE_PACKAGE | horse_id | Horse | horse_id |
| HORSE_PACKAGE | package_id | TRAINING_PACKAGE | package_id |
| HORSE_PACKAGE | replaced_horse_package_id | HORSE_PACKAGE | horse_package_id |
| Training_Protocol | approved_by | User | user_id |
| Training_Protocol | created_by | User | user_id |
| Training_Recommendation | assignment_id | Training_Assignment | assignment_id |
| Training_Recommendation | generated_by | User | user_id |
| Training_Recommendation | horse_package_id | HORSE_PACKAGE | horse_package_id |
| Training_Recommendation | medical_record_id | Medical_Record | medical_record_id |
| Training_Recommendation | protocol_id | Training_Protocol | protocol_id |
| Training_Recommendation | assignment_id,horse_package_id | Training_Assignment | assignment_id,horse_package_id |
| Training_Plan | trainer_assignment_id,horse_package_id | Training_Assignment | assignment_id,horse_package_id |
| Training_Plan | horse_package_id,horse_id | HORSE_PACKAGE | horse_package_id,horse_id |
| Training_Plan | recommendation_id,horse_package_id | Training_Recommendation | recommendation_id,horse_package_id |
| Training_Plan | trainer_assignment_id | Training_Assignment | assignment_id |
| Training_Plan | created_by | User | user_id |
| Training_Plan | horse_package_id | HORSE_PACKAGE | horse_package_id |
| Training_Plan | recommendation_id | Training_Recommendation | recommendation_id |
| Horse_Plan | horse_id | Horse | horse_id |
| Horse_Plan | plan_id | Training_Plan | plan_id |
| Horse_Plan | plan_id,horse_id | Training_Plan | plan_id,horse_id |
| Training_Stage | plan_id | Training_Plan | plan_id |
| Training_Session | plan_id,horse_id | Horse_Plan | plan_id,horse_id |
| Training_Session | training_stage_id,plan_id | Training_Stage | stage_id,plan_id |
| Training_Session | recorded_by | User | user_id |
| Training_Session | resting_medical_record_id | Medical_Record | medical_record_id |


## I. Định dạng SQL theo mẫu nhóm

File DB đầy đủ đã được trình bày lại thành từng mục có số thứ tự: ROLE → PERMISSION → USER → các bảng theo thứ tự FK, mỗi mục là CREATE TABLE và GO. PK/FK/UNIQUE/CHECK được đặt trong CREATE TABLE; index có điều kiện và trigger vẫn là câu lệnh riêng. Không còn :setvar, biến DatabaseName hay yêu cầu SQLCMD trong file full.

Giữ nguyên ID String, 38 bảng, dữ liệu danh mục và quan hệ đã hợp nhất. Nếu DB đã có bảng/sequence, script báo lỗi và dùng NOEXEC để bỏ qua các batch tạo schema, sau cùng khôi phục NOEXEC OFF; không xóa dữ liệu để chạy lại. Chưa thực thi SQL/build/test.
