# Ôn vấn đáp trong 60 phút: Permission và Training

Phạm vi cá nhân đã xác nhận: **BE Permission; BE Training gồm xếp/đăng ký lịch và trả chỉ số sau tập**. FE là phần cần hiểu để giải thích luồng, không tự nhận đã làm FE. Bản source đối chiếu: RaceForge-PreMain3. Không phải mọi file trong module training đều thuộc phần đóng góp của bạn.

## 1. Phân bổ đúng một tiếng

| Thời gian | Việc phải làm | Kết quả cần tự nói được |
|---|---|---|
| 0–5 phút | Đọc mục 2–3 | Phân biệt UI/API/controller/service/repository/entity/DB |
| 5–20 phút | Mở PermissionController → PermissionService → RolePermissionRepository → entity | Kể được luồng cấp/thu hồi quyền, điều kiện và bảng ghi |
| 20–40 phút | Mở TrainingPlanService → TrainingSessionService → TrainingScheduleService | Kể được tạo kế hoạch, xếp lịch, bắt đầu và hoàn tất |
| 40–50 phút | Đọc mục annotation và quan hệ DB | Giải thích được @Transactional, @PreAuthorize, JpaRepository, khóa ghép |
| 50–60 phút | Tự trả lời sáu câu, chạy tay hai ví dụ và đặt breakpoint | Không chỉ thuộc lòng: chỉ ra đúng method và biến quyết định |

Nếu chưa hiểu thuật ngữ, đọc ví dụ ngay sau đó. Mục tiêu của một tiếng là hiểu hai luồng cụ thể; không thể cam kết học toàn bộ Java/Spring nâng cao trong một tiếng.

## 2. Câu 1 — Em đóng góp gì?

Nói đúng phạm vi đã làm, không kể toàn bộ hệ thống:

> Em phụ trách backend phân quyền và một phần huấn luyện. Phân quyền gồm kiểm tra quyền theo role, cấp/thu hồi quyền và lịch sử thay đổi. Training gồm tạo kế hoạch gắn với ngựa, xếp lịch đơn/lặp, bắt đầu buổi tập và ghi nhận, trả kết quả sau tập. Em có thể chỉ ra controller, service, repository và bảng dữ liệu tương ứng. Em hiểu phía frontend gọi API như thế nào, nhưng phần đóng góp cá nhân của em là BE.

Chỉ nhận những mục thực tế bạn đã phụ trách; nếu tạo kế hoạch hoặc điểm danh là phần người khác thì nói rõ. Không nhận toàn bộ quản lý gói, thanh toán, medical hoặc Google OAuth là của mình.

## 3. Một luồng từ UI đến DB

```text
Người dùng bấm nút trên UI
→ handler JavaScript gọi service FE
→ fetch gửi HTTP: method + URL + token + JSON
→ JWT filter xác thực và dựng Authentication
→ @PreAuthorize kiểm tra role/quyền
→ Controller nhận tham số và DTO
→ @Valid kiểm tra dữ liệu đầu vào
→ Service kiểm tra if/else nghiệp vụ, đọc/ghi repository
→ Spring Data JPA thực thi repository
→ Hibernate ánh xạ entity và gửi SQL qua JDBC
→ SQL Server kiểm tra PK/FK/CHECK/UNIQUE, thực hiện transaction
→ Mapper chuyển entity thành response DTO
→ Controller trả JSON
→ FE cập nhật state/tải lại dữ liệu để render
```

Vai trò từng lớp:

| Lớp | Hiểu đơn giản | Ví dụ |
|---|---|---|
| UI | Form/nút/danh sách người dùng nhìn thấy | LivePermissions.jsx, LiveTraining.jsx |
| API | Hợp đồng giao tiếp: method, URL, input/output | POST /api/training-sessions |
| Controller | Nhận request, chuyển dữ liệu vào service, trả response | TrainingSessionController |
| DTO | Dữ liệu gửi/nhận, không phải bảng DB | ScheduleSessionRequest |
| Service | Nghiệp vụ: điều kiện, trạng thái, transaction | TrainingSessionService |
| Repository | Giao diện đọc/ghi entity | TrainingSessionRepository |
| Entity | Java object ánh xạ tới bảng/cột | TrainingSession → Training_Session |
| Mapper | Chuyển entity sang DTO hoặc ngược lại | TrainingSessionMapper |
| DB | Lưu dữ liệu bền vững, giữ ràng buộc | SQL Server RaceForge |

API không phải database. Repository không phải controller. Hibernate không phải SQL Server. Dữ liệu trong React state chưa chứng minh đã lưu DB.

## 4. Permission — chạy tay một yêu cầu cấp quyền

### File cần mở

Tất cả đường dẫn Java bên dưới bắt đầu tại `backend/src/main/java/com/raceforge/backend/`.

- `permission/controller/PermissionController.java`
- `permission/service/PermissionService.java`
- `permission/service/PermissionAccess.java`
- `permission/repository/RoleRepository.java`
- `permission/repository/PermissionRepository.java`
- `permission/repository/RolePermissionRepository.java`
- `permission/entity/RolePermission.java`, `RolePermissionId.java`
- `permission/entity/PermissionAuditLog.java`
- `security/SecurityConfig.java`, `JwtAuthenticationFilter.java`

Frontend: `frontend/src/pages/live/LivePermissions.jsx` → `services/staffService.ts` / `permissionService.ts` → `services/api.ts`.

### Phân biệt role và permission

- Role: vai trò của user, ví dụ HEAD_TRAINER.
- Permission: quyền làm việc gì, ví dụ MANAGE_TRAINING.
- `[User].role_id` gán role cho user.
- `Role_Permission` gán quyền cho role.
- Cấp quyền cho role không đổi role của user.

### API cấp quyền

```http
POST /api/admin/permissions/grant
Authorization: Bearer <access-token>
Content-Type: application/json

{"roleName":"HEAD_TRAINER","permissionCode":"VIEW_TRAINING"}
```

1. UI gọi `staffService.grant(role, code)`.
2. `api.ts` thêm Bearer token và gửi request.
3. `PermissionController` yêu cầu **CLUB_MANAGER và MANAGE_PERMISSION**.
4. `grant()` controller nhận `GrantPermissionRequest`; actorId lấy từ `AuthenticatedUser.userId()`.
5. `PermissionService.grant()` trim/viết hoa tên role và quyền.
6. `findByRoleNameForUpdate()` tìm và khóa role; không có → lỗi không tìm thấy.
7. `findByPermissionName()` tìm permission; không có → lỗi không tìm thấy.
8. Nếu cấp MANAGE_PERMISSION cho role khác CLUB_MANAGER → lỗi nghiệp vụ.
9. Tạo `RolePermissionId(roleId, permissionId)`.
10. Nếu `existsById(id)` đã có → trả về, không chèn trùng, không thêm audit.
11. `rolePermissionRepository.save(rp)` lưu liên kết.
12. `writeAuditLog("GRANT",...)` lưu Audit_Log.
13. Transaction thành công → commit; trả thông báo Permission granted.
14. UI tải lại quyền và audit để hiển thị kết quả từ backend.

**Đọc:** Role, Permission, Role_Permission. **Ghi:** Role_Permission, Audit_Log. Không cập nhật `[User].role_id`.

### API còn lại

| API | Method service | Ý nghĩa |
|---|---|---|
| GET `/api/admin/permissions/{roleName}` | getPermissionsForRole | Lấy quyền role hiện có |
| GET `/api/admin/permissions/catalog` | Controller đọc permissionRepository | Danh mục quyền có trong DB |
| GET `/api/admin/permissions/{roleName}/audit-log` | getAuditLog | Lịch sử mới nhất trước |
| DELETE `/api/admin/permissions/revoke?roleName=...&permissionCode=...` | revoke | Xóa liên kết quyền khỏi role |

`revoke()` không cho thu hồi MANAGE_PERMISSION của CLUB_MANAGER. Không có liên kết thì không xóa và không ghi thêm audit. Xóa liên kết không xóa dòng Permission.

### Câu hỏi dễ bị đánh trượt

**Tại sao cấp MANAGE_TRAINING cho bác sĩ vẫn chưa sửa training được?**

Vì controller sửa training yêu cầu đồng thời HEAD_TRAINER **và** MANAGE_TRAINING. Có permission chưa đủ để vượt điều kiện role.

**Đổi permission có cần đăng nhập lại không?**

`PermissionAccess.has()` đọc permission hiện tại từ DB ở request tiếp theo. Không cần cấp lại JWT chỉ để cập nhật liên kết permission. Đừng áp dụng kết luận này tùy tiện cho mọi thay đổi user/role/cache.

**Ai quyết định performedBy?**

Controller lấy tài khoản đã xác thực. Không tin ID client tự gửi. DTO có trường legacy không có nghĩa client được giả danh người thao tác.

## 5. Training — kế hoạch, buổi tập và kết quả

### Các file cần mở

- `training/controller/TrainingPlanController.java`
- `training/controller/TrainingSessionController.java`
- `training/controller/TrainingScheduleController.java`
- `training/service/TrainingPlanService.java`
- `training/service/TrainingSessionService.java`
- `training/service/TrainingScheduleService.java`
- `training/service/TrainingPlanHorseResolver.java`
- `training/service/TrainingSessionRules.java`
- `training/repository/TrainingSessionRepository.java`
- `training/entity/TrainingPlan.java`, `HorsePlan.java`, `HorsePlanId.java`, `TrainingSession.java`
- `training/mapper/TrainingSessionMapper.java`

Frontend đang dùng: `LiveTraining.jsx`, `planService.ts`, `trainingService.ts`, `sessionService.ts`, `api.ts`. Tên UI có thể thay đổi khi bổ sung lịch, nhưng API và service BE trong tài liệu này giữ nguyên.

### A. Tạo kế hoạch

```http
POST /api/horses/10/training-plans

{"planName":"Tăng sức bền","goal":"Cải thiện thể lực","duration":14,"startDate":"2026-10-14","endDate":"2026-10-27"}
```

Các ID/ngày là ví dụ, phải thay theo dữ liệu thực tế.

`TrainingPlanController.create()` → `TrainingPlanService.createPlan(horseId, request, actorId)`:

1. Yêu cầu HEAD_TRAINER + MANAGE_TRAINING.
2. Kiểm tra endDate không trước startDate.
3. Tìm ngựa trong Horse.
4. Tạo TrainingPlan: createdBy là actorId, status ACTIVE; `trainingPlanRepository.save(plan)`.
5. Tạo HorsePlan với khóa ghép `(planId,horseId)`, ngày áp dụng và status ACTIVE; `horsePlanRepository.save(horsePlan)`.
6. Trả response qua mapper. Hai dòng ghi trong cùng transaction.

**Kế hoạch chưa phải lịch:** method này không tự sinh buổi tập.

### B. Xếp một buổi

```http
POST /api/training-sessions

{"planId":20,"horseId":10,"scheduledTime":"2026-10-15T07:00:00"}
```

`TrainingSessionService.scheduleSession()`:

1. `trainingPlanRepository.findById(planId)` đọc Training_Plan.
2. `horseResolver.resolve(planId,horseId)` kiểm tra Horse_Plan.
3. `rules.lockHorse(horseId)` khóa dòng Horse khi xử lý.
4. `rules.requireUnlocked(horse)` chặn ngựa training_locked.
5. `horseResolver.validateSchedule(...)`: plan và link ACTIVE, ngày nằm trong khoảng áp dụng nếu có.
6. `existsByHorse_HorseIdAndScheduledStart(...)`: cùng ngựa cùng giờ bắt đầu → lỗi.
7. Tạo TrainingSession, mặc định SCHEDULED, gắn plan/ngựa/giờ.
8. `trainingSessionRepository.save(session)` → Training_Session.
9. Mapper trả DTO; FE tải lại lịch.

Không gửi horseId được khi plan chỉ có đúng một ngựa. Nếu có nhiều ngựa phải chỉ rõ horseId. Code kiểm tra cùng thời điểm bắt đầu, **chưa kiểm tra mọi khoảng thời gian chồng lấn**.

### C. Xếp lịch lặp — giải thuật phải chạy tay được

```http
POST /api/training-sessions/recurring

{"planId":20,"horseId":10,"activityName":"Tập sức bền","startDate":"2026-10-14","daysOfWeek":["WEDNESDAY","FRIDAY"],"durationWeeks":2,"sessionTime":"07:00:00"}
```

Ngày ví dụ 14/10/2026 là thứ Tư. `createRecurringSchedule()` sinh:

```text
WEDNESDAY: nextOrSame → 14/10; cộng 1 tuần → 21/10
FRIDAY: nextOrSame → 16/10; cộng 1 tuần → 23/10
Sắp xếp → 14/10, 16/10, 21/10, 23/10, cùng 07:00
```

Sau đó kiểm tra từng ngày và trùng lịch rồi `saveAll()`. Nếu có lỗi trong cả lô, transaction rollback; không lưu dở vài buổi.

- Bỏ durationWeeks: mặc định 1; gửi thì 1–52.
- Bỏ sessionTime: 07:00.
- Không chọn daysOfWeek: dùng startDate, lặp mỗi tuần.
- N = số thứ × số tuần. Sinh O(N), sắp xếp O(N log N), thêm N lần kiểm tra lịch với DB. Thời gian tổng còn phụ thuộc truy vấn/khóa DB, không chỉ vòng lặp Java.
- Đây là sinh lịch theo quy tắc, không phải AI/tối ưu lịch tự động.

### D. Xem lịch và kết quả

```http
GET /api/training-sessions/horse/10
```

`PermissionAccess.canReadHorse()` yêu cầu VIEW_TRAINING. Owner chỉ xem ngựa của mình. `getScheduleByHorseId()` kiểm tra ngựa tồn tại, gọi `findByHorse_HorseIdOrderByScheduledStartAsc()`, mapper trả danh sách cùng các chỉ số sau tập.

Không có buổi có thể trả danh sách rỗng; không đồng nghĩa DB lỗi. FE lọc/vẽ lịch không tạo dữ liệu mới trong DB.

### E. Bắt đầu

```http
PATCH /api/training-sessions/30/start
```

`startSession()` khóa session và horse, kiểm tra không khóa tập và session SCHEDULED. Nếu actualStart chưa có, ghi thời gian hiện tại.

**Không nói code chuyển IN_PROGRESS:** hiện trạng thái vẫn SCHEDULED, actualStart cho biết đã bắt đầu. Gọi lại không ghi đè actualStart đã có.

### F. Hoàn tất và ghi chỉ số

```http
PATCH /api/training-sessions/30/complete

{"heartRate":100,"avgSpeed":25.5,"maxSpeed":32,"performanceNotes":"Hoàn thành bài tập"}
```

`completeSession()`:

1. Khóa session; không tồn tại → lỗi.
2. Khóa horse, kiểm tra không training_locked.
3. Chỉ cho buổi còn SCHEDULED.
4. Phải có actualStart.
5. heartRate bắt buộc > 0; avgSpeed bắt buộc hữu hạn và >= 0.
6. maxSpeed có thể bỏ; nếu có phải hữu hạn, >= avgSpeed.
7. actualEnd lấy từ backend, phải sau actualStart.
8. Ghi status COMPLETED, evaluation, heartRate, avgSpeed, maxSpeed, recordedBy.
9. Save → mapper → response.

| Input/nguồn | Cột Training_Session |
|---|---|
| heartRate | heart_rate, bpm |
| avgSpeed | avg_speed, km/h |
| maxSpeed | max_speed, km/h |
| performanceNotes | evaluation |
| User đã đăng nhập | recorded_by |
| Đồng hồ backend | actual_end |
| Nghiệp vụ hoàn tất | status = COMPLETED |

Hiện code **nhận và lưu** vận tốc/nhịp tim; không tự đo từ thiết bị hoặc tự tính vận tốc từ distance/time. Chưa có huyết áp.

### G. Điểm danh

`PUT /api/training-sessions/{sessionId}/attendance`:

- status COMPLETED: gọi lại `completeSession()`, cùng điều kiện và chỉ số.
- status MISSED: cần lý do, trừ trường hợp ngựa khóa tập có thể tự dùng TRAINING_LOCK. Các mã lý do có HEALTH_ISSUE, INJURY, BAD_WEATHER, OTHER, TRAINING_LOCK.
- MISSED ghi trạng thái/ghi chú/người ghi nhận; code xóa actualStart/actualEnd.
- Không complete xong rồi gọi attendance COMPLETED lần nữa: buổi đã đóng.
- Chưa có ngưỡng cảnh báo hiệu suất; warningTriggered hiện false, không tự bịa ngưỡng.

## 6. Câu 5 — Quan hệ DB và ID

```text
User N—1 Role
Role N—N Permission qua Role_Permission

User 1—N Training_Plan qua created_by
Horse N—N Training_Plan qua Horse_Plan
Horse_Plan(plan_id,horse_id) 1—N Training_Session
```

- Role_Permission có PK ghép `(role_id,permission_id)` để không cấp trùng cùng quyền cho cùng role.
- Horse_Plan có PK ghép `(plan_id,horse_id)` để một ngựa chỉ liên kết một lần với cùng kế hoạch.
- FK ghép của Training_Session bảo đảm cặp kế hoạch/ngựa thuộc Horse_Plan. Hai FK riêng chỉ bảo đảm ngựa và plan tồn tại, chưa bảo đảm chúng liên kết với nhau.
- ID đơn của Role/Permission/Training_Plan/Training_Session là Java Integer và SQL INT IDENTITY theo schema hiện tại. ID ghép/FK không tự tăng riêng.
- IDENTITY là DB sinh số khi chèn; Integer không tự có nghĩa auto increment.
- FK đúng cấu trúc không thay thế rule quyền sở hữu, khóa tập hoặc kiểm tra ngày ở service.

SQL chỉ đọc để chứng minh (chọn DB RaceForge):

```sql
SELECT r.role_name, p.permission_name
FROM dbo.Role_Permission rp
JOIN dbo.Role r ON r.role_id=rp.role_id
JOIN dbo.Permission p ON p.permission_id=rp.permission_id;

SELECT plan_id, horse_id, start_date, end_date, status
FROM dbo.Horse_Plan;

SELECT session_id, plan_id, horse_id, scheduled_start, status,
       actual_start, actual_end, heart_rate, avg_speed, max_speed, recorded_by
FROM dbo.Training_Session
ORDER BY scheduled_start;
```

Khi bị hỏi đúng/sai: nêu phần bảo đảm được và giới hạn. Không nói toàn bộ thiết kế đúng chỉ vì API trả 200. Ví dụ khóa ghép đúng nhưng rule chồng lấn khoảng thời gian còn thiếu; package đăng ký và schedule là hai luồng khác nhau, code xếp lịch đã đọc không trực tiếp kiểm tra gói đã thanh toán.

## 7. Spring Data JPA — giải thích ngay từ code

```java
public interface TrainingSessionRepository
    extends JpaRepository<TrainingSession, Integer>
```

Bạn khai báo interface; Spring Data tạo implementation/proxy lúc chạy. `TrainingSession` là kiểu entity, `Integer` là kiểu khóa chính. Các method save/findById/existsById/deleteById có sẵn.

```java
boolean existsByHorse_HorseIdAndScheduledStart(
    Integer horseId, LocalDateTime scheduledStart);
```

Đây là derived query: Spring Data phân tích tên method. `Horse_HorseId` đi qua quan hệ session.horse.horseId; `AndScheduledStart` thêm điều kiện; `exists` trả boolean. Không phải bạn đã viết thủ công thuật toán tìm tuyến tính trong Java.

```java
@Query("select r from PermissionRole r where r.roleName = :name")
```

Đây là JPQL: tên entity/property Java, không phải tên bảng/cột SQL. PermissionRole là tên entity dùng để phân biệt với Role của module account. Hibernate chuyển JPQL thành SQL phù hợp DB.

`save()` chọn persist hoặc merge theo nhận diện entity mới; không phải mọi save đều là INSERT. Save có thể gửi SQL trước, nhưng **chưa đồng nghĩa transaction đã commit**.

## 8. Các annotation phải hiểu

| Annotation | Ý nghĩa cần nói |
|---|---|
| @RestController | Bean nhận HTTP, trả dữ liệu response body |
| @RequestMapping | Đường dẫn chung của controller |
| @PostMapping/@GetMapping/... | Ghép HTTP method với đường dẫn |
| @RequestBody | JSON → DTO Java |
| @PathVariable | Lấy giá trị trong URL, ví dụ sessionId |
| @RequestParam | Lấy query parameter, ví dụ roleName khi revoke |
| @Valid | Kích hoạt Bean Validation cho DTO |
| @NotNull/@NotBlank/@Positive/@Size | Kiểm tra null, chuỗi trắng, số dương, độ dài |
| @AuthenticationPrincipal | Lấy principal của request đã xác thực |
| @PreAuthorize | Kiểm tra biểu thức quyền trước khi chạy method |
| @EnableMethodSecurity | Bật kiểm tra bảo mật method |
| @Service | Đánh dấu bean chứa nghiệp vụ |
| @Component/@Repository | Bean dùng chung / lớp truy cập dữ liệu |
| @Autowired | Spring tiêm dependency đã quản lý |
| @Transactional | Ranh giới transaction; commit thành công, mặc định rollback RuntimeException/Error |
| @Transactional(readOnly=true) | Ý định chỉ đọc và tối ưu; không phải cơ chế phân quyền DB |
| @Entity/@Table/@Column | Ánh xạ class/bảng/field/cột |
| @Id | Khóa chính |
| @GeneratedValue(IDENTITY) | DB sinh ID bằng identity |
| @EmbeddedId/@Embeddable | Khóa chính ghép trong class riêng |
| @MapsId | Quan hệ dùng chung thành phần ID ghép |
| @ManyToOne/@JoinColumn | Quan hệ nhiều-một và cột FK |
| @Lock(PESSIMISTIC_WRITE) | Yêu cầu khóa DB khi lấy dữ liệu để cập nhật |
| @Query/@Param | Khai báo truy vấn và bind tham số |

**Dependency injection:** controller nhận service do Spring tạo, service nhận repository. Không new tùy tiện các bean rồi mong @Transactional/@PreAuthorize vẫn được áp dụng qua proxy.

**OOP gắn với dự án:** class là bản thiết kế, object là instance; private + getter/setter đóng gói; repository interface trừu tượng hóa truy cập DB; AttendSessionRequest kế thừa CompleteSessionRequest để dùng chung các chỉ số. Không cần bịa đủ bốn tính chất OOP vào mọi đoạn code.

## 9. Câu 3 — Giải thuật và xử lý đồng thời

Ba nội dung nói được:

1. **Sinh lịch lặp:** chạy tay ví dụ ở mục 5C; giải thích nextOrSame, plusWeeks, sort, kiểm tra từng slot.
2. **Chặn trùng:** service exists query + khóa dòng ngựa + unique index `(horse_id, scheduled_start)` trong schema. Kiểm tra if đơn lẻ không đủ nếu hai request cùng lúc đều thấy chưa có. Đừng tự nói có unique index trên máy nếu chưa kiểm tra schema thực tế.
3. **Trạng thái:** buổi còn SCHEDULED mới sửa; start ghi actualStart; complete cần start và chuyển COMPLETED; MISSED đóng buổi. Đây là kiểm tra chuyển trạng thái theo rule, không phải AI.

Khóa bi quan bảo vệ đoạn transaction với các request cạnh tranh tuân thủ cùng cách khóa. Nó không bảo đảm toàn hệ thống hết deadlock hoặc giải quyết mọi đường cập nhật SQL ngoài ứng dụng.

## 10. Câu 4 — Nếu giáo viên cho yêu cầu mới

Ví dụ: “Không cho xếp lịch Chủ nhật”.

1. Hỏi: áp dụng cho lịch đơn và lịch lặp? Có loại phục hồi ngoại lệ không? Xử lý lịch cũ thế nào?
2. Tìm điểm dùng chung `TrainingPlanHorseResolver.validateSchedule()` vì cả hai luồng đang gọi.
3. Thêm điều kiện ngày Chủ nhật và throw BusinessRuleException tại đó, nếu rule thống nhất.
4. FE hướng dẫn chọn ngày, nhưng BE vẫn kiểm tra vì có thể gọi API trực tiếp.
5. Thử lịch đơn Chủ nhật bị chặn, thứ khác được phép; lịch lặp chứa Chủ nhật phải rollback cả lô theo rule hiện tại.
6. SQL xác nhận không có dòng mới khi lỗi. Nêu có/không cần đổi DB: rule này thường không cần thêm cột.

Ví dụ khác: “Thêm huyết áp sau tập”.

Không thêm một field vào UI rồi tuyên bố xong. Cần hỏi chỉ số nào/đơn vị/bắt buộc/miền hợp lệ, sau đó DTO → validation → service → entity/migration → mapper → response → FE → test. Đây là ví dụ vấn đáp, không phải yêu cầu đã được cho phép sửa backend/DB hiện tại.

## 11. Câu 6 — Debug thực tế

### Chuỗi kiểm tra

```text
Tái hiện chính xác
→ DevTools Network: method/URL/body/status/response
→ Controller có được gọi không?
→ Service đang dừng tại if nào?
→ Repository trả gì?
→ SQL có dữ liệu/ràng buộc nào?
→ sửa đúng nguyên nhân
→ thử lại case lỗi + case bình thường
```

| Dấu hiệu | Kiểm tra đầu tiên |
|---|---|
| Failed to fetch | Backend đang nghe cổng chưa, base URL, CORS, network; chưa kết luận lỗi DB |
| 401 | Token thiếu/hết hạn, filter, principal; lưu ý controller lấy nhầm ID cũng có thể trả 401 |
| 403 | User hoạt động chưa, role và permission có đúng, owner có đúng ngựa |
| 400 | Payload, JSON, trường bắt buộc, DTO validation |
| 404 | ID thực sự tồn tại không, ngựa có thuộc plan không |
| 409/lỗi nghiệp vụ | Trùng giờ, khóa tập, trạng thái, chưa start, quan hệ số đo |
| 500/503 | Đọc errorId/log: mapping/schema/query/kết nối; không đoán từ status một mình |
| 200/201 nhưng UI sai | Xem response, state/mapper FE, request tiếp theo; chứng minh DB trước khi tạo lại |

### Breakpoint có thể đặt ngay

- PermissionController.grant: roleName, permissionCode, user.userId().
- PermissionService.grant: role, permission, id, existsById.
- TrainingSessionService.scheduleSession: plan, horse, scheduledTime, kiểm tra trùng.
- TrainingPlanHorseResolver.validateSchedule: link.status, startDate, endDate.
- TrainingSessionService.completeSession: actualStart, status, heartRate, avgSpeed, maxSpeed.
- Mapper: entity đã có chỉ số nhưng response có null không?

Case đã gặp trong dự án: tạo ngựa trả 201 nhưng medical request sau đó trả 401. Gốc lỗi là controller đọc authentication.getName() như ID số thay vì principal.userId(). Không được kết luận request tạo ngựa thất bại chỉ vì màn hình báo lỗi.

## 12. Tự vấn đáp trong 10 phút cuối

Tự nói, đồng thời chỉ file/method:

1. Cấp quyền cho role lưu bảng nào? Vì sao không đổi User.role_id?
2. Vì sao chỉ Manager được cấp quyền, dù role khác được cấp MANAGE_PERMISSION?
3. Khi grant đã có liên kết thì code làm gì? Audit có thêm không?
4. Xếp lịch đọc dữ liệu ngựa/plan ở đâu? Điều kiện nào chặn?
5. Khóa ghép Horse_Plan bảo đảm điều gì?
6. Sinh thứ Tư/thứ Sáu hai tuần ra ngày nào?
7. Gọi complete trước start thì dừng ở if nào?
8. start có đổi IN_PROGRESS không?
9. Vận tốc do BE tính hay FE gửi? Lưu cột nào, đơn vị gì?
10. Owner đọc lịch ngựa người khác bị chặn ở đâu?
11. Spring Data tạo query từ method name ra sao? JPQL khác SQL thế nào?
12. save có phải commit không? Nếu audit lỗi thì cấp quyền còn được lưu không?

Nếu trả lời bí: quay lại đúng method, chỉ input → if → repository → bảng → output. Đừng dùng từ “framework tự làm hết” để thay cho giải thích nghiệp vụ.
