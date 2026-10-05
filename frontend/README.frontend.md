# RaceForge frontend — minh/frontend

## Chạy ứng dụng

```sh
cd frontend
npm ci
npm run dev
```

## Phạm vi đã triển khai

- `/register`: đăng ký nhiều tài khoản, kiểm tra dữ liệu và email trùng.
- OTP đăng ký: mã 6 chữ số, hiệu lực 5 phút, tối đa 5 lần thử, gửi lại sau 30 giây. Chỉ tạo tài khoản sau khi xác thực thành công.
- `/login`: kiểm tra thông tin đăng nhập, ghi nhớ phiên 7 ngày; phiên thông thường lưu trong sessionStorage tối đa 1 ngày. Đăng xuất xóa phiên.
- Điều hướng Back/Forward của trình duyệt và bảo vệ các trang onboarding khi chưa đăng nhập.
- `/manager`: không gian quản lý mô phỏng, mở qua nút **Xem thử giao diện Club Manager** trên trang đăng nhập.
- Sidebar: tổng quan với số lượng cập nhật; tìm/lọc/thêm/sửa hồ sơ ngựa; duyệt hoặc từ chối đăng ký ngựa; quản lý vai trò và trạng thái nhân sự; duyệt thành viên kèm phân công vai trò; nhập kết quả đua; báo cáo CSV và nhật ký; cập nhật thông tin trung tâm.
- Dữ liệu quản lý lưu qua localStorage và tồn tại khi tải lại trang.

## Giới hạn của prototype

Backend hiện chưa có API đăng ký, đăng nhập hoặc gửi OTP. OTP được hiển thị rõ là **mô phỏng**, không gửi email/SMS. Mật khẩu thử nghiệm được lưu dưới dạng PBKDF2 với salt riêng; phiên chỉ chứa thông tin công khai của tài khoản. Đây vẫn là xác thực trên trình duyệt, không có bảo đảm bảo mật hoặc phân quyền từ server.

Trang manager là bản thử công khai với dữ liệu minh họa dùng chung trên trình duyệt, không phải quyền Club Manager của tài khoản mới đăng ký. Yêu cầu tham gia trung tâm trong onboarding hiện là luồng demo riêng; không đồng bộ với dữ liệu manager. Biểu đồ hiệu suất là số liệu minh họa.

Khi tích hợp Spring Boot, thay adapter `src/services/demoAuth.js` bằng API đăng ký/xác thực OTP/đăng nhập/đăng xuất và lấy phiên từ server. Kiểm tra OTP, giới hạn thử/gửi lại, lưu mật khẩu và RBAC phải được xử lý phía server. Thay `src/services/clubStore.js` bằng API dữ liệu câu lạc bộ có kiểm tra quyền; không dùng tài khoản hay mật khẩu thực trong prototype.

## Kiểm tra

```sh
npm run test
npm run lint
npm run build
```

Test kiểm tra đăng ký chờ OTP, nhiều tài khoản, email trùng, đăng nhập, hết hạn phiên, OTP sai/hết hạn/giới hạn thử, duyệt yêu cầu không trùng dữ liệu, lưu dữ liệu và xuất CSV.

Kiểm tra thủ công: đăng ký → nhập OTP hiển thị → đăng xuất → đăng nhập; thử mã sai và gửi lại; mở manager → thêm/sửa ngựa → duyệt yêu cầu → phân công nhân sự → nhập kết quả đua → tải báo cáo → đổi tên trung tâm → tải lại trang. Kiểm tra sidebar trên màn hình nhỏ.
