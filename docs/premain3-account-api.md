# PreMain3: tài khoản và quản lý trung tâm

Frontend dùng API thật khi VITE_API_BASE_URL là origin backend (ví dụ http://localhost:8080). Để trống giữ chế độ demo; nút đăng nhập nhanh demo đã bị loại bỏ.

## Chức năng
- /register: đăng ký → email OTP → xác thực; chọn vai trò theo AccountConstants (2 HLV, 3 thú y, 4 groom, 5 chủ ngựa). Vai trò nghiệp vụ cần quản lý duyệt.
- /login: email/mật khẩu hoặc Google; tạo mật khẩu nếu Google yêu cầu.
- /forgot-password và /reset-password?token=...: gửi link và đặt lại mật khẩu.
- /profile: lấy/sửa hồ sơ, đổi mật khẩu và đăng xuất.
- /staff: quản lý tài khoản, lọc và phân trang; khóa/mở khóa tài khoản đã được duyệt.
- /member-requests: lọc, phân trang, duyệt vai trò đã yêu cầu hoặc từ chối với lý do.
- /permissions: quyền theo vai trò, cấp/thu hồi và xem lịch sử; backend yêu cầu MANAGE_PERMISSION.
- /notifications: danh sách, số chưa đọc và đánh dấu đã đọc. API này trả JSON trực tiếp, khác ApiResponse.

## Phiên đăng nhập
Access token chỉ ở bộ nhớ. Reload khôi phục qua refresh cookie HttpOnly. Các lỗi 401 hết phiên dùng chung một refresh và thử lại một lần; mật khẩu hiện tại sai không làm mất phiên. Đổi mật khẩu thu hồi refresh token nên frontend đăng xuất.

## Cấu hình và kiểm thử thủ công
Backend cần SQL Server, SMTP và CORS/cookie đúng origin. Cấu hình SPRING_MAIL_HOST, SPRING_MAIL_PORT, SPRING_MAIL_USERNAME, SPRING_MAIL_PASSWORD, MAIL_FROM trong backend/.env. FRONTEND_URL phải trỏ đến /reset-password của frontend. Google cần GOOGLE_CLIENT_ID và VITE_GOOGLE_CLIENT_ID tương ứng. Không commit thông tin đăng nhập SMTP.

1. Đăng ký email chưa tồn tại, kiểm tra hộp thư và spam; OTP mặc định 5 phút, resend cách 60 giây.
2. Nhập OTP sai rồi đúng; thử email đã đăng ký và SMTP chưa cấu hình.
3. Đăng nhập, reload /profile, chờ token hết hạn rồi tải dữ liệu; kiểm tra cookie hết hạn về đăng nhập.
4. Sửa hồ sơ rồi reload. Nhập sai mật khẩu hiện tại phải giữ phiên; đổi đúng phải đăng xuất.
5. Gửi quên mật khẩu, mở link email, đặt mật khẩu và đăng nhập lại.
6. Với quản lý: tìm/lọc/phân trang tài khoản và yêu cầu, duyệt/từ chối, khóa/mở khóa tài khoản.
7. Với quản lý có MANAGE_PERMISSION: cấp/thu hồi, kiểm tra lịch sử. Vai trò khác phải bị chặn.
8. Đánh dấu thông báo rồi reload để kiểm tra dữ liệu lưu backend.

Build/typecheck và test mock transport không thay thế kiểm thử SMTP/database thật. Không có tài khoản SMTP hay dữ liệu đăng nhập được bổ sung vào repository.

## Hợp nhất PreMain2
PreMain3 đã kế thừa luồng API ngựa, admission, Health Profile, trainer và các màn hình Live của PreMain2. Development mặc định gọi http://localhost:8080 qua .env.development được lưu trên Git; có thể đổi URL bằng .env.local. Production vẫn phải cấu hình VITE_API_BASE_URL khi build.

Migration admission được chuyển sang V8 vì V7 đã dùng cho chuyển sequence sang identity. Database từng chạy V7 admission trên nhánh cũ cần đối chiếu flyway_schema_history trước khi nâng cấp, không tự sửa lịch sử migration của database đang dùng.
