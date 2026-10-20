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


## J. Ghép lại N và giữ Training/Permission (20/10/2026)

### Nguồn code và phạm vi

- Ngoài Training/Permission: lấy nghiệp vụ từ bản N sạch tại commit 0205b8d, trước commit ghép có conflict. Đây là nguồn N xác định được trong lịch sử Git, không phải tự nhận mọi đoạn HEAD là N.
- Trong Training/Permission: giữ triển khai của mình tại commit 76de6e5, rồi nối lại các hợp đồng dùng chung. Không thay Training bằng triển khai N.
- Không sửa frontend. Không thay đổi SecurityConfig của N. Không commit hoặc merge Git tự động.
- Ngoại lệ đã được cho phép ở mọi module: đổi kiểu ID và tham chiếu sang String, định dạng tiền tố + 001–999; User dùng USR- riêng, không đổi mã theo role.

### Bảng thay đổi Training/Permission

| Bảng / phần | Nội dung giữ hoặc chỉnh | Lý do |
| --- | --- | --- |
| Role, Permission, Role_Permission | Giữ cơ chế quyền của mình; khóa và tham chiếu dùng String ROL-/PER- | Đồng nhất ID với API và entity |
| Trainer, Trainer_Detail | Giữ hồ sơ Trainer riêng HTR-, liên kết User USR-; tài khoản vẫn dùng role HEAD_TRAINER | Không tạo role TRAINER mới |
| Training_Assignment, Training_Assignment_Event | Giữ phân công, nhận/từ chối, kết thúc/thay thế theo đăng ký gói | Phân công phải gắn đúng gói của đúng ngựa |
| HORSE_PACKAGE | Giữ hợp đồng gói của mình; bổ sung truy vấn repository cho dịch vụ pause/expiry của N | Medical N còn gọi các dịch vụ này |
| Training_Plan, Horse_Plan, Training_Stage | Giữ kế hoạch và giai đoạn theo ngựa/gói/phân công đã nhận | Không dùng chung buổi giữa các gói |
| Training_Session | Giữ lịch, bắt đầu, kết thúc/ghi kết quả, quãng đường và chỉ số; giữ mapping ngày giờ local | Tránh thay đổi thời gian khi JDBC đọc/ghi |
| Training_Protocol, Training_Recommendation | Giữ gợi ý/lộ trình và bước Trainer xác nhận | Không tự xác nhận phác đồ thay người phụ trách |
| Medical_Record, Medical_Vital_Sign | Không sửa nghiệp vụ Medical N; Training đọc hồ sơ CONFIRMED, kết luận, cân nặng và nhịp tim nghỉ | Tích hợp đúng dữ liệu do phần Medical cung cấp |
| Training_Medical_Context | Chỉ đọc tùy chọn ideal weight/BCS nếu đã có dữ liệu; N Medical không tự ghi các trường này | Không ép sửa form hay nghiệp vụ của thành viên khác |

Các quy tắc Training được giữ trong code: cần gói hợp lệ/đã thanh toán, phân công phù hợp, buổi nằm trong hiệu lực gói và kế hoạch; training lock chặn thao tác theo yêu cầu trước. Chưa xác nhận lại các quy tắc này bằng test ở bản ghép cuối.

### Các chỗ buộc phải chạm ngoài Training/Permission

| Phần | Điều chỉnh |
| --- | --- |
| Account / Role / User / repository / DTO | Chuyển roleId và các ID liên quan sang String; dùng ROL-xxx, User USR-xxx; giữ nghiệp vụ mời nhân viên, OTP và đăng nhập của N |
| JWT / AuthenticatedUser | Claim role_id String; subject User theo USR-001..999 |
| BusinessEntity / BusinessIds / AssignedBusinessEntity / BusinessIdGenerator | Dùng chung bộ cấp mã; tạo mã hồ sơ OWN-/VET-/CM- riêng sau khi User tồn tại; hồ sơ HTR- vẫn tạo qua API Trainer |
| Horse ModuleIdAllocator | Giữ giao diện cấp mã của N, chuyển về bộ đếm có cùng tiền tố để tránh sinh trùng |
| Audit / Notification / RefreshToken / PasswordResetToken | Đồng bộ ID String và repository/controller phụ thuộc |
| Password_Reset_Token | Thêm purpose để giữ luồng mời nhân viên của N; không tạo tài khoản mẫu |

Medical được giữ theo N. Trong package Horse, phần khác N chỉ là ModuleIdAllocator phục vụ ID. Không thêm lại weight/admission_status vào Horse; không sửa kết luận khám của N.

Đã bỏ khỏi source hoạt động các lớp ngoài phạm vi chỉ có ở bản ghép cũ, nhằm dùng controller/service N: AdminAccountsController, MembershipController, RegistrationRequestController, AccountRoleProfile, RegistrationRequest, RegistrationRequestRepository, RegistrationRequestService, VetAssignmentController, VetAssignmentService, MedicalAccess. Bản trước thay đổi đã được sao lưu, không xóa dữ liệu DB.

Giữ ba lớp Training của N làm cầu nối cho Medical: TrainingPackagePauseService, TrainingPackageExpirationService, TrainingPackageExpiryScheduler. Bổ sung truy vấn HorsePackageRepository tương ứng, không lấy toàn bộ nghiệp vụ Training N.

### API cần lưu ý khi tích hợp frontend sau này

- Tạo nhân viên theo N: POST /api/admin/users, roleId là ROL-001..004; kích hoạt qua POST /api/auth/staff/set-password. Không dùng endpoint /api/admin/accounts cũ.
- Tạo hồ sơ Trainer: POST /api/admin/trainer-profiles.
- Đổi trạng thái Trainer: PATCH /api/admin/trainer-profiles/{id}/status.
- Các thao tác đọc hồ sơ/lịch sử/buổi tập và PUT hồ sơ có thêm alias /api/admin/trainer-profiles/...; URL /api/trainer-profiles/... tương ứng vẫn giữ. Quyền kiểm tra tại method được giữ nguyên.
- Không mở rộng SecurityConfig: đặt thao tác Admin vào nhóm /api/admin/** đã có của N.
- Phân công thú y dùng API N: POST /api/medical/assignments/horses/{horseId}, POST /api/medical/assignments/{assignmentId}/accept.
- Xác nhận OTP theo N trả thông báo; sau đó đăng nhập. Không khẳng định luồng N tự cấp token ở bước OTP.

### SQL bàn giao

- backend/scripts/RACEFORGE_FULL_STRING_ID.sql: bản tạo DB đầy đủ, đã có Password_Reset_Token.purpose. Dùng cho DB mới, không dùng để cập nhật DB đang có dữ liệu.
- backend/src/main/resources/db/string-migration/V13__n_staff_invitation_contract.sql: bổ sung purpose nếu thiếu, mặc định PASSWORD_RESET; không reset dữ liệu.
- backend/scripts/COPY_SQL_CAP_NHAT_PERMISSION_TRAINING.sql: bản copy SQL nâng cấp có thêm V13; vẫn yêu cầu SQLCMD và đúng nền UPDATE_V10 hoặc EMPTY như phần đầu file. Không dùng tùy ý trên DB gốc nhóm INT; không tự cập nhật Flyway history.
- Không thực thi SQL lên DB RaceForge thật trong bước hoàn tất này.

### Test, sao lưu và giới hạn

Theo yêu cầu “đổi code trước, không cần test”, đã dừng chạy test. Thay đổi cuối về URL Admin và fixture chưa được chạy lại. Những lượt chạy trước từng gặp lỗi quyền/fixture, vì vậy không coi bản ghép hiện tại là đã pass toàn bộ.

Đã đồng bộ source test với ID String và hợp đồng N. Năm test Training chỉ áp dụng triển khai N không được chọn đã đưa ra khỏi source hoạt động và sao lưu nguyên bản: HorsePackageMapperExpirationTest, HorsePackageAdmissionTest, PackageResumptionServiceTest, RecoveryTwoFlowsTest, TrainingPackageServiceTest. Không tính chúng là test đã pass.

Sao lưu và công cụ đối chiếu nằm ngoài repo tại D:/SWP391/RaceForge-main/.integration-staging/reconcile-n/: actual-before, before, n-base, ours và retired-training-tests. Không sao chép các script staging này vào source ứng dụng.


## K. Dọn phần Training chắc chắn dư (20/10/2026)

| File | Đã bỏ | Lý do |
| --- | --- | --- |
| HorsePackageRepository.java | Một khai báo findForUpdate trùng và các import trùng | Giữ một khai báo có cùng annotation/khóa; khắc phục khai báo method lặp |
| HorsePackageRepository.java | existsByTrainingPackage_PackageId, findByHorseIdOrderByRegisteredAtDesc | Không có chỗ gọi trong source main/test; hàm lịch sử findByHorse_HorseIdOrderByRegisteredAtDesc đang dùng vẫn giữ |
| ScheduleRecurringRequest.java | Toàn bộ DTO phiên bản cũ đã comment | Không tham gia thực thi |
| TrainingScheduleService.java | Đoạn thuật toán durationWeeks cũ đã comment | Luồng hiện tại dùng khoảng ngày của gói |

Không thay đổi trường request/response, endpoint, entity, bảng DB hay các service nghiệp vụ. Giữ các mục mới chỉ được đánh giá là có thể giản lược, gồm trainerId/performedBy/activityName, cảnh báo attendance, entity mapping và expireForLockedHorse. Không sửa frontend. Không chạy build/test/SQL theo yêu cầu. Chỉ đối chiếu source; chưa xác nhận trạng thái biên dịch của toàn bộ backend.


## L. Kiểm thử Training sau khi ghép N (20/10/2026)

Đã biên dịch source main/test và chạy toàn bộ test đang hoạt động trong package Training trên SQL Server kiểm thử riêng RaceForge_Verify_20261019_1750. Kết quả cuối: **56 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**.

| Bộ test | Số test | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| PackageRoadmapPolicyTest | 4 | 0 | 0 | 0 |
| TrainingPackageExpirationServiceTest | 8 | 0 | 0 | 0 |
| TrainingPackageExpirySchedulerTest | 2 | 0 | 0 | 0 |
| TrainingPackagePauseServiceTest | 5 | 0 | 0 | 0 |
| StringIdContractTest | 3 | 0 | 0 | 0 |
| StringTrainingWorkflowIT | 30 | 0 | 0 | 0 |
| TrainingCalendarRulesTest | 4 | 0 | 0 | 0 |

Trong đó StringTrainingWorkflowIT có 30 test chạy controller, security/JWT, service, JPA/JDBC và SQL Server thật. Email/Google verifier được mock; đây không phải test trình duyệt frontend hay dịch vụ Google/email thật. Không có bộ test riêng trong package Permission; tích hợp cấp/thu hồi quyền được kiểm tra trong StringTrainingWorkflowIT.

Các trường hợp đã kiểm tra gồm gói chưa trả tiền, Trainer chưa nhận hoặc không được phân công, nhiều Trainer, thay thế Trainer, thu hồi quyền có hiệu lực, bốn loại gói/lộ trình, gợi ý theo cân nặng và hồ sơ khám, xác nhận gợi ý, sinh lịch, tối đa sáu ngày/tuần, xung đột giờ, ngày nghỉ, liên kết đúng ngựa/gói và ràng buộc FK.

Bổ sung hai test: khóa tập chặn start/stop/complete rồi cho tiếp tục khi bỏ khóa, chặn thao tác sai vòng đời và kết quả sai (đo hồi phục quá sớm/quãng đường âm), giữ actual_end khi nộp kết quả, feedback không tự đổi lịch; tạo buổi trước/sau hạn gói phải bị từ chối và không ghi dòng session.

### Những gì sửa trong đợt test

| File | Thay đổi | Lý do |
| --- | --- | --- |
| training/service/TrainingWorkflowGuard.java | fitness_conclusion lấy Medical_Record.final_conclusion thay vì eligibility_reason | Gợi ý phải trả mã kết luận Vet chọn (FIT/FIT_WITH_MONITORING/NOT_FIT), không nhầm với lý do dạng text; có assertion FIT kiểm tra lại |
| training/StringTrainingWorkflowIT.java (test) | Bổ sung breed/imageUrl/registrationNumber cho ngựa mẫu, gọi activate sau approve | Theo đúng hợp đồng Horse N; không bỏ validation và không sửa nghiệp vụ Horse/Medical |
| Cùng file test | Thêm hai test tích hợp nêu trên | Kiểm tra trực tiếp training_lock ở các bước vận hành và hạn gói |

Command cuối: mvn -o test -Dtest=com.raceforge.backend.training.**,com.raceforge.backend.permission.** (script runner cấp biến môi trường DB kiểm thử). Không sửa frontend, không thực thi vào DB RaceForge thật. Fixture tích hợp dùng transaction rollback; sequence sinh mã trên DB kiểm thử có thể tăng dù rollback.

### Giới hạn của kết quả

Lượt kiểm tra rộng ban đầu chạy 177 test, có 25 failures và 4 errors. 22 failures thuộc fixture Training cũ đã được sửa và kiểm tra lại trong lượt cuối đạt 56/56. Ngoài Training còn 3 assertion trong BackendApplicationTests mong Horse ID sai định dạng trả 400, nhưng N trả 404; 4 errors của AuthDatabaseIT do thiếu disposable migration-test clone đúng tên bắt buộc. Chưa chỉnh những phần ngoài Training này; không tuyên bố toàn backend đã pass.

Các test N-only đã đưa ra khỏi source hoạt động ở mục J không được tính là đã pass. Kết quả trên xác nhận các trường hợp đang có trong bộ test, không bảo đảm mọi tình huống production hay giao diện đều không có lỗi.


## M. Kiểm tra Swagger trên Chrome thật (20/10/2026)

- Backend chạy tại http://127.0.0.1:18080, DB riêng RaceForge_Verify_20261019_1750; không dùng DB RaceForge thật.
- Swagger UI và /v3/api-docs trả HTTP 200. Chrome headless dùng profile riêng, tải được 123 thao tác API; không có lỗi spec hiển thị hoặc Runtime.exceptionThrown trong lượt kiểm tra.
- Đã bấm các control Try it out / Execute bằng Chrome DevTools Protocol, không dùng MockMvc trong lượt này. Bearer token được đặt bằng API authorize của Swagger; các request đi qua HTTP tới backend đang chạy.
- Đã thực hiện 10 request: login Admin (200), tạo nhân viên (201), đặt mật khẩu qua invitation (200), tạo hồ sơ Trainer (200), login Trainer (200), đọc danh sách gói (200), xem phân công của Trainer (200), xem roadmap-template theo PKG ID (200), tạo session với PLN-999 không tồn tại (404 đúng dự kiến), đọc lại gói (200).
- POST session trả 404 là ca âm kiểm tra thông báo lỗi, không phải bằng chứng đã tạo/hoàn tất buổi thành công qua Swagger. Luồng tạo kế hoạch đến hoàn tất đã được kiểm tra bằng bộ API–DB tích hợp tại mục L; không khẳng định mọi endpoint đã được bấm thử trên Swagger.
- Staff được tạo qua API Admin và kích hoạt qua API invitation. SMTP sink cục bộ 127.0.0.1:12525 nhận email thử, không chuyển email ra ngoài. Không chèn tài khoản nhân viên bằng SQL.
- Không sửa source backend/frontend/SQL trong lượt kiểm tra Swagger. Tài khoản và dữ liệu thử của lượt HTTP này lưu trong DB kiểm thử riêng, không rollback như test Spring ở mục L.

Artifact nằm ngoài repo tại D:/SWP391/RaceForge-main/.integration-staging/reconcile-n/: swagger-browser-results.json (kết quả), swagger-training-browser.png (ảnh đã ẩn bearer token), swagger-test-account.json (tài khoản Trainer thử), swagger-backend.log. Token/email invitation được giữ trong file test cục bộ, không đưa vào ghi chú bàn giao.
