# RaceForge — kiểm thử luồng Training với SQL Server thật

Ngày: **10/11/2026, Asia/Bangkok**. Source: `D:/SWP391/RaceForge-premain4-premain/RaceForge-premain4`, nhánh `premain4`.

## Kết luận

Luồng chính Training và Post-Training Assessment đã chạy được qua HTTP API với database **RaceForge**, và có một luồng thật từ trình duyệt đến DB. **Chưa phải toàn hệ thống đều đạt**: ba ca HTTP không đạt, hai lỗi hiển thị, và một lỗi ở service tạo ngựa trong bước chuẩn bị fixture cần đối chiếu thêm với API upload.

Đây là báo cáo kiểm thử; **không có sửa code production, SQL/migration/schema, commit hoặc push** trong lượt này. Các mốc `session-back-end-up` và `session-front-end-up` giữ nguyên snapshot.

## Cách chạy và phạm vi bằng chứng

Backend chính chạy bằng:

`mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.flyway.enabled=false"`

- Database dùng đúng cấu hình hiện tại: SQL Server `localhost:1433`, `RaceForge`, giữ `ddl-auto=validate`.
- Backend chính khởi động bình thường, có seeder quyền như source hiện có; cuối lượt health vẫn HTTP 200 trên cổng 8080.
- Harness chính và các ca guard nâng cao ghi **393 HTTP request**, **112 assertion bổ sung**. 3 ca HTTP FAIL được giữ nguyên và nêu dưới đây. Số request bao gồm đăng nhập và các lần thử lại; không phải 393 test case độc lập.
- Có thêm kiểm tra rollback sau flush thật, kiểm tra ngày/trạng thái gói qua fixture JPA, đọc JPA và JDBC metadata để xác minh bảng/index. Đây không phải Mockito.
- Các cặp request đồng thời được chạy trên SQL Server thật: duplicate Complete; manual vet request; Start hai ngựa cùng trainer; Complete–Start. Mỗi ca là một lần chạy cặp request, chưa phải stress/load test.
- Không chạy lại toàn bộ Maven/frontend unit suite trong lượt này. Full frontend đợt trước còn 10 FAIL (225/235 PASS), đã tái hiện trên HEAD; không coi các lỗi đó đã được sửa. Kết quả 492 backend PASS, 99 frontend focused PASS và build/typecheck PASS là bằng chứng của đợt trước, không cộng vào số kiểm tra DB lần này.

## Chuẩn bị dữ liệu — phần nào qua fixture, phần nào qua API

- Tạo 8 tài khoản ACTIVE/verified riêng bằng JPA, dùng BCrypt và cơ chế cấp ID hiện có. Sau đó đăng nhập thực qua API để lấy Bearer token. Không kiểm chứng gửi OTP/invitation/email hoặc quy trình đăng ký tài khoản trong đợt này.
- Tạo 4 ngựa TEST bằng JPA persist sau khi gặp lỗi ở HorseService. URL ảnh/chứng từ là fixture, không gọi upload Supabase. Không coi bước chuẩn bị này là API tạo ngựa PASS.
- Submit admission → phân công/nhận vet → INITIAL DRAFT → Confirm → duyệt admission → activate đều đi qua API.
- Tạo catalogue và roadmap, đăng ký gói PENDING đều qua API. Thanh toán được chuẩn bị bằng `HorsePackageService.applyPayment(...)`, không fake gateway receipt hay gọi payOS trả tiền. Không coi payOS end-to-end là PASS.
- Sau thanh toán, phân công trainer, plan, lịch, Session, Assessment, Notification và Medical linkage được chạy qua API thật.
- Gói tương lai/hết hạn/chưa trả tiền và nhiều pending review được chuẩn bị bằng JPA trên dữ liệu TEST; các trường nghiệp vụ đã được khôi phục. Đây là kiểm tra guard với fixture, không phải các quyết định nghiệp vụ được thực hiện từ UI.

## Luồng và nhánh đã đạt

| Nhóm | Bằng chứng thực tế |
|---|---|
| Catalogue/roadmap | Tạo và đọc BASIC 30, RECOVERY 60, PERFORMANCE 90, RACING 180; Owner không được tạo catalogue |
| Admission/Medical đầu vào | Không duyệt được trước INITIAL Confirm; vet đúng nhận phân công, tạo và xác nhận khám; manager duyệt/activate |
| Đăng ký gói | Sai owner bị chặn; đăng ký tạo PENDING; gói chưa trả tiền không phân công được trainer |
| Trainer assignment | Chưa ACCEPTED không lập plan; trainer khác không nhận thay; thay và kết thúc phân công được kiểm tra |
| Plan | Tạo với stages; plan trùng bị chặn; stages không được thay sau khi có session |
| Sinh lịch | Generate thành công; xác nhận false/trùng generate bị chặn; recurring hợp lệ tạo 13 buổi, recurring trùng không lưu dở dang |
| Session thủ công/sửa lịch | Thêm buổi hợp lệ; sửa giờ hợp lệ; chặn trùng, quá khứ, sai ngựa, bảy ngày/tuần và sửa buổi đã bắt đầu |
| Start | Bắt đầu buổi dự kiến tương lai vào hôm nay; giữ planned time, ghi actual time và HR snapshot; chặn sai trainer, busy horse/trainer |
| Gói và khóa | Gói chưa đến hạn/hết hạn/chưa thanh toán bị chặn; Medical Lock và package PAUSED vẫn chặn |
| Stop/Complete | Complete trước Start/Stop bị chặn; đã Stop nhưng chưa lưu kết quả vẫn chiếm trainer; measurements được lưu đúng |
| Validation JSON | Thiếu/null/sai kiểu/chuỗi boolean/số/unknown code/duplicate key/sai version/client score bị từ chối |
| Measurements/notes | Chặn số âm, quá precision, BPM 0, speed không hợp lệ, recovery trước Stop/ở tương lai, ghi chú quá 1.000 ký tự |
| Checklist | Concern không cần note riêng; Overall notes tùy chọn; blank legacy note chuẩn hóa thành không có note theo yêu cầu mới |
| Scoring | Biên 0/3/4/6/7/10 và override Coordination, Breathing, Gait, Limb, Nasal được Complete và đọc lại từ DB |
| Normal | Không auto-send/không pending; gửi tay cần reason; retry và gửi đồng thời chỉ tạo một chuông; không chặn Start |
| Recommended/Urgent | Tự gửi vet và Manager ACTIVE; Start 409 với mã PENDING_POST_TRAINING_REVIEW; canStart/flag/code nhất quán |
| Thiếu vet | Normal gửi tay WAITING nhưng không pending; cảnh báo WAITING vẫn pending; phân công mới gửi tiếp cả hai, không gửi trùng |
| Notification target | Đúng recipient mở đúng Session; người nhận khác bị từ chối; vet cũ mất quyền sau thay phân công |
| Đọc chuông | Không resolve assessment |
| Medical bridge | DRAFT không resolve; khác ngựa bị chặn; Confirm không context không resolve; đúng linked Confirm mới resolve |
| Đổi vet | DRAFT cũ CANCELLED; vet mới liên kết DRAFT thay thế; vet cũ không confirm được draft cũ |
| NOT_FIT/FIT | NOT_FIT resolve assessment nhưng giữ Medical Lock, pause gói; FIT sau đó không tự unlock; phải explicit unlock + manager resume |
| Attendance | COMPLETED không bypass checklist, đường hợp lệ lưu assessment; MISSED không cần assessment và không Start được |
| Scope lịch sử | Recorder cũ đọc phần đã ghi, không gửi tay; current trainer mới đọc được lịch sử, làm session mới; recorder cũ không đọc bản của trainer mới |
| Pending nhiều bản | Hai pending chặn; chỉ resolve một vẫn chặn; tất cả resolved mới Start được; các status fixture được khôi phục |
| Pending theo ngựa | Ngựa khác vẫn Start khi ngựa B pending; review ở gói cũ chặn Start trong gói mới của cùng ngựa |
| Lịch sử thiếu assessment | Session COMPLETED lịch sử được chuẩn bị bằng JPA: GET 404, không dựng/tạo 10 Pass giả; fixture session khôi phục sau test |
| HR/suggestion | Có một khoảng hồi phục hơn 2 phút thật; lưu HR/drop; GET feedback và package suggestions/readiness theo dữ liệu thật |
| Permission | ADMIN đọc permission/audit được; MANAGE_TRAINING và VIEW_TRAINING có trong DB; Manager/Owner không quản lý permission |

## Rollback và concurrency

Session `SES-051`: instance thử riêng thay NotificationService bằng lớp gây lỗi **chỉ trong fixture**, sau khi save và flush notification thật. Complete trả HTTP 500. Đọc lại DB xác nhận:

- Session vẫn SCHEDULED.
- Không còn assessment, item hoặc notification linkage của request lỗi.
- Notification đã flush cũng bị rollback.
- Retry sau đó trên backend chính đã Complete thành công.

Kết quả: **PASS**. Không sửa class NotificationService production để gây lỗi.

Duplicate Complete đồng thời cho đúng một HTTP 200 và một HTTP 409; dữ liệu còn đúng một assessment/10 item. Hai manual request đồng thời cho một chuông. Start hai ngựa cùng trainer chỉ một request thành công. Complete cảnh báo chạy đồng thời với Start buổi tiếp theo không cho Start lọt qua.

## Kiểm tra UI với backend thật

Dùng trình duyệt headless với profile riêng, frontend Vite cổng 5189 proxy backend 8080, không mock fetch. Đăng nhập trainer TEST bằng giao diện rồi:

1. Mở Training & plans, xem packages/plans và Training sessions.
2. Bấm Start → Stop trên Session `SES-097`, planned date khác ngày thực tế.
3. Form có 10 nhóm chưa chọn mặc định, đúng một textarea Overall notes tùy chọn.
4. Nhập measurements; 9/10 giữ Save disabled.
5. Chọn Concern ở Alertness, các mục còn lại Pass: không tạo note riêng bắt buộc, preview Normal.
6. Save đóng form, hiển thị persisted 9/10 Normal; GET DB xác nhận Concern và notes null đúng.
7. Request a Vet Check: reason trống bị chặn; điền reason và gửi thành công. DB giữ NOT_REQUIRED, SENT, không pending.

Không ghi nhận API HTTP >=400 trong các giai đoạn browser đã theo dõi. Đây là một luồng UI Normal/Concern và gửi tay; chưa phải kiểm chứng mọi role/mọi màn hình trong browser. Vet/Medical UI và deep link chuông vẫn nằm ngoài phần frontend đã triển khai.

## Các vấn đề chưa sửa

| Mã | Kết quả/bằng chứng | Vị trí và ảnh hưởng |
|---|---|---|
| F01 | Approve center-covered Recovery trả 409; SQL Server báo CHECK `CK_HORSE_PACKAGE_PAYMENT_STATUS` tại `HORSE_PACKAGE.payment_status` | `RecoveryPackageService.java:148` ghi CENTER_COVERED nhưng schema hiện tại chặn. Recovery end-to-end chưa chạy qua. Không sửa constraint. Request thất bại không lưu Recovery dở dang; fixture đã FIT/unlock/resume gói gốc. |
| F02 | POST catalogue nhận BASIC 31 ngày, HTTP 201, ID `PKG-016` | `TrainingPackageService.java:54` chưa chặn yêu cầu ngoài 30/60/90/180. Gói TEST sai duration đã chuyển INACTIVE sau khi giữ bằng chứng. |
| F03 | ADMIN ACTIVE đăng nhập và đọc permission được, nhưng PATCH trainer profile status trả 403 | `SecurityConfig.java:91–96` loại ADMIN ở anyRequest trước khi tới method; `TrainingWorkflowController.java:30` lại cho ADMIN. Ca inactive-profile và restore qua API bị BLOCKED bởi lỗi này; không tự đổi quyền toàn cục. |
| F04 | Plan progress hiển thị 0% dù package card có Completed 3/25 hoặc 3/26 | `frontend/src/remote.ts:112` đang gán progress: 0. Chưa sửa vì đợt này kiểm thử, và feature Assessment ban đầu không đổi thanh tiến độ. |
| F05 | Lịch sử recorder cũ hiển thị 03:00 thay vì 10:00 Bangkok | `TrainerAssignmentService.java:217` trả JDBC timestamp `2026-11-11T03:00:00.000Z`; adapter `frontend/src/remote.ts:116,288` lấy giờ bằng slice. Cần thống nhất chuyển UTC/local trước khi tách giờ. |
| F06 | Gọi HorseService.createHorse trong bước fixture lỗi DuplicateKeyException/NonUniqueObjectException cho HorseAdmission | `HorseService.java:65` và quan hệ Horse–HorseAdmission. Sau đó fixture dùng JPA persist để tiếp tục Training. **Chưa kiểm chứng API multipart/upload**, nên không kết luận mọi đường tạo ngựa qua UI đều hỏng. |

Không coi backend startup/validate PASS là schema đã đúng mọi constraint: F01 chỉ lộ khi ghi giá trị CENTER_COVERED thật.

## Dữ liệu và ràng buộc cuối lượt

| Fixture | Horse ID | Số Session | COMPLETED | Buổi chưa hoàn tất kết quả |
|---|---|---:|---:|---:|
| A | HOR-007 | 26 | 13 | 0 |
| B | HOR-008 | 39 | 4 | 0 |
| C | HOR-009 | 25 | 5 | 0 |
| D | HOR-010 | 0 | 0 | 0 |

- **22 Assessment, 220 item, 40 notification linkage** cho các ngựa TEST; đúng 10 item/assessment.
- **0 review PENDING**, không còn exercise fixture đang làm dở.
- JDBC metadata xác nhận PK session_id; unique session+criterion; unique session+recipient+type.
- Account IDs: manager CM-002; trainer HTR-003/HTR-004; vet VET-003/VET-004; owner OWN-009/OWN-010; admin ADM-002.
- Catalogue TEST PKG-012…PKG-016; PKG-016 INACTIVE. Gói gốc TEST HPG-004…HPG-006 được giữ; một đăng ký/plan TEST bổ sung phục vụ kiểm tra khác package được kết thúc sau test.
- Dữ liệu thử được giữ để truy vết, không xóa hàng loạt. Có notification TEST gửi tới các Manager ACTIVE, bao gồm manager hiện hữu, đúng cơ chế gửi của hệ thống. Không gửi email hoặc giao dịch tiền thật.
- Các trạng thái pending/date/package được chuẩn bị tạm đã khôi phục; ngựa C đã được vet FIT/unlock và manager resume qua API.

## Đối chiếu T01–T42 theo phạm vi bằng chứng

| Test | Trạng thái lần chạy thật |
|---|---|
| T01–T05 | PASS theo yêu cầu notes mới: parser/validation API; UI 9/10 và Concern/optional notes; không áp lại note bắt buộc cũ |
| T06–T17 | PASS API/DB cho biên điểm, override và các trạng thái; UI thật xác nhận một ca Normal có Concern; các UI màu/trạng thái khác đã có mock/SSR ở đợt trước |
| T18–T23 | PASS API/DB: manual Normal, waiting, retry/concurrency, recipient và phân công mới |
| T24 | PASS target API, ownership và scope; DEFERRED click/deep link/refresh trang Vet từ chuông |
| T25–T29 | PASS API/DB: mark-read, DRAFT, CANCELLED/replacement, mismatch, linked Confirm FIT/NOT_FIT |
| T30 | PASS guard DB với fixture hai pending; chỉ resolve một vẫn chặn; không coi đây là test hai Medical Confirm đồng thời |
| T31 | PASS API thật: ngựa khác Start trong khi B pending |
| T32 | PASS API thật với fixture gói cũ/new package cùng ngựa; current trainer hợp lệ vẫn bị mã pending chặn |
| T33 | PASS Start 409 và batch canStart/pending/code |
| T34–T35 | PASS Stop bắt buộc, attendance không bypass, MISSED độc lập |
| T36 | PASS cặp duplicate Complete/manual trên SQL Server; unique indexes xác nhận metadata; NOT RUN stress nhiều luồng/lặp dài |
| T37 | PASS rollback thật sau notification flush, không phải Mockito |
| T38 | PASS một cặp Complete–Start đồng thời và kiểm tra trạng thái cuối; NOT RUN stress/race lặp nhiều lần |
| T39 | PASS API completed-history fixture không assessment, không tạo giả; DEFERRED UI thông báo lịch sử thiếu assessment với DB thật |
| T40 | PASS measurements/HR snapshot/drop/feedback/suggestions; không thay planned dates từ Complete; NOT RUN lịch sử huấn luyện thật kéo dài 30+ ngày |
| T41 | PASS các role/scope/current assignment/recorder/recipient/vet thực tế; FAIL F03 cho ADMIN quản lý trainer profile. NOT RUN revoke/grant quyền dùng chung để tránh ảnh hưởng tài khoản khác |
| T42 | PASS form/readonly Session thật với nhãn tiếng Anh và không hiện enum Assessment; DEFERRED toàn bộ Medical/Vet/deep-link UI |

## Phần chưa thể xem là đã đạt toàn hệ thống

- PayOS payment/link/webhook đối soát tiền thật; OTP/invitation/email và upload ảnh/chứng từ.
- Recovery center-covered bị F01 chặn; phần resume sau một Recovery kích hoạt thành công chưa kiểm chứng trong DB này.
- Quản trị inactive trainer profile bị F03 chặn; không bỏ qua bằng cách đổi security hoặc quyền chung.
- Toàn bộ Medical UI/notification click route; mọi role trên browser, tải dài hạn và stress nhiều request.
- Các module ngoài Training/permission và những điểm Medical/Notification tích hợp kể trên chưa được kiểm thử toàn bộ.

## Artifact và trạng thái server

- `backend/target/training-real-api-2026-11-10/summary.json`: số liệu và phạm vi.
- `api-results.json`: response/status đã loại token/password; các HTTP lệch kỳ vọng ban đầu của harness (200/201, 404) được ghi note sau đối chiếu controller, không tính là lỗi production.
- `rollback-evidence.json`, `advanced-guard-evidence.json`, `final-database-evidence.json`: bằng chứng riêng.
- `screenshots/`: ảnh browser thật; `scripts/`: mã harness/probe để đối chiếu. Harness tham chiếu fixture riêng của lần chạy, không phải test tự động chạy lại trên dữ liệu bất kỳ.
- Log Maven chính: `backend/target/session-database-maven-run.log`. Log gốc/harness có các lần fixture không hợp lệ, precision thời gian làm tròn hoặc sai kỳ vọng HTTP; báo cáo và JSON ghi rõ phân loại, không xóa bằng chứng lỗi.
- Mật khẩu, access token, cookie và private fixture state không được copy vào artifact hoặc tài liệu.
- Frontend thử 5189 và Chrome profile TEST đã đóng. Backend Maven cổng 8080 tiếp tục chạy.
