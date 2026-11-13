# Backend: Owner hủy gói và Trainer hoàn thành gói

Bàn giao ngày 11/11/2026 tại RaceForge-premain4-premain/RaceForge-premain4, nhánh premain4.
Chỉ sửa backend; không sửa/build/test frontend, không tạo support, không commit/push.

## API

Hai API dùng Bearer token, không cần request body và trả ApiResponse hiện có.

| Endpoint | Quyền | data trả về |
|---|---|---|
| PATCH /api/horse-packages/{id}/cancel | Owner ACTIVE, đúng chủ ngựa | registration, deletedSessionCount, certificate=null |
| PATCH /api/horse-packages/{id}/complete | Trainer ACTIVE, MANAGE_TRAINING, phân công ACCEPTED hiện hành | registration, deletedSessionCount=0, certificate gồm certificateNumber/issueDate |

ID là đăng ký HPG, không phải gói catalogue PKG.

## Cancel

- Chỉ gói ACTIVE/PAUSED đã PAID. Chuyển đăng ký sang CANCELLED, không tự hoàn tiền.
- Xóa thật mọi Session SCHEDULED chưa Start của đúng đăng ký, kể cả buổi quá ngày dự kiến.
- Session đang tập vẫn mang status SCHEDULED: phải kiểm tra actualStart. Chặn hủy khi đã Start nhưng chưa xử lý kết quả, kể cả đã Stop.
- Giữ Session COMPLETED/MISSED/CANCELLED, assessment, medical linkage, Plan, ngựa và thông tin thanh toán.
- Đóng phân công Trainer đang hiệu lực nhưng giữ lịch sử. Horse_Trainer chỉ bỏ khi không còn phân công ACCEPTED khác; Vet assignment giữ nguyên.
- Training Lock, pending review và tình trạng sức khỏe giữ nguyên. Gói mới vẫn phải đáp ứng điều kiện đăng ký hiện có.

## Complete

- Chỉ Trainer đúng phân công và quyền, gói ACTIVE/PAID và ngày hiện tại trong thời hạn, bao gồm ngày cuối.
- Có ít nhất một Session không CANCELLED; tất cả những buổi đó phải COMPLETED hoặc MISSED. Đếm qua mọi Plan của đăng ký, không chỉ buổi Trainer hiện tại ghi nhận.
- Chuyển đăng ký COMPLETED, remainingDays=0, đóng phân công và tạo đúng một Training_Certificate. Không cho Complete muộn khi đã hết hạn.
- Owner tải PDF qua GET /api/horse-packages/{id}/certificate. Tên ngựa trên chứng nhận là snapshot tại ngày cấp.
- Không tự resolve assessment hoặc gỡ khóa y tế. Chứng nhận hoàn thành gói không thay thế xác nhận sức khỏe của Vet.

## Giao dịch và HTTP lỗi

- Một transaction cho mỗi thao tác, khóa schedule → horse → package → Session/assignment.
- Flush việc xóa Session; lỗi FK phải làm rollback, không cascade xóa lịch sử.
- Lỗi lưu trạng thái, chứng nhận, audit hoặc notification được truyền ra để transaction rollback.
- 401: chưa đăng nhập; 403: sai quyền/Owner/phân công hoặc tài khoản không ACTIVE; 404: không tìm thấy.
- 409: PACKAGE_NOT_CANCELLABLE, PACKAGE_HAS_UNFINISHED_SESSION, PACKAGE_NOT_COMPLETABLE, PACKAGE_SESSIONS_NOT_FINISHED, PACKAGE_CERTIFICATE_EXISTS, PACKAGE_ALREADY_ENDED, PACKAGE_HORSE_CHANGED.
- Request lặp sau kết thúc trả conflict. Trainer từng được phân công chỉ được kiểm tra lịch sử cho request lặp, không lấy lại quyền ghi.

## SQL chạy tay, không dùng migration V19

Theo yêu cầu mới, đã bỏ file V19 khỏi thư mục Flyway. File cần bàn giao:

[scripts/training/06_horse_package_expired_status.sql](../scripts/training/06_horse_package_expired_status.sql)

- Trong SSMS chọn đúng database RaceForge rồi chạy toàn bộ file.
- Script chỉ thay constraint CK_HORSE_PACKAGE_STATUS để thêm EXPIRED; có transaction và rollback khi lỗi.
- Không thêm bảng/cột, không cập nhật/xóa dữ liệu cũ hoặc chứng nhận lịch sử.
- Chưa chạy script vào DB gốc. Phải cập nhật constraint trước khi dùng backend mới với dữ liệu có thể hết hạn; nếu chưa cập nhật, thao tác ghi EXPIRED sẽ bị constraint cũ từ chối.
- Không cần bật Flyway. Không sửa các migration đã phát hành.
- TrainingPackageExpirationService chuyển gói quá hạn sang EXPIRED và không cấp chứng nhận. Nhánh gói đã quá hạn khi phát sinh Medical Lock cũng dùng EXPIRED.
- Mapper trả số ngày sử dụng bằng 0 cho COMPLETED/CANCELLED/EXPIRED; PAUSED giữ số ngày bảo toàn.

## Source chính

- training/controller/HorsePackageController.java: route, role/ACTIVE/permission và OpenAPI.
- training/dto/HorsePackageLifecycleResponse.java: response.
- training/service/HorsePackageLifecycleService.java: transaction Cancel/Complete.
- training/repository/TrainingSessionRepository.java: lấy/khóa Session theo đăng ký.
- training/service/TrainerAssignmentService.java: đóng phân công, kiểm tra lịch sử.
- training/service/PackageEventService.java: audit và thông báo đúng Owner/Trainer của gói.
- training/service/TrainingPackageExpirationService.java và TrainingPackagePauseService.java: EXPIRED.
- training/mapper/HorsePackageMapper.java: số ngày hiển thị của gói kết thúc.

## Kiểm tra

- Backend compile đã đạt trước yêu cầu ngừng test.
- Lượt regression trước khi người dùng yêu cầu ngừng test: 553 tests / 42 suites, 0 failure/error/skipped; gồm 35 service test và 6 controller test lifecycle mới.
- Không chạy thêm test sau yêu cầu ngừng. Việc chuyển sang SQL chạy tay ở đợt sau chỉ được rà soát tĩnh, chưa chạy test lại.
- Integration SQL Server đã viết nhưng NOT RUN. Hai test database được cập nhật để dùng script chạy tay trên DB test UUID riêng; không tạo DB test và không chạy SQL trong đợt này.
- Các ca rollback thật (FK/certificate/audit), concurrency Complete–Complete, Cancel–Start và Complete–tạo Session chưa được đánh dấu PASS.
- Fixture src/test/resources/training/assessment_schema_TEST_ONLY.sql chỉ dành cho baseline test cũ, không dùng cho DB gốc.
- Frontend chưa có hai nút mới và hiện còn gộp một số nhãn trạng thái; tích hợp frontend để sau.

Lệnh regression backend đã chạy trước yêu cầu ngừng:

~~~powershell
mvn -q '-Dtest=Training*Test,HorsePackage*Test,Package*Test,Medical*Test,RacingMedicalEligibilityTest,AuthServiceTest,PayOsGatewayTest,StorageServiceTest,!*DatabaseTest' test
~~~

Sau khi schema sẵn sàng, dùng Swagger Authorize token đúng vai trò và gọi PATCH không body. Kiểm tra data.registration.status, deletedSessionCount và certificate; Owner dùng GET /{id}/certificate để tải PDF.
