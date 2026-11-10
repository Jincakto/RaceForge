> Báo cáo này ghi lại mốc lịch sử **session-back-end-up**. Quy tắc ghi chú từng Concern bên dưới đã được người dùng thay thế ngày 10/11/2026: không bắt ghi chú riêng; chỉ có Overall notes tùy chọn dùng performanceNotes. Xem [mốc session-front-end-up](../../docs/session-up/README.md) để biết contract và kết quả mới nhất. Các số test bên dưới là kết quả của mốc trước.

# RaceForge Post-Training Assessment — bàn giao backend

Ngày: 10/11/2026. Nhánh: `premain4`.

Source: `D:\SWP391\RaceForge-premain4-premain\RaceForge-premain4`.

Đặc tả: toàn bộ 580 dòng của file đính kèm ngày triển khai và plan backend-first đã được người dùng duyệt. Backend được chuẩn bị trước; tính năng chưa được xác nhận chạy end-to-end.

## Phạm vi và trạng thái

- Đã triển khai contract, validation, scoring, entity/repository, Complete, attendance, assessment detail, notification, Start guard và Medical bridge.
- Không tạo package `support`.
- Không sửa frontend; không test/build frontend.
- Không viết/apply SQL hoặc migration; không kết nối hoặc sửa database.
- Không khởi động ứng dụng backend mới với schema cũ; không thay `ddl-auto: validate`.
- Không commit/push.
- Giữ cơ chế cấp mã Session/Medical/Notification. Notification ID là Integer; Session và Medical ID là String.
- Single-club: Club Manager ACTIVE có quyền đọc trong CLB duy nhất. Không thêm mô hình nhiều CLB.

**Giới hạn triển khai:** schema hiện tại chưa có các entity mới. Backend sẽ cần schema được phê duyệt và kiểm chứng riêng trước khi chạy tính năng thực tế. Không đổi auto-DDL để né giới hạn này.

## Kết quả theo phase

Mỗi phase dưới đây dùng chung xác nhận: không SQL/database/frontend/commit/push.

| Phase | File và API | Quyền, validation và nghiệp vụ | Lệnh/kết quả thực tế | Chưa kiểm chứng |
|---|---|---|---|---|
| 0 | Đọc source đích; git status và file map | Baseline sạch; giữ Start khác ngày | Đối chiếu code, không chạy app | Không chứng minh runtime/schema |
| 1 | DTO/enums, parser, request advice, validator/rules, template contract | 10 boolean thật, duplicate/unknown/type/note/version; tính mức và override | `mvn -o "-Dtest=TrainingAssessmentRequestTest,TrainingAssessmentValidatorTest,TrainingAssessmentRulesTest" test`: **121 PASS** | Form frontend, dữ liệu lưu thật |
| 2 | Ba entity và ba repository chính trong Training | Một assessment/session, một item/criterion, linkage riêng | `mvn -o "-Dmaven.test.skip=true" compile`: **PASS** | Schema, unique constraint và JPA query chạy thật |
| 3 | Session service, Complete DTO, mapper, response, GET detail | Complete và attendance COMPLETED chung validator; MISSED không bắt checklist | `mvn -o "-Dtest=TrainingAssessment*Test,TrainingSessionAssessmentCompletionTest,TrainingSessionFeedbackServiceTest,TrainingReadAccessTest,TrainingFutureScheduleTest" test`: **208 PASS** | Persistence/rollback thực tế |
| 4 | Frontend | **DEFERRED theo yêu cầu** | Không sửa, không chạy | Toàn bộ UI |
| 5 | Notification service, controller, pending guard, batch scope repository | Normal gửi tay không pending; alert tự gửi; recipient/current scope; chặn Start theo ngựa | Lượt 284 test: 282 PASS, 2 lỗi fixture; sửa fixture và chạy lại Access+Notification: **79 PASS**. Không còn lỗi của lượt này | Delivery/unique/concurrency thật |
| 6 | Medical bridge và ba file Medical tích hợp | Linked DRAFT/Confirm/reassignment; giữ Medical Lock | **86 PASS**: 51 bridge, 18 hooks, 4 mark-read và 13 regression Medical. Lệnh đầy đủ ở phần Test | Transaction/linkage lưu thật |
| 7 | Rà soát backend và bảng T01–T42 | Phân biệt mock và bằng chứng DB; regression Training/Package/HR/Medical | **484 PASS**, 0 failure/error/skipped; compilation PASS; git diff --check PASS | DB/frontend/E2E |

Log các lượt chạy ở `backend/target/assessment-phase*.log` (build artifacts, không commit).

## File mới

Các đường dẫn dưới đây tính từ `backend/src/main/java/com/raceforge/backend/`.

| Khu vực | File |
|---|---|
| Controller | `training/controller/TrainingAssessmentController.java`, `TrainingAssessmentRequestBodyAdvice.java` |
| Request/validation group | `training/dto/TrainingAssessmentRequest.java`, `TrainingAssessmentRequestDeserializer.java`, `CompletionRequired.java`, `VetNotificationRequest.java` |
| Response | `training/dto/TrainingAssessmentItemResponse.java`, `TrainingAssessmentResponse.java`, `TrainingAssessmentTemplateResponse.java`, `TrainingVetNotificationResponse.java`, `TrainingNotificationTargetResponse.java` |
| Enums | `training/entity/TrainingAssessmentCriterion.java`, `TrainingAssessmentAlertLevel.java`, `TrainingAssessmentReviewStatus.java`, `TrainingAssessmentNotificationStatus.java` |
| Entities | `training/entity/TrainingSessionAssessment.java`, `TrainingSessionAssessmentItem.java`, `TrainingAssessmentNotificationLink.java` |
| Repositories | `training/repository/TrainingSessionAssessmentRepository.java`, `TrainingSessionAssessmentItemRepository.java`, `TrainingAssessmentNotificationLinkRepository.java`, `TrainingAssessmentScopeRepository.java` |
| Services | `training/service/TrainingAssessmentValidator.java`, `TrainingAssessmentRules.java`, `TrainingAssessmentAccessService.java`, `TrainingAssessmentService.java`, `TrainingAssessmentNotificationService.java`, `TrainingAssessmentMedicalBridge.java` |
| Event | `training/service/TrainingAssessmentRecordedEvent.java` — event nội bộ đồng bộ, không phải queue khám |
| Mapper | `training/mapper/TrainingAssessmentMapper.java` |

Repository scope bổ sung phục vụ batch phân quyền trên danh sách nhiều ngựa, tránh truy vấn assignment từng dòng.

## File có sẵn đã sửa

| File | Thay đổi |
|---|---|
| `training/dto/CompleteSessionRequest.java` | Assessment, cascade validation, group CompletionRequired, mô tả schema |
| `training/dto/TrainingSessionResponse.java` | Assessment, pending flag, startBlockedCode |
| `training/service/TrainingSessionService.java` | Complete lưu assessment trong transaction; Start kiểm tra quyền trước pending |
| `training/service/TrainingScheduleCoordinator.java` | Pending theo horse batch; canStart và lý do đồng bộ |
| `training/mapper/TrainingSessionMapper.java` | Enrich assessment theo batch, chỉ scope được đọc |
| `training/controller/TrainingSessionController.java` | Mô tả Swagger Complete |
| `notification/service/NotificationService.java` | Thêm notifyAndReturnId; giữ notify void |
| `medical/dto/MedicalRecordCreateRequest.java` | Context postTrainingSessionId tùy chọn |
| `medical/service/MedicalRecordService.java` | Hook prepare/bind DRAFT và before/after Confirm |
| `medical/service/MedicalAssignmentService.java` | Hook đổi trạng thái/phân công vet; khóa horse trước assignment và refresh assignment sau khóa |

Ba fixture Medical cũ được cập nhật constructor với mock bridge:
`MedicalEligibilityConfirmationTest`, `MedicalRecordIdGenerationTest`, `MedicalRecordPreviewTest`.

Không sửa NotificationController/NotificationResponse, entity Medical_Record/Notification hoặc GlobalExceptionHandler.

## Luồng nghiệp vụ thực tế trong code

1. Trainer hiện tại Stop buổi tập và ghi measurements như cũ.
2. Complete kiểm tra quyền và measurements, rồi validator kiểm tra assessment.
3. Trong cùng transaction, Session thành COMPLETED; lưu assessment và đủ 10 item.
4. Rules tính mức từ các đáp án. Normal lưu NOT_REQUIRED; hai mức cảnh báo lưu PENDING.
5. Event đồng bộ gọi notification service trong transaction. Lỗi lưu được truyền ra cho transaction rollback; không trả thành công khi lỗi.
6. Start mới của cùng ngựa kiểm tra PENDING sau xác thực quyền, dù thuộc package khác.
7. Vet hiện tại mở assessment qua notification target, tạo DRAFT với context. DRAFT chỉ liên kết, chưa resolve.
8. Confirm hồ sơ đã liên kết giải quyết đúng assessment đó. NOT_FIT vẫn tạo khóa y tế theo luồng cũ; FIT không tự unlock.
9. Nếu đổi vet, DRAFT cũ CANCELLED vẫn giữ audit; vet mới có thể liên kết DRAFT thay thế.

Complete/Start giữ thứ tự khóa schedule → horse → session. Medical context giữ horse → assessment, không lấy schedule lock sau horse.

Medical server-generated createdAt/confirmedAt được đổi sang múi giờ training để so với assessment; examinedAt có context được hiểu là giờ địa phương CLB. Không thay timestamp entity Medical toàn hệ thống. Cần kiểm chứng round-trip JDBC/timezone khi có DB.

## Checklist và tính mức

Version: `POST_TRAINING_V1`.

`ALERTNESS, COORDINATION, BREATHING_EFFORT, GAIT, LIMB_CONDITION, MUSCLE_COMFORT, EXTERNAL_INJURY, SWEATING, MUCOUS_MEMBRANES, NASAL_BLEEDING`.

- `true` = Pass; `false` = Concern observed.
- Thiếu/null/sai kiểu/key lạ/key trùng bị từ chối. Không ép chuỗi hoặc 0/1 thành boolean.
- Note của mục false phải còn 1–1.000 ký tự sau trim. Không nhận note mã lạ.
- Không nhận trường điểm, mức hoặc trạng thái do client quyết định trong assessment.
- 7–10 Pass: Normal; 4–6: Vet Check Recommended; 0–3: Urgent Vet Check.
- COORDINATION/BREATHING_EFFORT false: Urgent.
- GAIT/LIMB_CONDITION/NASAL_BLEEDING false: ít nhất Recommended.
- Chọn mức nặng nhất; lưu triggers. HR giữ là dữ liệu riêng.

## API và cách dùng

Các API assessment mới dùng `ApiResponse(success, message, data, timestamp)`. Notification API cũ giữ response hiện có.

| API | Input | Quyền / kết quả |
|---|---|---|
| GET `/api/training-assessments/template` | Bearer token | Trainer có profile ACTIVE và VIEW/MANAGE_TRAINING; Vet/Manager ACTIVE. Trả version, đủ 10 code/label/helpText, map nhãn mức |
| PATCH `/api/training-sessions/{sessionId}/complete` | Measurements cũ + assessment | Current accepted trainer + MANAGE_TRAINING; đã Start/Stop và các guard cũ hợp lệ. Trả session có assessment |
| PUT `/api/training-sessions/{sessionId}/attendance` | status và dữ liệu kế thừa Complete | COMPLETED phải đủ assessment/measurements; MISSED không bắt checklist. Quyền write cũ |
| GET `/api/training-sessions/{sessionId}/assessment` | sessionId String | Current trainer scope hoặc historical recorder theo TrainingReadAccess; vet hiện tại ASSIGNED/ACCEPTED/legacy COMPLETED mới nhất; Manager ACTIVE. Owner bị từ chối |
| POST `/api/training-sessions/{sessionId}/vet-notification` | Normal: `{"reason":"Concern about recovery after exercise."}` | Current accepted trainer + MANAGE_TRAINING. Không nhận recipient. Normal không tạo pending; alert trả trạng thái đã tự gửi/chờ |
| GET `/api/training-assessments/notifications/{notificationId}/target` | notificationId Integer | Kiểm tra đúng recipient trước, rồi scope hiện tại; trả sessionId, horseId, targetType, targetPath |
| PATCH `/api/training-sessions/{sessionId}/start` | Không thêm body | Guard cũ + không còn assessment PENDING của ngựa. Pending trả 409 PENDING_POST_TRAINING_REVIEW |
| POST `/api/medical/records` | Dữ liệu khám cũ + postTrainingSessionId tùy chọn | Vet được phép khám theo Medical policy; có context phải đúng ngựa/session/thời điểm và vet hiện tại đã accepted |
| POST `/api/medical/records/{medicalRecordId}/confirm` | Không thêm body | Policy Medical cũ; bridge chỉ xử lý bản đã liên kết; DRAFT/CANCELLED không resolve |

Ví dụ Complete dưới đây là contract mẫu, **chưa gửi vào server/DB**. Thay ID và thời gian theo buổi đã Stop:

```json
{
  "distance": 2.50,
  "avgSpeed": 12.0,
  "maxSpeed": 18.0,
  "endExerciseHeartRate": 120,
  "recoveryHeartRate2Min": 90,
  "recoveryMeasuredAt": "2026-11-10T10:32:00",
  "performanceNotes": "Completed the planned exercise.",
  "assessment": {
    "checklistVersion": "POST_TRAINING_V1",
    "checks": {
      "ALERTNESS": true,
      "COORDINATION": true,
      "BREATHING_EFFORT": true,
      "GAIT": true,
      "LIMB_CONDITION": true,
      "MUSCLE_COMFORT": true,
      "EXTERNAL_INJURY": true,
      "SWEATING": true,
      "MUCOUS_MEMBRANES": true,
      "NASAL_BLEEDING": true
    },
    "failNotes": {}
  }
}
```

Ví dụ muốn ghi Concern ở GAIT: đổi GAIT thành false và thêm `"failNotes":{"GAIT":"New uneven movement observed."}`. Backend sẽ trả Recommended dù có 9/10 Pass.

GET detail trả: sessionId, horseId, assessorUserId/name, assessedAt, checklistVersion, items(code/label/passed/failNote), passedCount, failedCount, alertLevel, triggerCodes, failedCriteria, reviewStatus, notificationStatus, linkedMedicalRecordId, reviewedMedicalRecordId, pendingPostTrainingReview.

Trạng thái gửi tay: SENT / ALREADY_SENT / WAITING_FOR_VET_ASSIGNMENT, kèm startBlocked và message. Normal gửi tay vẫn NOT_REQUIRED; startBlocked chỉ true nếu ngựa còn assessment PENDING khác.

Delivery WAITING_FOR_VET_ASSIGNMENT không phải nguyên nhân chặn Start. Chỉ reviewStatus PENDING tạo hold.

targetPath là contract chuẩn bị cho frontend; chưa có UI/deep-link được triển khai trong đợt này.

## Test và bằng chứng

Tất cả test trong đợt này dùng logic thuần, mock hoặc MockMvc slice. Không dùng test database.

Danh sách test mới: TrainingAssessmentRequestTest, TrainingAssessmentValidatorTest, TrainingAssessmentRulesTest, TrainingAssessmentAccessServiceTest, TrainingAssessmentServiceTest, TrainingSessionAssessmentCompletionTest, TrainingPendingReviewGuardTest, TrainingAssessmentControllerTest, TrainingAssessmentNotificationServiceTest, TrainingAssessmentMedicalBridgeTest, TrainingAssessmentMedicalHooksTest và test mark-read.

Kết quả kiểm tra cuối: **484 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS**. Backend main/test source đều được biên dịch trong lifecycle Maven. Không có lỗi compile/unit/controller test còn tồn tại trong tập đã chọn.

Lệnh Phase 6 (86 PASS):

```powershell
mvn -o "-Dtest=TrainingAssessmentMedicalBridgeTest,TrainingAssessmentMedicalHooksTest,TrainingNotificationReadTest,MedicalEligibilityConfirmationTest,MedicalRecordIdGenerationTest,MedicalRecordPreviewTest,MedicalPrincipalTest,TrainingLockNotificationTest" test
```

Lệnh cuối (484 PASS):

```powershell
mvn -o "-Dtest=TrainingAssessment*Test,TrainingSessionAssessmentCompletionTest,TrainingPendingReviewGuardTest,TrainingNotificationReadTest,TrainingSessionFeedbackServiceTest,TrainingReadAccessTest,TrainingFutureScheduleTest,MedicalEligibilityConfirmationTest,MedicalRecordIdGenerationTest,MedicalRecordPreviewTest,MedicalPrincipalTest,TrainingLockNotificationTest,Package*Test,HorsePackage*Test,RacingMedicalEligibilityTest,TrainingContextReadTest,TrainingPackage*Test,TrainingReadinessServiceTest" test
```

Working directory cho Maven: `D:\SWP391\RaceForge-premain4-premain\RaceForge-premain4\backend`.
Log cuối: [assessment-final-backend.log](../target/assessment-final-backend.log); Phase 6: [assessment-phase6.log](../target/assessment-phase6.log).
Các tên wildcard ở trên đã được kiểm tra để không chọn hai test database của Training.

Test lớp mới đã chạy:

| Test | Số lượt PASS |
|---|---:|
| TrainingAssessmentRequestTest | 63 |
| TrainingAssessmentValidatorTest | 35 |
| TrainingAssessmentRulesTest | 23 |
| TrainingAssessmentAccessServiceTest | 42 |
| TrainingAssessmentServiceTest | 12 |
| TrainingAssessmentNotificationServiceTest | 40 |
| TrainingAssessmentControllerTest | 21 |
| TrainingSessionAssessmentCompletionTest | 19 |
| TrainingPendingReviewGuardTest | 12 |
| TrainingAssessmentMedicalBridgeTest | 51 |
| TrainingAssessmentMedicalHooksTest | 18 |
| TrainingNotificationReadTest | 4 |

340 lượt thuộc các lớp feature mới; 144 lượt còn lại là regression có sẵn. Không cộng các lượt chạy lại thành số test riêng.

`git -c core.safecrlf=false diff --check`: PASS. Kiểm tra file map: chỉ bốn file main-source ngoài Training đã nêu; không file frontend/resources/config/SQL/migration/support thay đổi.

### Đối chiếu T01–T42

PASS ở cột backend chỉ áp dụng phạm vi đã test; cột chờ là phần chưa được chứng minh. Không xem bảng này là 42 acceptance case đã hoàn thành end-to-end.

| Test | Backend không DB | Phần còn chờ |
|---|---|---|
| T01 | PASS — thiếu assessment bị 400 (JSON/validator/MockMvc) | DEFERRED — Save disabled trên UI |
| T02 | PASS — thiếu một key bị từ chối | DEFERRED — UI 9/10 |
| T03 | PASS — null/type/unknown/duplicate bị từ chối | DEFERRED — HTTP với dữ liệu thật |
| T04 | PASS — false thiếu note bị từ chối | DEFERRED — form |
| T05 | PASS — whitespace/1.001 ký tự bị từ chối | DEFERRED — form |
| T06 | PASS — 10/10, NOT_REQUIRED, không tự gửi/chặn | DEFERRED — lưu/đọc DB và UI |
| T07 | PASS — 7/10 không override | DEFERRED — persistence |
| T08 | PASS — 6/10, Recommended, pending/auto/guard bằng mock | DEFERRED — transaction DB |
| T09 | PASS — 4/10 Recommended | DEFERRED — persistence |
| T10 | PASS — 3/10 Urgent, pending/auto/guard bằng mock | DEFERRED — transaction DB |
| T11 | PASS — 0/10 Urgent | DEFERRED — persistence |
| T12 | PASS — Coordination override | DEFERRED — persistence/UI |
| T13 | PASS — Breathing override | DEFERRED — persistence/UI |
| T14 | PASS — Gait override | DEFERRED — persistence/UI |
| T15 | PASS — Limb override | DEFERRED — persistence/UI |
| T16 | PASS — Nasal bleeding override | DEFERRED — persistence/UI |
| T17 | PASS — chọn ưu tiên Urgent | DEFERRED — persistence |
| T18 | PASS — reason, đúng vet, Normal không pending | DEFERRED — delivery và Start DB |
| T19 | PASS — retry không gửi lặp bằng mock | DEFERRED — unique/concurrency DB |
| T20 | PASS — auto-send/retry trả delivery hiện có | DEFERRED — UI và lưu thật |
| T21 | PASS — thiếu vet: Manager + waiting, giữ review độc lập | DEFERRED — delivery/UI thật |
| T22 | PASS — vet mới nhận, vet cũ mất read scope | DEFERRED — assignment đồng thời DB |
| T23 | PASS — ASSIGNED đọc/nhận, chưa accepted không khám | DEFERRED — Medical/assignment DB |
| T24 | PASS — target đúng session, recipient trước scope | DEFERRED — click/refresh frontend |
| T25 | PASS — gọi controller markRead thật; pending và guard 409 giữ nguyên | DEFERRED — notification/pending lưu thật |
| T26 | PASS — bind DRAFT không resolve; kiểm tra bridge và Medical hook | DEFERRED — liên kết DRAFT DB |
| T27 | PASS — CANCELLED/mismatch/old/unlinked không resolve; relink có audit | DEFERRED — CANCELLED/mismatch/old-record DB |
| T28 | PASS — linked Confirm FIT/FIT_WITH_MONITORING resolve đúng assessment | DEFERRED — Confirm FIT/FIT_WITH_MONITORING DB |
| T29 | PASS — linked NOT_FIT resolve sau Medical Lock; không auto-unlock | DEFERRED — NOT_FIT + Medical Lock DB |
| T30 | PASS — còn một pending khác vẫn bị chặn bằng mock | DEFERRED — requery/transaction thật |
| T31 | PASS — phạm vi pending đúng horse | DEFERRED — hai ngựa DB |
| T32 | PASS — pending xuyên package của cùng horse | DEFERRED — hai package DB |
| T33 | PASS — Start MockMvc 409 và guard service | DEFERRED — gọi server thật |
| T34 | PASS — chưa Stop không lưu assessment | DEFERRED — regression DB |
| T35 | PASS — COMPLETED chung validator; MISSED không checklist | DEFERRED — attendance DB |
| T36 | PASS — gọi lặp bị từ chối, lock order bằng mock | DEFERRED — hai request đồng thời + unique constraint |
| T37 | PASS — lỗi được truyền ra, không nuốt exception | DEFERRED — rollback thật cần DB |
| T38 | PASS — guard và thứ tự khóa bằng mock/source review | DEFERRED — race Start–Complete thật cần DB |
| T39 | PASS — assessment lịch sử thiếu trả 404, không tạo 10 Pass | DEFERRED — UI nhãn lịch sử |
| T40 | PASS — giữ test HR hiện có, không sửa schedule từ feedback | DEFERRED — tích hợp với dữ liệu thật |
| T41 | PASS — role/permission/assignment/recorder/vet/recipient scope | DEFERRED — kiểm chứng DB; ngoài CLB không áp dụng single-club |
| T42 | PASS — template/messages tiếng Anh, labels khác codes | DEFERRED — không render enum trên UI thực tế |

## Hạng mục hoãn và lưu ý kiểm chứng tiếp

- Toàn bộ schema, lưu/đọc lại assessment và linkage, JPA query runtime, các ràng buộc linkage cần kiểm chứng ở giai đoạn DB được yêu cầu riêng. Tài liệu này không chứa SQL/migration.
- Rollback, isolation, unique constraints và concurrency không được kết luận từ Mockito.
- Không chạy Maven test toàn bộ: các test TrainingCalendarFixDatabaseTest/TrainingRoadmapDatabaseTest có truy cập database.
- Fixture Complete trong TrainingCalendarFixDatabaseTest (ba đường gọi) và TrainingRoadmapDatabaseTest (một đường gọi) chưa gửi assessment. **NOT RUN**; cần cập nhật fixture trước giai đoạn DB, không nới validator.
- Frontend cũ chưa truyền assessment; sau khi triển khai DB/backend, Complete cũ thiếu checklist sẽ bị 400 đúng contract. Cần triển khai frontend trước khi demo tính năng end-to-end.
- Swagger đã có mô tả contract nhưng chưa mở server để thử HTTP thật. Khi DB được phê duyệt, có thể Authorize Bearer token ở Swagger; tạo buổi, Start, Stop, Complete theo contract rồi GET detail/chuông/Medical/Start. Không thực hiện chuỗi này trong đợt backend hiện tại.
