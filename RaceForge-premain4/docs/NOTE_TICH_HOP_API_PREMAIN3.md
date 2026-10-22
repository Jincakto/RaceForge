# Note tích hợp API frontend PreMain3

## Phạm vi

Bản đang sửa: D:\SWP391\RaceForge-PreMain3\RaceForge-PreMain3, khác bản RaceForge-main đã sửa trước đó.
Frontend gọi backend thật qua frontend/.env.development: VITE_API_BASE_URL=http://localhost:8080. Không cần Vite proxy khi backend cho phép CORS http://localhost:5173.

## Những thay đổi backend đã thực hiện trước khi bạn nhắc giữ nguyên backend

1. backend/src/main/resources/application.yaml: chọn classpath:db/identity-migration, bảng flyway_identity_schema_history, baseline 7. Giữ cấu hình legacy bằng comment; các file migration legacy vẫn còn nguyên.
2. backend/src/main/resources/db/identity-migration/V8__Validate_identity_schema_and_roles.sql: dùng đúng file của RaceForge-main để giữ checksum lịch sử identity đã chạy. Kiểm tra schema INT IDENTITY và các role theo AccountConstants, chỉ thêm role thiếu.
3. backend/src/main/resources/db/identity-migration/V9__horse_admission.sql: chuyển nội dung migration admission có sẵn sang pipeline identity với version 9. Thêm GO để SQL Server biên dịch UPDATE sau khi đã thêm cột.
4. Package com.raceforge.backend.permission.entity: Permission, RolePermission, PermissionAuditLog sửa @Table tương ứng Permission, Role_Permission, Audit_Log. Mapping cũ giữ bằng comment.

Không sửa controller, service, repository hoặc rule nghiệp vụ backend trong lượt tích hợp này. Từ khi nhận tin nhắn yêu cầu không sửa backend, không sửa tiếp backend.

## DB đã thay đổi gì

V9 thêm Horse.admission_status (mặc định NOT_SUBMITTED), Horse.admission_note và check constraint trạng thái admission. Migration đánh dấu APPROVED cho ngựa đã có status ACTIVE để bảo toàn luồng của ngựa đang hoạt động. Lịch sử migration identity có thêm V9. Không xóa bảng, không chuyển kiểu ID, không sửa checksum V1 của bảng lịch sử legacy.

## Những thay đổi frontend

- services/horseService.ts: khôi phục các hàm UI gọi, nối CRUD, admission, trainer, health profile và activate/deactivate với API có thật.
- services/trainingService.ts: catalog, quản lý gói, đăng ký gói, mô phỏng thanh toán, recovery/resume, lịch đơn và lịch lặp. Sửa payload status và đường dẫn training-sessions.
- services/raceService.ts: lịch sử đua theo ngựa, chi tiết, tạo, sửa, xóa.
- services/planService.ts: tạo kế hoạch dưới /api/horses/{horseId}/training-plans. Endpoint legacy không tồn tại giữ bằng comment.
- services/sessionService.ts: xem theo ngựa, PATCH start/complete, PUT attendance. Endpoint legacy không tồn tại giữ bằng comment.
- services/api.ts: thông báo mất kết nối dễ hiểu; vẫn giữ JWT, cookie và refresh token.
- services/apiClient.js và apiClient.d.ts: adapter có kiểu và truyền query parameters.
- services/healthService.ts, registrationService.ts: thêm đọc chi tiết.
- pages/live/LiveTraining.jsx, LivePackages.jsx, LiveRaces.jsx: form gọi API thật, loading/error, tải lại dữ liệu sau thao tác. LiveContent.jsx nối vào sidebar/menu.
- pages/live/LiveMedicalReadPanel.jsx và file .d.ts: đọc lần khám trước và chi tiết record trong WorkflowWorkspace.tsx.
- pages/live/LivePermissions.jsx: thêm audit log; LiveStaff.jsx và LiveMemberReviews.jsx thêm đọc chi tiết.
- pages/live/LiveHorseDetail.jsx: nút kích hoạt/ngừng hoạt động cho Manager.
- pages/api/ApiNotificationsPage.jsx: lấy danh sách và số chưa đọc từ API; đánh dấu đã đọc và tải lại.
- pages/live/ApiHealthBadge.jsx, components/layout/AppLayout.jsx: trạng thái kết nối và mở nút thông báo.
- pages/public/LiveRegisterPage.tsx và LiveRegisterPage.css: màu option dễ đọc trên Windows. CSS gốc src/index.css được giữ nguyên.
- Các import default sai trong service được sửa, các đoạn thay thế đáng kể giữ lại bằng comment.
- tests/api-wiring.test.js: kiểm tra đường dẫn/method/payload và render các màn hình mới.

## Cách chạy

Terminal 1, trong backend: mvn spring-boot:run. Đợi Started BackendApplication.
Terminal 2, trong frontend: npm run dev. Mở http://localhost:5173, Ctrl+F5.
Không chạy hai backend cùng cổng 8080. Backend do tôi khởi động để kiểm tra đang được giữ chạy để frontend kết nối.
Đăng nhập đúng business role. Head Trainer dùng Lịch tập & kết quả; Manager dùng Quyền theo vai trò và Gói huấn luyện; Owner dùng Medical & Training để đăng ký/thanh toán gói.

## Giới hạn kiểm chứng

HTTP thật: /api/health trả 200; POST /api/auth/register với body rỗng trả 400 và CORS đúng origin. Request rỗng không tạo user hoặc gửi email.
Test hợp đồng frontend dùng fetch giả lập; không được gọi đây là E2E có đăng nhập và ghi DB. Chưa xác nhận gửi OTP qua Gmail, Google OAuth thật hoặc toàn bộ thao tác ghi DB từ trình duyệt.
Các chức năng care, inventory, reports chưa có backend controller tương ứng trong bản này, nên không tự tạo endpoint giả cho chúng. Menu API chỉ đưa các nghiệp vụ backend đang hỗ trợ.
## Kết quả kiểm tra cuối

- Toàn bộ test frontend: 93/93 đạt, 0 bỏ qua.
- TypeScript --noEmit: đạt.
- Vite production build: đạt.
- Lịch sử identity DB: baseline 7, V8 và V9 thành công. Lịch sử legacy V1 vẫn checksum 858144747.
- Hai file test react-ssr-bridge.js và phuc-integration.test.js sửa cách nạp MemoryRouter qua cùng module graph với React; giữ nguyên assertion, không bỏ qua test.
- Các test render/hợp đồng dùng môi trường kiểm thử và fetch giả lập; kết quả này không thay thế E2E có đăng nhập/ghi DB.
## Bổ sung sau tích hợp: lỗi medical 401 sau khi tạo ngựa
Có sửa thêm MedicalRecordController.currentUserId theo principal JWT. Đây là thay đổi backend bổ sung sau note ở trên, được ghi riêng tại NOTE_LOI_TAO_NGUA_MEDICAL_401.md; không đổi DB. Ba test hồi quy đạt.
