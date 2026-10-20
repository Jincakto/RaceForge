# Owner đăng ký gói huấn luyện cho ngựa

## Phạm vi sửa

Chỉ frontend PreMain3. Không sửa backend, migration hoặc DB. Backend đã có POST /api/horse-packages/register; trước đó phần đăng ký chỉ nằm trong Medical & Training, còn trang Gói huấn luyện chỉ hiển thị danh mục.

## File mới/sửa

- frontend/src/pages/live/OwnerPackageRegistration.jsx: màn hình riêng cho Owner; chọn ngựa thuộc tài khoản, tải điều kiện và lịch sử, gọi đăng ký gói, thanh toán mô phỏng, tải lại dữ liệu. Chặn gửi lặp khi đang xử lý.
- frontend/src/utils/packageRegistration.ts: trả lý do chưa đủ điều kiện: sai chủ sở hữu, chưa duyệt tiếp nhận, chưa có khám INITIAL CONFIRMED, sức khỏe chưa READY, khóa tập hoặc đã có gói PENDING/ACTIVE/PAUSED.
- frontend/src/pages/live/LivePackages.jsx: Owner vào màn hình đăng ký; các role khác vẫn dùng danh mục, Manager giữ chức năng quản lý gói. Code danh mục giữ nguyên trong PackageCatalog.
- frontend/src/pages/live/LiveContent.jsx: mục menu Owner đổi thành Đăng ký gói tập, URL /training-register.
- frontend/src/components/training/PackagePanel.tsx: tái sử dụng component hiện có, không thay đổi; chọn gói thường đang ACTIVE, lịch sử, thanh toán mô phỏng. Recovery vẫn theo luồng Manager duyệt riêng.
- frontend/tests/owner-package-registration.test.js: kiểm tra điều kiện, lý do chặn và đúng màn hình theo role.

## API được dùng

- GET /api/horses: lấy ngựa, frontend chỉ hiển thị ngựa có ownerId trùng tài khoản đăng nhập.
- GET /api/medical/horses/{horseId}/records: lấy lần khám; loader chỉ gọi sau khi đã APPROVED.
- GET /api/training-packages: gói đang hoạt động.
- GET /api/horse-packages/horse/{horseId}: lịch sử gói của ngựa đã chọn.
- POST /api/horse-packages/register, body {horseId, packageId}: đăng ký, giá lấy từ backend; không cho client tự quyết định giá hoặc ownerId.
- POST /api/horse-packages/{id}/simulate-payment, body {successful}: mô phỏng thanh toán gói thường. Recovery dùng simulate-recovery-payment khi có bản đăng ký Recovery đã được duyệt theo luồng riêng.

Các điều kiện UI giúp hướng dẫn người dùng; backend vẫn là nơi xác thực quyền sở hữu và quyết định cho phép đăng ký.

## Cách thử

Ctrl+F5, đăng nhập Horse Owner, mở Đăng ký gói tập. Chọn ngựa của mình. Nếu có lý do chặn, hoàn thành tiếp nhận/khám ban đầu trước. Khi đủ điều kiện chọn Đăng ký gói. Xem bản đăng ký chờ thanh toán bên dưới; chọn mô phỏng thanh toán thành công hoặc thất bại.

## Kết quả kiểm tra

TypeScript đạt, Vite build đạt. Bộ test owner-package-registration + backend-contract + api-wiring: 22/22 đạt. Đây là test logic/render/hợp đồng frontend với fetch giả lập; chưa chạy đăng ký hoặc thanh toán thật lên DB trong lần sửa này.