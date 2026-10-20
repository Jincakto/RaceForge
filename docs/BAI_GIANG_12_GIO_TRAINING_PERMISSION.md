# Bài giảng 12 giờ: đọc nghiệp vụ và code RaceForge từ đầu

Đối tượng: sinh viên mới học lập trình ứng dụng. Trọng tâm: Training và Permission; các phần tài khoản, ngựa và y tế được giải thích ở mức cần để hiểu luồng này.

Tài liệu đối chiếu mã nguồn trong workspace ngày 20/10/2026. Đây là nội dung và bài thực hành cho 12 giờ học, không phải bản ghi một buổi giảng đã diễn ra. Không sửa mã nguồn ứng dụng. Kết luận dựa trên việc đọc code, chưa xác nhận bằng chạy hệ thống hay database.

## Đọc trước: bốn thay đổi so với phần giải thích cũ

1. `Horse` hiện có `Set<Trainer> trainers` với `@ManyToMany` qua `Horse_Trainer`; không còn lấy `User headTrainer` làm mô hình backend hiện hành.
2. Phân công trainer gắn với gói đã đăng ký và có bước `ASSIGNED → ACCEPTED/DECLINED`. Có quan hệ Horse–Trainer chưa đủ để thao tác mọi gói.
3. `PermissionController` yêu cầu `ADMIN` và `MANAGE_PERMISSION`. Quyền này được bảo vệ cho ADMIN, không phải CLUB_MANAGER như phiên bản đã giải thích trước.
4. Backend hoàn tất buổi tập theo chuỗi bắt đầu → dừng vận động → ghi chỉ số hồi phục. Có kiểm tra phân công, sức khỏe, thời gian, chồng lịch và tối đa sáu ngày tập mỗi tuần.

Frontend hiện tại cũng khác: entry là `frontend/src/main.tsx`, dùng `App.tsx`, `trainingPlans.tsx`, `trainingLogic.ts`, `admin.tsx`. Các callback Training/Permission đã kiểm tra cập nhật React state; không có request API trong các luồng này. Các API Java ở tài liệu là hợp đồng backend hiện có, không phải khẳng định nút frontend đã gọi chúng.

## Lịch học

Mỗi giờ: 10 phút ôn và đặt tình huống, 25 phút đọc code, 15 phút tự lần luồng, 10 phút trả lời câu hỏi và nghỉ ngắn.

| Giờ | Chủ đề | Sau giờ học phải làm được |
|---|---|---|
| 1 | Nghiệp vụ và kiến trúc | Phân biệt quy tắc thực tế với thao tác kỹ thuật |
| 2 | User, Role, Permission và Horse | Đọc quan hệ và phân biệt các loại ID |
| 3 | Đăng ký, thanh toán gói | Giải thích sản phẩm khác lần mua như thế nào |
| 4 | Phân công trainer | Theo dõi giao việc, chấp nhận, từ chối, thay thế |
| 5 | Y tế và gợi ý lộ trình | Hiểu điều kiện được tập, protocol và recommendation |
| 6 | Tạo kế hoạch và các giai đoạn | Đọc plan, HorsePlan, stage và transaction |
| 7 | Xếp lịch và điều chỉnh | Giải thích trùng lịch, sáu ngày/tuần, lịch lặp |
| 8 | Thực hiện một buổi tập | Bắt đầu, dừng, hồi phục, hoàn tất, bỏ buổi |
| 9 | Recovery và quay lại gói cũ | Phân biệt bảo lưu ngày, mở khóa, resume |
| 10 | Quản lý Permission | Hiểu bảng nối, cấp, thu hồi, audit |
| 11 | Frontend, API và lỗi | Chỉ ra đúng nút gọi hàm nào; phát hiện chưa tích hợp |
| 12 | Bảo vệ và thực hành tổng hợp | Tự giải thích một luồng từ người dùng đến database |

## Giờ 1 — Hãy hiểu trung tâm làm gì trước khi nhìn Java

### 1.1 Nghiệp vụ là quy tắc công việc

Hãy tưởng tượng có sáu người: Lan là chủ ngựa Thunder, Nam là trainer, Huy là quản lý trung tâm, Mai là thú y, An là admin, và một nhân viên chăm sóc. Phần mềm ghi nhận và kiểm soát công việc của họ.

Một vòng làm việc điển hình:

```text
Owner tạo hồ sơ ngựa → gửi vào trung tâm → Manager duyệt
→ thú y khám và xác nhận → Owner đăng ký/thanh toán gói
→ Manager giao trainer → trainer chấp nhận
→ trainer lập lộ trình → xếp các buổi → thực hiện và ghi kết quả
→ nếu có vấn đề sức khỏe: khám, khóa, phục hồi và xem xét quay lại
```

Đây là cách tổ chức luồng để học. Từng API chỉ thực thi các điều kiện có trong hàm của nó; đừng giả định tất cả điều kiện của toàn hệ thống xuất hiện ở mọi API.

Quy tắc: “Ngựa đang khóa tập không được bắt đầu vận động.” Code thực thi quy tắc là `TrainingSessionRules.requireUnlocked()`. Câu SQL tìm một ngựa theo ID là thao tác kỹ thuật phục vụ quy tắc.

### 1.2 Các tầng là những người làm những việc khác nhau

| Tầng | Ví dụ ở trung tâm | Ví dụ code |
|---|---|---|
| UI | Tờ phiếu người dùng điền | `trainingPlans.tsx` |
| Request DTO | Mẫu dữ liệu được phép gửi | `ScheduleSessionRequest` |
| Controller | Quầy nhận yêu cầu | `TrainingSessionController` |
| Service | Nhân viên kiểm tra và xử lý nghiệp vụ | `TrainingSessionService` |
| Guard/Rules | Bộ kiểm tra điều kiện dùng chung | `TrainingWorkflowGuard` |
| Repository/JdbcTemplate | Người tra và ghi sổ | `TrainingSessionRepository`, câu SQL |
| Entity | Cấu trúc thông tin một bản ghi | `TrainingSession` |
| Mapper/Response | Phiếu kết quả trả cho người gọi | `TrainingSessionMapper` |

Luồng backend:

```text
HTTP request → kiểm tra xác thực/quyền → controller → service
→ kiểm tra điều kiện → repository/SQL → database → response
```

HTTP là cách client gửi yêu cầu qua mạng. GET thường lấy dữ liệu; POST thường tạo/thực hiện hành động; PUT thay thế/cập nhật dữ liệu theo hợp đồng; PATCH cập nhật một phần; DELETE xóa tài nguyên hoặc liên kết theo hợp đồng cụ thể.

### 1.3 Một dòng Java đọc ra sao?

```java
TrainingSessionResponse response = trainingSessionService.startSession(sessionId);
```

- `TrainingSessionResponse`: kiểu kết quả.
- `response`: biến nhận kết quả.
- `trainingSessionService`: đối tượng cung cấp xử lý.
- `startSession`: tên hàm.
- `sessionId`: đầu vào xác định buổi nào.

`throw new BusinessRuleException(...)` nghĩa là từ chối nghiệp vụ và dừng đường xử lý bình thường. Muốn biết HTTP status cụ thể phải đọc exception handler, không đoán chỉ từ chữ “Exception”.

Tự kiểm tra: nút disabled có bảo vệ backend không? Đáp án: không. Một client khác có thể gửi HTTP trực tiếp. Backend phải tự kiểm tra.

Nguồn: [TrainingSessionController](../backend/src/main/java/com/raceforge/backend/training/controller/TrainingSessionController.java), [TrainingSessionService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingSessionService.java).

## Giờ 2 — Quan hệ: ai là ai, dữ liệu nối với nhau thế nào?

### 2.1 Khóa chính và khóa ngoại

Khóa chính là mã nhận diện một bản ghi. Khóa ngoại là mã tham chiếu bản ghi khác. Dự án hiện dùng String ID ở các phần đã đọc. Ví dụ `ROL-002` trong SQL là một ID; `HEAD_TRAINER` là tên role. Hai giá trị cùng nói về một vai trò nhưng không dùng thay cho nhau tùy tiện.

Quan hệ hiện hành:

| Cặp dữ liệu | Code chính | Ý nghĩa |
|---|---|---|
| User–Role | `User.role`, `@ManyToOne`, `role_id` | Nhiều người cùng một role |
| Horse–Owner | `Horse.owner`, `@ManyToOne`, `owner_id` | Một chủ có nhiều ngựa |
| Trainer–User | `Trainer.user`, `user_id` unique | Hồ sơ trainer gắn tài khoản người dùng |
| Horse–Trainer | `Horse.trainers`, `@ManyToMany` | Nhiều ngựa và nhiều trainer qua bảng nối |
| HorsePackage–Horse | `HorsePackage.horse` | Một ngựa có lịch sử nhiều lần đăng ký |
| HorsePackage–TrainingPackage | `HorsePackage.trainingPackage` | Nhiều lần đăng ký cùng một sản phẩm |
| HorsePlan | cặp planId–horseId | Kế hoạch áp dụng cho ngựa |
| TrainingSession | plan, horse, trainingStage | Buổi thuộc ngựa, kế hoạch và giai đoạn |
| RolePermission | cặp roleId–permissionId | Role có những quyền nào |

### 2.2 Đọc trực tiếp quan hệ Horse–Trainer

Trong `Horse.java`:

```java
@ManyToMany(fetch = FetchType.LAZY)
@JoinTable(
    name = "Horse_Trainer",
    joinColumns = @JoinColumn(name = "horse_id"),
    inverseJoinColumns = @JoinColumn(name = "trainer_id")
)
private Set<Trainer> trainers = new LinkedHashSet<>();
```

`ManyToMany`: nhiều–nhiều. `JoinTable`: lưu cặp khóa ở bảng nối. `Set`: tập hợp không chứa phần tử trùng theo quy tắc equality của đối tượng. `LAZY`: quan hệ được tải khi cần trong cơ chế ORM; không phải lời hứa rằng mọi truy vấn đều rẻ.

Ví dụ minh họa, không phải dữ liệu thật:

| horse_id | trainer_id |
|---|---|
| ngựa A | trainer Nam |
| ngựa A | trainer Bình |
| ngựa B | trainer Nam |

Đừng suy ra từ bảng này rằng Nam có quyền sửa mọi gói của A. Quyền tác nghiệp còn phụ thuộc phân công đã chấp nhận của đúng gói.

### 2.3 Role, quyền và trách nhiệm không giống nhau

Role cho biết người dùng đảm nhận công việc gì. Permission cho biết role đó được phép dùng chức năng nào. Assignment cho biết người này được giao đúng đối tượng/gói nào.

Ví dụ Nam có role trainer, có quyền Training, nhưng chỉ được giao gói A. Đổi ID trong URL sang gói B không được phép làm Nam tự có quyền với B.

Câu trả lời bảo vệ: “Quan hệ dữ liệu Horse–Trainer là nhiều–nhiều qua Horse_Trainer. Quyền thực hiện Training được kiểm tra thêm bằng assignment ACCEPTED của đúng HorsePackage trong TrainingWorkflowGuard.”

Nguồn: [Horse](../backend/src/main/java/com/raceforge/backend/horse/entity/Horse.java), [Trainer](../backend/src/main/java/com/raceforge/backend/horse/entity/Trainer.java), [User](../backend/src/main/java/com/raceforge/backend/account/entity/User.java), [TrainingWorkflowGuard](../backend/src/main/java/com/raceforge/backend/training/service/TrainingWorkflowGuard.java).

## Giờ 3 — Bán gói khác với tạo giáo án

### 3.1 Bốn vật phải phân biệt

- TrainingPackage: sản phẩm, ví dụ BASIC 14 ngày, giá X.
- HorsePackage: lần ngựa Thunder đăng ký sản phẩm đó, có thanh toán và ngày sử dụng.
- TrainingPlan: lộ trình cho gói/ngựa, do trainer tạo.
- TrainingSession: một buổi theo ngày giờ cụ thể.

Tạo một sản phẩm không tạo ra lần mua. Trả tiền không tự tạo đầy đủ buổi tập. Kế hoạch là thiết kế; buổi tập là sự kiện thực hiện.

### 3.2 Đăng ký gói thường ở backend

`HorsePackageService.register()` kiểm tra đúng owner, gói đang cung cấp, có khám INITIAL đã xác nhận, ngựa READY, không khóa tập, không có gói PENDING/ACTIVE/PAUSED xung đột. Recovery bị đưa sang luồng riêng.

Khi hợp lệ:

```java
registration.setStatus("PENDING");
registration.setPaymentStatus("PENDING");
```

Nghĩa là mới giữ một lần đăng ký chờ trả tiền. `status` là trạng thái sử dụng; `paymentStatus` là trạng thái thanh toán.

### 3.3 Thanh toán mô phỏng

`simulatePayment()` nhận lựa chọn thành công/thất bại. Thành công đặt ACTIVE/PAID; thất bại đặt CANCELLED/FAILED. Trước khi thành công, service kiểm tra lại điều kiện vì sức khỏe/gói có thể đã đổi sau khi đăng ký.

```java
registration.setStartDate(today);
registration.setEndDate(today.plusDays(days - 1L));
```

Tính cả ngày đầu: gói 14 ngày bắt đầu ngày 1 kết thúc ngày 14. Nếu dùng cộng 14 thì thành 15 ngày tính cả hai đầu.

| API backend | Controller → service |
|---|---|
| POST `/api/horse-packages/register` | HorsePackageController.register → HorsePackageService.register |
| POST `/api/horse-packages/{id}/simulate-payment` | HorsePackageController.simulatePayment → HorsePackageService.simulatePayment |
| GET `/api/horse-packages/horse/{horseId}` | HorsePackageController.history → HorsePackageService.history |

### 3.4 Quản lý sản phẩm

TrainingPackageController gọi TrainingPackageService để list/get/create/update/changeStatus. Ngừng cung cấp đặt INACTIVE, giữ dữ liệu và lịch sử. Đừng gọi đó là xóa cứng. Việc UI giới hạn Manager phải được phân biệt với annotation kiểm tra quyền thực tế trên API.

Bài tập: tại sao gói PAUSED/PAID hợp lý? Đáp án: đã trả tiền nhưng dừng sử dụng để bảo lưu. Vì vậy không gộp hai trường thành một.

Nguồn: [HorsePackageService](../backend/src/main/java/com/raceforge/backend/training/service/HorsePackageService.java), [TrainingPackageController](../backend/src/main/java/com/raceforge/backend/training/controller/TrainingPackageController.java), [TrainingPackageService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingPackageService.java).

## Giờ 4 — Phân công trainer là một quy trình có phản hồi

### 4.1 Trách nhiệm

ADMIN quản lý hồ sơ trainer theo các endpoint tương ứng. CLUB_MANAGER có ASSIGN_TRAINER giao gói cho trainer. Trainer có MANAGE_TRAINING nhận và phản hồi. Owner sở hữu ngựa không đồng nghĩa được tự vượt quy trình giao việc hiện hành.

Trong TrainingWorkflowController:

```java
private static final String MANAGER =
    "hasAuthority('CLUB_MANAGER') and @permissionAccess.has(authentication,'ASSIGN_TRAINER')";
```

### 4.2 Các bảng tham gia

`Trainer`: hồ sơ định danh trainer, nối User. `Trainer_Detail`: thông tin chuyên môn/trạng thái. `Horse_Assignment`: ai giao ai, ngựa nào, loại công việc, trạng thái. `Training_Assignment`: assignment gắn HorsePackage nào. `Horse_Trainer`: quan hệ ngựa–trainer đang được phản ánh.

### 4.3 Khi giao việc

`TrainerAssignmentService.assign()` kiểm tra gói hợp lệ và sức khỏe qua guard, trainer active/verified/đúng role, không có phân công mở trùng của trainer cho gói. Sau đó INSERT assignment với ASSIGNED và liên kết với gói.

```text
ASSIGNED → ACCEPTED
         → DECLINED
```

ASSIGNED là lời giao chưa được nhận, không phải quyền thao tác hoàn chỉnh.

### 4.4 Khi trainer trả lời

`respond()` so sánh actor với assignee_id; chỉ người được giao mới trả lời. Chỉ ASSIGNED được trả lời. Từ chối phải có lý do không rỗng. Khi nhận, kiểm tra lại gói/profile/account, thêm quan hệ Horse_Trainer nếu chưa có và đặt ACCEPTED.

Khi Manager kết thúc: CANCELLED. Khi thay thế: phân công cũ REASSIGNED, phân công mới ASSIGNED. Người thay thế vẫn phải chấp nhận. SQL chỉ xóa quan hệ Horse_Trainer khi không còn assignment ACCEPTED phù hợp; kết thúc một assignment không đồng nghĩa xóa mọi liên hệ của trainer với ngựa.

| API | Controller → service |
|---|---|
| POST `/api/trainer-assignments` | TrainingWorkflowController.assign → assignments.assign |
| GET `/api/trainer-assignments/me` | mine → assignments.mine |
| POST `/api/trainer-assignments/{id}/respond` | respond → assignments.respond |
| POST `/api/trainer-assignments/{id}/end` | end → assignments.end |
| POST `/api/trainer-assignments/{id}/replace` | replace → assignments.replace |

Bài tập: Nam ACCEPTED gói A của Thunder. Nam có được dùng kế hoạch gói B của Thunder không? Đáp án: phải có quyền trên đúng gói B; cùng horse không đủ.

Nguồn: [TrainerAssignmentService](../backend/src/main/java/com/raceforge/backend/training/service/TrainerAssignmentService.java), [TrainingWorkflowController](../backend/src/main/java/com/raceforge/backend/training/controller/TrainingWorkflowController.java).

## Giờ 5 — Y tế, protocol và gợi ý không thay thế quyết định của con người

### 5.1 Có quyền cũng chưa chắc được tập

TrainingWorkflowGuard.requireHealthy() yêu cầu ngựa admitted APPROVED, status ACTIVE, health READY, không cờ khóa, không bản ghi khóa đang mở. Sau đó đọc khám CONFIRMED mới nhất, yêu cầu training_eligible và kết luận FIT hoặc FIT_WITH_MONITORING.

Đây là nhiều lớp bằng chứng. Một chữ READY không đủ để bỏ qua khóa đang mở hoặc kết luận khám không cho phép tập.

`paidPackage()` yêu cầu gói ACTIVE, PAID, có khoảng ngày hợp lệ, chưa qua ngày kết thúc và ngựa đủ sức khỏe. Ngày buổi/việc bắt đầu còn được kiểm tra riêng bằng requirePackageDate(). Đừng diễn giải tên paidPackage là chỉ kiểm tra tiền.

### 5.2 Protocol là gì?

Protocol là mẫu hoạt động được thú y soạn và duyệt. Nó có loại gói, khoảng cân nặng, các stage, nguồn và lý giải. Trạng thái: DRAFT → APPROVED; RETIRED khi ngừng sử dụng.

Khoảng cân nặng là `[minWeight, maxWeight)`: lấy cận dưới, không lấy cận trên. Ví dụ 400–500 gồm 400, không gồm 500. Khi duyệt, service ngăn hai khoảng APPROVED chồng nhau cho cùng loại gói để tránh nhiều kết quả mâu thuẫn.

### 5.3 Recommendation là gì?

Recommendation là gợi ý cụ thể cho gói/ngựa dựa trên dữ liệu đã lưu. `recommend()` yêu cầu đúng assignment, gói hợp lệ, có cân nặng đo được, đúng một protocol approved khớp cân nặng/loại gói. Nếu không tìm được thì báo lỗi, không tự bịa cường độ.

Service lưu snapshot: dữ liệu ngựa, khám, cân nặng, protocol, khoảng gói, stage và người tạo. Snapshot là ảnh chụp dữ liệu tại lúc đề xuất, giúp giải thích vì sao có gợi ý đó.

Trước khi dùng gợi ý tạo plan, `stagesForPlan()` kiểm tra chủ thể và độ mới. Khám mới, cân nặng đổi, ngày gói đổi, loại gói đổi, protocol nghỉ sử dụng hoặc phiên bản đổi có thể làm gợi ý cũ bị từ chối.

Trainer phải xác nhận gợi ý khi tạo plan bằng recommendationConfirmed. Đây là hỗ trợ quyết định theo rule/protocol; không có nghĩa hệ thống tự chẩn đoán hay tự tăng bài tập.

PackageRoadmapPolicy cung cấp mục tiêu/các pha của BASIC, RACING, PERFORMANCE, RECOVERY. Các pha là bố cục chương trình sản phẩm; code nói rõ không dùng chúng như tiêu chí tăng vận động y khoa.

| API | Hàm xử lý |
|---|---|
| POST `/api/training-protocols` | recommendations.createProtocol |
| POST `/api/training-protocols/{id}/approve` | recommendations.approveProtocol |
| POST `/api/training-protocols/{id}/retire` | recommendations.retireProtocol |
| GET `/api/horse-packages/{id}/training-context` | recommendations.context |
| POST `/api/horse-packages/{id}/training-recommendations` | recommendations.recommend |

Ví dụ cân nặng 480 nằm trong protocol 400–500. Lần khám mới có cân nặng 510 thì không nên tiếp tục dùng snapshot 480; service yêu cầu tạo gợi ý mới khi kiểm tra phát hiện thay đổi.

Nguồn: [TrainingWorkflowGuard](../backend/src/main/java/com/raceforge/backend/training/service/TrainingWorkflowGuard.java), [TrainingRecommendationService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingRecommendationService.java), [PackageRoadmapPolicy](../backend/src/main/java/com/raceforge/backend/training/service/PackageRoadmapPolicy.java).

## Giờ 6 — Tạo plan, HorsePlan và các giai đoạn

### 6.1 Một lần lưu tạo nhiều dữ liệu

TrainingPlanService.createPlan() lấy ngựa, kiểm tra assignment qua guard, nhận stages thủ công hoặc từ recommendation đã xác nhận, kiểm tra stage và khoảng ngày. Ngày plan phải khớp kỳ của gói đã chọn nếu client gửi ngày.

Các dòng then chốt:

```java
var pack = workflowGuard.assignment(request.getAssignmentId(), horseId);
plan.setHorsePackageId(pack.getHorsePackageId());
plan.setTrainerAssignmentId(request.getAssignmentId());
plan.setCreatedBy(actorId);
```

Chúng nối plan với đúng gói, phân công và người tạo. `createdBy` là lịch sử tác giả, không phải bằng chứng duy nhất về người có quyền hiện tại. Quyền hiện tại được guard kiểm tra lại.

Sau khi lưu TrainingPlan, code tạo HorsePlan với cặp planId–horseId và ngày của gói, rồi gọi `roadmaps.replace(saved.getPlanId(), stages)`.

### 6.2 Stage là gì?

Stage là một giai đoạn: từ ngày thứ mấy đến ngày thứ mấy của gói; tập hoạt động gì, cường độ LOW/MODERATE/HIGH, các thứ trong tuần, giờ bắt đầu/kết thúc.

Ví dụ stage ngày 1–5 của gói bắt đầu ngày 20 là khoảng ngày 20–24. Đây là số thứ tự ngày trong gói, không phải ngày 1–5 hàng tháng.

`validateStages()` yêu cầu 1–100 stage, không chồng khoảng, không vượt số ngày gói, hoạt động hợp lệ, chọn 1–6 thứ, có giờ bắt đầu/kết thúc với giờ sau lớn hơn giờ trước. Code cho phép khoảng trống giữa stage; đừng nói mọi ngày đều bắt buộc có stage.

### 6.3 Tại sao cần transaction?

Nếu lưu plan thành công nhưng lưu stage thất bại mà không có giao dịch, có thể còn kế hoạch dở. `@Transactional` gom các thay đổi database trong đường xử lý này; lỗi làm giao dịch rollback theo cơ chế Spring áp dụng.

Không suy ra transaction tự rollback mọi email hay hiệu ứng bên ngoài. Đó là loại tác động khác.

### 6.4 Có sửa lộ trình được không?

TrainingRoadmapService.replace() cho thay stages, nhưng từ chối khi plan đã có TrainingSession. Lý do: đổi cấu trúc sau khi đã xếp buổi có thể làm buổi không còn đúng giai đoạn. Đây là endpoint sửa stages, không phải endpoint sửa mọi thuộc tính plan.

| API | Controller → service |
|---|---|
| GET `/api/horses/{horseId}/training-plans` | TrainingPlanController.list → getPlansForHorse |
| POST `/api/horses/{horseId}/training-plans` | TrainingPlanController.create → createPlan |
| GET `/api/training-plans/{id}/stages` | TrainingWorkflowController.stages → roadmaps.stages |
| PUT `/api/training-plans/{id}/stages` | TrainingWorkflowController.stages → roadmaps.replace |

Nguồn: [TrainingPlanService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingPlanService.java), [HorsePlan](../backend/src/main/java/com/raceforge/backend/training/entity/HorsePlan.java), [TrainingRoadmapService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingRoadmapService.java).

## Giờ 7 — Từ lộ trình thành lịch thật

### 7.1 Ba đường tạo buổi

| Đường | Hàm chính | Ý nghĩa |
|---|---|---|
| Một buổi | TrainingSessionService.scheduleSession | Gửi một ngày giờ |
| Lặp theo thứ | TrainingScheduleService.createRecurringSchedule | Duyệt ngày gói, chọn các thứ |
| Sinh từ stages | TrainingRoadmapService.generate | Duyệt từng stage và ngày phù hợp |

Cả ba cùng đi qua cơ chế liên kết stage khi tạo buổi. Buổi tập không được tự ghi một hoạt động bất kỳ để vượt lộ trình.

### 7.2 Các lớp kiểm tra

`TrainingPlanHorseResolver.validateSchedule()` gọi guard.requirePlan và guard.requirePackageDate, kiểm tra HorsePlan tồn tại, plan/link ACTIVE và đúng khoảng ngày.

`SessionStageBinder.bind()` xác định ngày thứ mấy của gói, yêu cầu đúng một stage, bổ sung giờ kết thúc từ stage nếu thiếu, kiểm tra khoảng giờ và gắn stage/intensity/notes.

```java
if (matches.size() != 1)
    throw new BusinessRuleException(...);
```

Ý nghĩa: ngày nghỉ không thuộc stage không được biến thành buổi qua việc gửi request trực tiếp.

### 7.3 Trùng lịch không chỉ là cùng giờ bắt đầu

TrainingCalendarRules.requireWindow() yêu cầu start/end cùng ngày và end > start. validateSlot() dùng điều kiện khoảng thời gian giao nhau. Ví dụ 07:00–08:00 xung đột 07:30–08:30; hai giờ bắt đầu khác nhau vẫn trùng.

Buổi lịch cũ thiếu scheduled_end được xử lý thận trọng trong truy vấn xung đột, cần xem xét thay vì đoán thời lượng. Kiểm tra tập trung trên cùng horse; không khẳng định đã kiểm tra toàn bộ tài nguyên trainer/sân bãi.

### 7.4 Sáu ngày/tuần nghĩa là sáu ngày khác nhau

`requireSixDayWeek()` nhóm theo tuần thứ Hai–Chủ nhật và đếm ngày khác nhau. `validateDates()` kết hợp lịch đề xuất với lịch SCHEDULED/COMPLETED hiện có.

Nếu ngựa đã có lịch thứ Hai–Bảy, thêm Chủ nhật bị chặn. Kiểm tra riêng danh sách mới sẽ bỏ sót tình huống này, nên code cộng cả dữ liệu cũ.

### 7.5 Sửa buổi

`adjustSession()` chỉ cho buổi chưa bắt đầu, còn SCHEDULED, ngày mới trong tương lai, có cường độ hợp lệ, đúng plan/package/stage, không chồng lịch, không vượt số ngày tập. Lưu audit trước/sau và lý do. Đây là chức năng có trong code mới.

| API | Controller → service |
|---|---|
| POST `/api/training-sessions` | TrainingSessionController.schedule → scheduleSession |
| POST `/api/training-sessions/recurring` | TrainingScheduleController.createRecurring → createRecurringSchedule |
| POST `/api/training-plans/{id}/generate-sessions` | TrainingWorkflowController.generate → roadmaps.generate |
| PATCH `/api/training-sessions/{id}/adjust` | TrainingSessionController.adjust → adjustSession |

Bài tập: trong batch 10 buổi, buổi 8 trùng lịch thì có lưu 7 buổi trước không? Với luồng transactional này, lỗi làm rollback, không tạo dở một phần.

Nguồn: [TrainingCalendarRules](../backend/src/main/java/com/raceforge/backend/training/service/TrainingCalendarRules.java), [SessionStageBinder](../backend/src/main/java/com/raceforge/backend/training/service/SessionStageBinder.java), [TrainingPlanHorseResolver](../backend/src/main/java/com/raceforge/backend/training/service/TrainingPlanHorseResolver.java).

## Giờ 8 — Một buổi thật: bắt đầu, dừng và ghi hồi phục

### 8.1 Bốn thời điểm không được gộp

| Giai đoạn backend | status | actualStart | actualEnd |
|---|---|---|---|
| Chưa vận động | SCHEDULED | null | null |
| Đang vận động | SCHEDULED | có | null |
| Đã dừng, chờ ghi kết quả | SCHEDULED | có | có |
| Đã ghi nhận hoàn tất | COMPLETED | có | có |
| Không thực hiện | MISSED | null | null |

Frontend có tên trạng thái riêng; bảng trên là backend TrainingSessionService hiện hành.

### 8.2 startSession

Kiểm tra plan/quyền phân công/gói/sức khỏe, không khóa tập, buổi còn mở, chưa bắt đầu, ngày hiện tại thuộc gói, không có buổi khác của ngựa đang dở. Chụp nhịp tim nghỉ gần nhất từ khám đã confirm nếu có; đó là số đo y tế có ngày giờ, không mặc nhiên là số đo ngay trước buổi này.

### 8.3 stopSession

Phải đã bắt đầu và chưa có actualEnd. Dừng ghi thời điểm kết thúc vận động; chưa chuyển COMPLETED. Nhờ tách riêng, thời gian chờ hồi phục không bị tính vào thời lượng vận động.

Code có nhánh ghi dừng lịch sử sau một khóa y tế đã được mở: yêu cầu stoppedAt và interruptionLockId phù hợp. Không tùy ý nhập một giờ quá khứ. Nhánh này bảo toàn thời điểm bị gián đoạn, tránh tính cả thời gian chờ mở khóa là thời gian chạy.

### 8.4 completeSession

Phải có actualStart và actualEnd. Dữ liệu: distance km không âm, tối đa hai số lẻ và trong DECIMAL(8,2); avgSpeed hữu hạn không âm; maxSpeed nếu nhập không thấp hơn avgSpeed; nhịp tim cuối vận động và hồi phục > 0; recoveryMeasuredAt ít nhất hai phút sau actualEnd, không tương lai.

```java
if (session.getActualEnd() == null)
    throw new BusinessRuleException("Stop the exercise before submitting recovery results.");
```

Ví dụ dừng 07:20, đo hồi phục 07:22: hợp lệ về thời điểm. Đo 07:21: chưa đủ hai phút. Đo 07:23 có thể được lưu với thời điểm thật; không coi là phép đo chuẩn đúng hai phút.

Không hướng dẫn sinh viên dùng những số đo này để tự chẩn đoán; ta đang học điều kiện dữ liệu của phần mềm.

### 8.5 Feedback

TrainingSessionFeedbackService trả requiresTrainerConfirmation=true và automaticScheduleChange=false. Khi có phép đo phù hợp, mô tả độ giảm nhịp tim và tìm tối đa năm buổi trước cùng gói, hoạt động, cường độ, cự ly, thời điểm đo hồi phục chuẩn. Không đủ dữ liệu thì nói thiếu, không gán giá trị bình thường giả định.

### 8.6 MISSED

TrainingScheduleService.submitAttendance() cho COMPLETED đi qua completeSession. MISSED chỉ dùng khi chưa bắt đầu. Code mới chặn chuyển buổi đã bắt đầu thành MISSED để tránh xóa dấu vết vận động thực tế. Có lý do TRAINING_LOCK/HEALTH_ISSUE/INJURY/BAD_WEATHER/OTHER.

| API | Hàm service |
|---|---|
| PATCH `/api/training-sessions/{id}/start` | startSession |
| PATCH `/api/training-sessions/{id}/stop` | stopSession |
| PATCH `/api/training-sessions/{id}/complete` | completeSession |
| PUT `/api/training-sessions/{id}/attendance` | submitAttendance |
| GET `/api/training-sessions/{id}/feedback` | feedback.feedback |

Bài tập: buổi đã chạy 5 phút có được ghi MISSED vì mưa không? Đáp án: backend mới yêu cầu dừng và ghi kết quả, không xóa hoạt động đã xảy ra.

Nguồn: [TrainingSessionService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingSessionService.java), [TrainingScheduleService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingScheduleService.java), [TrainingSessionFeedbackService](../backend/src/main/java/com/raceforge/backend/training/service/TrainingSessionFeedbackService.java).

## Giờ 9 — Recovery, khóa và bảo lưu là ba chuyện khác nhau

### 9.1 Tách các trạng thái

HealthStatus: sức khỏe. TrainingLock: có lệnh ngừng tập. HorsePackage.status: quyền sử dụng thời gian của gói. Một thao tác thay đổi một loại trạng thái không tự thay hết những loại khác.

Ví dụ ngựa READY nhưng còn TrainingLock thì chưa được bắt đầu. Mở khóa không tự đổi gói PAUSED thành ACTIVE.

### 9.2 Duyệt Recovery

RecoveryPackageService.approveRecovery() yêu cầu khóa đang hoạt động có nguồn từ khám đã confirm, gói RECOVERY đang cung cấp, không có transition xung đột. Nếu có gói thường ACTIVE, tính ngày chưa sử dụng gồm hôm nay, đặt PAUSED và lưu remainingDays. Tạo Recovery PENDING/PENDING và tham chiếu gói gốc.

Trong HorsePackage:

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "replaced_horse_package_id")
private HorsePackage replacedHorsePackage;
```

Quan hệ tự tham chiếu: một đăng ký Recovery biết đăng ký thường nào cần khôi phục sau này.

### 9.3 Thanh toán Recovery không phải cho phép tập bất chấp khóa

Recovery có thể được kích hoạt trong luồng phục hồi khi còn khóa. Nhưng guard của thao tác vận động vẫn yêu cầu đủ sức khỏe và mở khóa. Thanh toán là tình trạng thương mại; chỉ định tập là điều kiện chuyên môn. Không đánh đồng ACTIVE/PAID với được tự động vận động ngay.

Nếu thanh toán Recovery thất bại, Recovery CANCELLED/FAILED; nhánh này không tự phục hồi gói thường đã tạm dừng.

### 9.4 Resume

PackageResumptionService.resumeOriginalPackage() yêu cầu ngựa READY, đã mở khóa, Recovery ACTIVE/PAID, gói gốc đúng ngựa PAUSED/PAID không phải Recovery, còn ngày bảo lưu và không xung đột gói active. Manager nhập lý do.

```java
original.setStartDate(today);
original.setEndDate(today.plusDays(remaining - 1L));
original.setStatus("ACTIVE");
recovery.setStatus("COMPLETED");
```

Ví dụ còn bảy ngày, resume ngày 20 thì hết ngày 26. Nếu Recovery đầu tiên không có gói gốc, không có gì để resume. Đừng suy ra resume tự sinh lại buổi tập; phải xem riêng các hàm lịch.

| API | Controller → service |
|---|---|
| POST `/api/horse-packages/horse/{horseId}/approve-recovery` | RecoveryPackageController → approveRecovery |
| POST `/api/horse-packages/{id}/simulate-recovery-payment` | RecoveryPackageController → simulateRecoveryPayment |
| POST `/api/horse-packages/{recoveryId}/resume-original` | PackageResumptionController → resumeOriginalPackage |
| POST `/api/medical/horses/{horseId}/training-lock/unlock` | MedicalRecordController → TrainingLockService.unlockHorse |

Nguồn: [RecoveryPackageService](../backend/src/main/java/com/raceforge/backend/training/service/RecoveryPackageService.java), [PackageResumptionService](../backend/src/main/java/com/raceforge/backend/training/service/PackageResumptionService.java), [TrainingLockService](../backend/src/main/java/com/raceforge/backend/medical/service/TrainingLockService.java).

## Giờ 10 — Permission: cấp quyền cho role, kiểm tra trên từng request

### 10.1 Ba khái niệm

Authentication: bạn là ai. Authorization: bạn được làm gì. Business eligibility: đối tượng có đủ điều kiện thực hiện hành động không.

Nam đăng nhập thành công là authentication. Nam có MANAGE_TRAINING là một điều kiện authorization. Thunder đang khóa tập là business eligibility không đạt.

### 10.2 Quan hệ RolePermission

```java
@EmbeddedId
private RolePermissionId id;
@ManyToOne
@MapsId("roleId")
@JoinColumn(name = "role_id")
private Role role;
@ManyToOne
@MapsId("permissionId")
@JoinColumn(name = "permission_id")
private Permission permission;
```

Khóa kép: một cặp role–permission chỉ có một dòng. Role có nhiều quyền; một quyền cấp cho nhiều role.

### 10.3 Cấp và thu hồi

PermissionService.grant() chuẩn hóa tên, tìm role/quyền, khóa role để cập nhật, kiểm tra quy tắc bảo vệ, bỏ qua nếu cặp đã có, thêm RolePermission và audit GRANT. Không tạo một quyền mới từ tên tùy ý.

revoke() tìm cặp, bỏ qua nếu chưa có, xóa liên kết và audit REVOKE. Không xóa định nghĩa Permission, Role hoặc User.

Idempotent nghĩa là làm lại cùng yêu cầu không nhân bản kết quả: cấp lại quyền đã có không thêm dòng và không thêm audit thay đổi mới.

### 10.4 ADMIN mới là người quản lý quyền ở backend hiện tại

```java
@PreAuthorize("hasAuthority('ADMIN') and @permissionAccess.has(authentication, 'MANAGE_PERMISSION')")
```

MANAGE_PERMISSION chỉ cấp cho ADMIN và không được thu hồi khỏi ADMIN. Đây là quy tắc bảo vệ khả năng quản trị của hệ thống.

### 10.5 Kiểm tra động

PermissionAccess.has() kiểm tra authentication, principal AuthenticatedUser, tài khoản ACTIVE, role và `permissions.hasPermission(user.roleName(), code)`. Hàm sau tra tồn tại cặp RolePermission.

Thu hồi MANAGE_TRAINING của HEAD_TRAINER tác động mọi người thuộc role này ở request tiếp theo yêu cầu quyền. Không cần phát JWT mới chỉ để cập nhật cặp quyền này. Quyền role không tự gán assignment hoặc mở khóa ngựa.

Đọc lịch còn có PermissionAccess.canReadHorse(): cần VIEW_TRAINING; Manager được qua nhánh role; Owner phải sở hữu; Trainer phải qua phân công accepted và các liên kết/gói phù hợp trong SQL. Các role khác không mặc nhiên được qua hàm này.

| API backend | Controller → service |
|---|---|
| GET `/api/admin/permissions/catalog` | catalog → PermissionRepository.findAll trực tiếp |
| GET `/api/admin/permissions/{roleName}` | list → getPermissionsForRole |
| POST `/api/admin/permissions/grant` | grant → PermissionService.grant |
| DELETE `/api/admin/permissions/revoke?roleName=...&permissionCode=...` | revoke → PermissionService.revoke |
| GET `/api/admin/permissions/{roleName}/audit-log` | auditLog → getAuditLog |

Câu hỏi: cấp MANAGE_TRAINING cho Owner có làm Owner thành Trainer không? Không. Annotation còn yêu cầu role HEAD_TRAINER và service còn kiểm tra assignment.

Nguồn: [PermissionController](../backend/src/main/java/com/raceforge/backend/permission/controller/PermissionController.java), [PermissionService](../backend/src/main/java/com/raceforge/backend/permission/service/PermissionService.java), [PermissionAccess](../backend/src/main/java/com/raceforge/backend/permission/service/PermissionAccess.java), [RolePermission](../backend/src/main/java/com/raceforge/backend/permission/entity/RolePermission.java).

## Giờ 11 — Nút trên màn hình hiện tại thực sự chạy gì?

### 11.1 Không nối hai đường khi code chưa nối

Entry hiện tại `main.tsx → App.tsx`. App tạo `TH = makeTrainingHandlers(...)`. TrainingHubPage nhận callbacks từ TH và từ App. Các đường này dùng getState/setState, không gửi HTTP tới các controller vừa học.

Vì vậy sơ đồ thực tế đang có:

```text
Nút UI → callback → kiểm tra bằng TypeScript → setState → render lại

Client HTTP → API Java → Spring Security → service → database
```

Muốn khẳng định UI đã nối backend phải tìm được request HTTP, đối chiếu endpoint/DTO và quan sát Network. Tên nút và tên hàm gần giống nhau không phải bằng chứng tích hợp.

### 11.2 Bảng truy vết frontend hiện tại

| Nút/thao tác | Hàm hiện chạy | Kết quả |
|---|---|---|
| Đăng ký/mua gói | TH.purchasePackage trong trainingLogic.ts | Tạo enrollment trong state; hành vi không giống backend PENDING rồi payment riêng |
| Tạo/sửa danh mục gói | TH.savePackage | Kiểm tra rồi sửa state.packages |
| Bật/tắt gói | TH.togglePackage | Đổi active trong state |
| Phân công/thay trainer | TH.assignTrainer | Đổi trainer của enrollment, lịch sử và thông báo state |
| Chấp nhận/từ chối | TH.respondAssign | Đổi trainerStatus trong state |
| Lập lộ trình | TH.createPlan | Tạo plan trong state |
| Sinh buổi/xác nhận tạo | TH.generateSessions | Thêm các bản nháp đã kiểm tra vào state |
| Xóa dòng ở bản xem trước | setRows/filter trong SessionGenerator | Xóa bản nháp UI, không DELETE database |
| Điểm danh | TH.checkIn | Ghi nhận state |
| Bắt đầu | App.handleStartSession | Kiểm tra attendance present và điều kiện giao diện, đổi In Progress |
| Lưu & hoàn thành | App.handleCompleteSession | Đổi Completed và ghi kết quả state |
| Xác nhận lại lịch sau khóa | App.handleConfirmSchedule | Cập nhật state theo hàm này |
| Bật/tắt ô quyền | PermissionMatrixPage mở xác nhận | Chưa lưu ngay lúc mở hộp |
| Xác nhận đổi quyền và lý do | App.handleTogglePerm | Sửa rolePerms và audit trong state |
| Nhập ô text/chọn thứ/đổi tab | onChange/setState | Đổi bản nháp hoặc cách nhìn |

### 11.3 Đọc một callback

```tsx
onCompleteSession={handleCompleteSession}
```

App truyền một hàm xuống component con. Khi con gọi `props.onCompleteSession(s.id, r)`, App chạy handleCompleteSession với ID buổi và dữ liệu r. Không có controller tham gia trừ khi thân hàm thực sự gửi HTTP.

Trong PermissionMatrixPage, ô switch đặt pending; hộp xác nhận gọi onToggle; App.handleTogglePerm sửa rolePerms bằng setState. Quyền theo trang của UI chưa được chứng minh ánh xạ thành permission code backend như MANAGE_TRAINING.

### 11.4 Khác biệt phải biết khi trình bày

- UI hiện có headTrainerId như trường hiển thị/state; backend Horse là tập trainers nhiều–nhiều. Không dùng trường frontend làm bằng chứng quan hệ database hiện tại.
- UI handleCompleteSession cho Scheduled hoặc In Progress; backend yêu cầu đã start và stop với đo hồi phục.
- UI mua gói tạo enrollment active ngay trong hàm đã đọc; backend đăng ký PENDING và payment riêng.
- UI có điểm danh present trước start; không suy ra backend có đúng cùng giao thức present chỉ vì có endpoint attendance.
- Backend có adjust/stop/feedback; frontend hiện tại không tự có đủ các bước này chỉ vì backend đã cung cấp.

### 11.5 Cách đọc request khi có tích hợp

Trong DevTools Network xem method, URL, body, response. Không thấy request khi bấm lưu nhưng UI thay đổi thì kiểm tra state handler trước. Với lỗi: xác định lỗi nhập liệu, chưa xác thực, bị từ chối quyền, không tìm thấy dữ liệu hay vi phạm nghiệp vụ; sau đó tìm handler để biết status thực tế.

Nguồn: [App.tsx](../frontend/src/App.tsx), [trainingLogic.ts](../frontend/src/trainingLogic.ts), [trainingPlans.tsx](../frontend/src/trainingPlans.tsx), [admin.tsx](../frontend/src/admin.tsx).

## Giờ 12 — Thực hành như một buổi bảo vệ

### 12.1 Bài thực hành xuyên suốt

Đây là tình huống giả định để lần code, không phải kết quả test đã chạy.

1. Lan có Thunder, owner liên kết đúng User. Tìm Horse.owner và nơi kiểm tra sở hữu.
2. Ngựa được duyệt và thú y xác nhận đủ điều kiện. Tìm requireHealthy và giải thích vì sao READY chưa đủ.
3. Lan đăng ký, trả tiền gói BASIC. Chỉ ra PENDING/PENDING rồi ACTIVE/PAID, ngày hết hạn tính cả hai đầu.
4. Huy giao Nam gói đó. Tìm assign, status ASSIGNED. Nam trả lời ACCEPTED, tìm INSERT Horse_Trainer.
5. Nam xin gợi ý. Tìm protocol approved theo khoảng cân nặng và snapshot; giải thích không có protocol thì báo lỗi.
6. Nam xác nhận tạo plan. Tìm assignmentId, horsePackageId, createdBy, HorsePlan và stages.
7. Nam sinh lịch. Theo generate → scheduleSession → resolver/guard → stageBinder → calendar → save.
8. Thử thêm Chủ nhật khi đã có sáu ngày tuần đó: tìm requireSixDayWeek.
9. Bắt đầu 07:00, dừng 07:20, ghi hồi phục đo 07:22: chỉ ra start/stop/complete và các trường.
10. Thử chuyển buổi đã bắt đầu sang MISSED: chỉ ra điều kiện chặn.
11. Ngựa có khóa y tế: phân biệt quyền Nam vẫn có với điều kiện vận động không đạt. Lần Recovery, bảo lưu ngày, unlock và resume riêng.
12. Admin thu hồi MANAGE_TRAINING: chỉ ra RolePermission bị xóa và request tiếp theo bị kiểm tra lại. Quan hệ Horse_Trainer không tự bị xóa bởi revoke().

### 12.2 Bộ câu hỏi và đáp án ngắn

| Câu hỏi | Trả lời phải có |
|---|---|
| Quan hệ trainer–horse nằm đâu? | Horse.trainers, ManyToMany, Horse_Trainer; tác nghiệp còn có assignment theo gói |
| User và Trainer có phải một ID? | Có entity/profile Trainer riêng nối User; không thay trainerId bằng userId tùy tiện |
| Có role trainer là đủ tạo plan? | Không, cần permission, accepted assignment, gói và sức khỏe hợp lệ |
| Cấp quyền cho một user hay role? | Backend PermissionService cấp theo role, tác động những user thuộc role |
| Thu hồi quyền có xóa user? | Không, xóa cặp RolePermission |
| Ai quản lý quyền? | ADMIN và MANAGE_PERMISSION trong controller hiện tại |
| Ai giao trainer? | CLUB_MANAGER có ASSIGN_TRAINER; trainer cần phản hồi |
| Plan khác package? | Thiết kế huấn luyện khác sản phẩm/lần mua |
| Stage khác session? | Khoảng hoạt động trong lộ trình khác một buổi theo ngày giờ |
| Có được đổi stages sau khi đã có buổi? | roadmaps.replace chặn nếu có session |
| Có sửa buổi chưa chạy? | adjustSession có điều kiện và audit |
| Thời gian chờ hồi phục có tính chạy? | Tách stop ghi actualEnd, complete ghi kết quả sau |
| Đo sau ba phút có phải chuẩn hai phút? | Có thể lưu thời điểm thật, feedback không coi là so sánh chuẩn đúng hai phút |
| Nhịp tim > 0 có nghĩa ngựa khỏe? | Không, đó là validation đầu vào, khác clearance y tế |
| Bắt đầu lặp hai lần? | Code mới từ chối đã có actualStart |
| Có buổi đang dở thì mở buổi khác? | startSession kiểm tra ngựa có unfinished session khác |
| Xóa dòng preview có gọi DELETE? | Không, frontend filter state |
| Backend API đã có nghĩa frontend gọi chưa? | Không; phải tìm request và chứng minh endpoint/DTO khớp |
| Có transaction thì mọi thứ tự rollback? | Giao dịch dữ liệu trong phạm vi áp dụng; không tự hứa rollback tác động bên ngoài |
| Khóa database giống khóa huấn luyện? | Không; một cái quản lý đồng thời, một cái là lệnh nghiệp vụ |

### 12.3 Mẫu trả lời 90 giây

“Về nghiệp vụ, chức năng ... cho vai trò ... thao tác trên ... với điều kiện .... Quan hệ dữ liệu nằm ở entity/bảng .... Endpoint ... được controller ... nhận. Controller kiểm tra role/quyền và service ... tiếp tục kiểm tra đúng phân công, trạng thái gói, sức khỏe và dữ liệu. Đoạn quyết định là .... Hợp lệ thì cập nhật ... và ghi audit; sai thì từ chối. Với frontend hiện tại, nút ... đang chạy callback ... sửa state, nên em không khẳng định đã gọi API khi chưa có request.”

### 12.4 Tự chấm

- 2 điểm: kể đúng nghiệp vụ bằng ngôn ngữ đời thường.
- 2 điểm: chỉ đúng quan hệ, khóa và bảng.
- 2 điểm: lần đúng controller → service → repository/SQL.
- 2 điểm: nêu được điều kiện thất bại và trạng thái trước/sau.
- 2 điểm: phân biệt frontend state, API backend và dữ liệu thực tế; không học theo phiên bản cũ.

Chưa cần thuộc mọi dòng. Hãy mở đúng file, đọc được điều kiện và giải thích vì sao điều kiện đó tồn tại.
