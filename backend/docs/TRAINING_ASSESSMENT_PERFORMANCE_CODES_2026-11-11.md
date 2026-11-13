# Assessment performance codes — bàn giao ngày 11/11/2026

Source: D:\SWP391\RaceForge-premain4-premain\RaceForge-premain4

## Phạm vi đã sửa

Đổi đồng bộ mã lưu thật, tên và hướng dẫn của 10 tiêu chí. Giữ checklistVersion POST_TRAINING_V1 và cấu trúc API hiện có. Không có alias cho mã cũ, không có V2.

| Mã cũ | Mã mới | Nhãn tiếng Anh |
|---|---|---|
| ALERTNESS | TASK_COMPLETION | Task Completion |
| COORDINATION | SPEED_CONTROL | Speed Control |
| BREATHING_EFFORT | MOVEMENT_STABILITY | Movement Stability |
| GAIT | BALANCE | Balance |
| LIMB_CONDITION | COMMAND_RESPONSE | Command Response |
| MUSCLE_COMFORT | FOCUS | Focus |
| EXTERNAL_INJURY | STAMINA | Stamina |
| SWEATING | SPEED_TRANSITION | Speed Transition |
| MUCOUS_MEMBRANES | COOPERATION | Cooperation |
| NASAL_BLEEDING | PERFORMANCE_CONSISTENCY | Performance Consistency |

Quy tắc được chuyển tên theo từng ô, không thay thuật toán:

- 7–10 Pass: Normal; 4–6 Pass: Vet Check Recommended; 0–3 Pass: Urgent Vet Check.
- SPEED_CONTROL hoặc MOVEMENT_STABILITY Concern: Urgent.
- BALANCE, COMMAND_RESPONSE hoặc PERFORMANCE_CONSISTENCY Concern: ít nhất Recommended.
- Chọn mức nặng nhất; không dùng Good Performance / Needs Improvement / Below Expectations.
- Pass/Concern, note tổng tùy chọn, thông báo Vet tự động/thủ công và điều kiện pending chặn Start giữ nguyên.
- Đây là quy tắc phần mềm đã chốt cho RaceForge, không phải ngưỡng performance mới được kiểm định.

## File production

Các đường dẫn backend dưới backend/src/main/java/com/raceforge/backend/:

| File | Nội dung |
|---|---|
| training/entity/TrainingAssessmentCriterion.java | Đúng 10 enum, nhãn/hướng dẫn performance theo thứ tự chính thức |
| training/service/TrainingAssessmentRules.java | Đổi 5 hằng override, giữ score/priority/thứ tự trigger |
| training/dto/TrainingAssessmentRequest.java | Swagger mô tả đủ 10 mã mới |
| training/controller/TrainingAssessmentController.java | Mô tả template performance |
| training/controller/TrainingSessionController.java | Mô tả Complete performance assessment |

Validator, deserializer, template service, mapper và notification summary đang dùng enum động. Sau đổi enum, chúng dùng bộ mã/nhãn mới; không thêm lớp tương thích mã cũ, không đổi quyền hoặc luồng Medical.

Frontend:

| File | Nội dung |
|---|---|
| frontend/src/features/training/trainingAssessment.ts | Bộ fallback cùng 10 mã/nhãn/hướng dẫn backend; đổi override và payload theo mã mới |
| frontend/src/features/training/TrainingAssessmentView.tsx | Form dùng template API; kết quả và priority warning dùng nhãn response; fallback cùng mã mới |

Không sửa snapshot lịch sử session-*-up. Giữ các chỉnh sửa khác đang có trong working tree, bao gồm công việc hủy/hoàn thành gói trước đó. Không tạo package support.

## API và payload

Route và JSON shape giữ nguyên:

- GET /api/training-assessments/template: 10 mã mới trong criteria.
- PATCH /api/training-sessions/{sessionId}/complete: assessment.checks có đủ 10 mã mới và boolean thật.
- PUT /api/training-sessions/{sessionId}/attendance: COMPLETED dùng checklist mới; MISSED giữ nguyên.
- GET /api/training-sessions/{sessionId}/assessment: items[].code, failedCriteria và các trigger tiêu chí dùng mã mới.
- API gửi Vet, target notification và Start giữ route/quyền/nghiệp vụ hiện có.

Ví dụ phần assessment của Complete:

~~~json
{
  "checklistVersion": "POST_TRAINING_V1",
  "checks": {
    "TASK_COMPLETION": true,
    "SPEED_CONTROL": true,
    "MOVEMENT_STABILITY": true,
    "BALANCE": true,
    "COMMAND_RESPONSE": true,
    "FOCUS": true,
    "STAMINA": true,
    "SPEED_TRANSITION": true,
    "COOPERATION": true,
    "PERFORMANCE_CONSISTENCY": true
  }
}
~~~

Phần measurements bắt buộc hiện có vẫn phải được gửi khi Complete; ví dụ trên chỉ là phần assessment. Note tổng tùy chọn vẫn dùng performanceNotes ở request Complete; không bắt buộc ghi chú cho từng Concern.

Mã cũ/không rõ, thiếu/null, không phải boolean thật và key trùng vẫn bị từ chối. SCORE_REVIEW và SCORE_URGENT giữ nguyên.

## SQL chạy tay — đã tạo file, CHƯA chạy

File: backend/scripts/training/07_training_assessment_performance_codes.sql

- Không phải Flyway migration. Không sửa migration đã phát hành.
- Dùng database đang chọn trong SSMS, không có USE cố định, không tự kết nối database.
- Kiểm tra bảng/cột, phiên bản/compatibility SQL Server, mã đầu vào và trùng tiêu chí sau mapping.
- Một transaction, giữ khóa bảng xuyên suốt kiểm tra và cập nhật.
- Đổi criterion_code; thay constraint CK_TSAI_Criterion chỉ nhận 10 mã mới.
- Phân tích trigger_codes thành token bằng OPENJSON có ordinal; ghép lại bằng STRING_AGG theo ordinal.
- Từ chối token lạ/rỗng/sai định dạng; giữ SCORE_REVIEW, SCORE_URGENT và thứ tự.
- Kiểm tra độ dài cột, số dòng, mã đầu ra, thứ tự token và constraint được kiểm chứng trước commit.
- Lỗi trong transaction được THROW và rollback; chạy lại trên dữ liệu đã đổi hoặc bảng rỗng không tạo trùng.
- Không thêm bảng/cột, không xóa dữ liệu, không đổi item/session ID.
- Không cập nhật Pass/Concern, notes, điểm, mức cảnh báo, checklist version, review/delivery, version, Medical linkage hoặc Notification.
- Không tính lại mức và không gửi lại thông báo. Nội dung thông báo đã gửi trước đây giữ nguyên.
- Độc lập với 06_horse_package_expired_status.sql.

Trình tự áp dụng sau khi được người dùng yêu cầu riêng:

1. Dừng backend và các client đang ghi dữ liệu.
2. Sao lưu database, chọn đúng database RaceForge.
3. Chạy file 07; nếu dữ liệu không hợp lệ thì xử lý nguyên nhân được báo, không bỏ kiểm tra.
4. Đưa backend và frontend cùng bộ mã mới vào sử dụng, rồi mở lại backend.
5. Tải mới giao diện để không gửi checklist đang cache bằng mã cũ.

Không chạy backend enum cũ trên dữ liệu đã đổi. Nếu cần quay lại bản cũ sau khi SQL đã commit, phải lập kế hoạch hoàn tác code và dữ liệu đồng bộ; script này không tự hoàn tác sau commit.

## Fixture/test đã cập nhật — CHƯA chạy

Backend dưới backend/src/test/java/com/raceforge/backend/training/:

- controller/TrainingAssessmentControllerTest.java
- dto/TrainingAssessmentRequestTest.java
- service/TrainingAssessmentValidatorTest.java
- service/TrainingAssessmentRulesTest.java
- service/TrainingAssessmentServiceTest.java
- service/TrainingAssessmentNotificationServiceTest.java
- service/TrainingSessionAssessmentCompletionTest.java
- service/HorsePackageLifecycleDatabaseTest.java: chuẩn bị áp dụng file 07 trong DB UUID riêng sau schema fixture và trước seed; chưa chạy.

Frontend:

- frontend/tests/trainingAssessment.test.mjs
- frontend/tests/trainingAssessmentUi.test.mjs
- frontend/tests/apiIntegration.test.mjs
- frontend/tests/trainingSchedule.test.mjs
- frontend/tests/visual/fixtureData.ts

Các ca đã chuẩn bị trong test source hoặc cần kiểm chứng khi được phép:

| Ca | Bằng chứng hiện tại | Trạng thái thực thi |
|---|---|---|
| Đủ 10 mã/nhãn/template mới, POST_TRAINING_V1 | Enum/fallback, fixture contract | NOT RUN |
| Từ chối từng mã cũ ở checks, failNotes, saved items/template frontend | Test parser, validator và adapter đã cập nhật | NOT RUN |
| Missing/null, sai kiểu, key trùng và key JSON escaped trùng | Fixture parser được đổi sang mã mới | NOT RUN |
| Biên điểm 0–10 và đủ 5 override, giữ thứ tự trigger | Rules tests/preview fixtures được đổi theo mapping | NOT RUN |
| Form, kết quả, priority warning ưu tiên nhãn API | UI fixture có nhãn/hướng dẫn server khác fallback | NOT RUN |
| Complete và attendance không bypass, HR/Vet/Start không đổi | Production chỉ đổi hằng scoring; fixture Complete/notification được cập nhật | NOT RUN |
| SQL đổi dữ liệu cũ và CSV theo thứ tự; không còn mã cũ | Script có preflight/postcheck; cần DB kiểm chứng thật | NOT RUN |
| SQL giữ row count, boolean/notes/kết quả và liên kết | UPDATE chỉ chạm 2 cột mã; cần đối chiếu DB trước/sau | NOT RUN |
| Dữ liệu hỗn hợp gây trùng hoặc token lạ phải rollback | Script có guard trước sửa; cần DB kiểm chứng thật | NOT RUN |
| Chạy SQL lần hai, hoặc bảng rỗng | Script thiết kế idempotent; cần DB kiểm chứng thật | NOT RUN |

Chỉ rà soát tĩnh source/diff và cú pháp TS/TSX; không chạy module nghiệp vụ, test runner, build hay SQL. Chưa chứng minh chạy end-to-end hoặc tính đúng SQL bằng database thực tế. Chưa commit/push.
