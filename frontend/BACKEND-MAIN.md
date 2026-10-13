# Kết nối backend main

Frontend đối chiếu với `origin/main`. Không cần các API mở rộng admission của PreMain3.

- Development mặc định gọi `http://localhost:8080`. Có thể đặt `VITE_API_BASE_URL` trong `.env.local` để đổi máy/cổng. Đặt giá trị rỗng để chạy demo. Restart Vite sau khi đổi biến môi trường. Production phải cấu hình URL khi build.
- Giữ đăng ký, OTP, đăng nhập/Google, refresh/logout, khôi phục mật khẩu, hồ sơ, duyệt vai trò đã yêu cầu lúc đăng ký, nhân sự, phân quyền và thông báo.
- Ngựa: tạo/sửa/xem; quản lý kích hoạt/ngừng hoạt động bằng API activate/deactivate. Đây là trạng thái hoạt động, không thay thế duyệt tiếp nhận hay xác nhận y tế.
- Y tế: dùng records/confirm/training-lock có sẵn. Main không có API lấy hoặc tạo Health Profile; với ngựa chưa có lần khám, cần nhập Profile ID có sẵn trong database. Không suy diễn Profile ID từ Horse ID. Ngựa chưa có Health Profile không thể tạo lần khám qua các API main hiện có.
- Gói tập: quản lý tạo/sửa/bật/tắt; chủ ngựa đăng ký/thanh toán; quản lý duyệt phục hồi và resume qua Medical & Training.
- Giáo án/lịch tập: tạo giáo án theo ngựa; xếp buổi đơn hoặc lặp hàng tuần; bắt đầu, hoàn thành, điểm danh và chỉ số theo DTO main. Các thao tác ghi lịch/giáo án dành cho Head Trainer có MANAGE_TRAINING.
- Kết quả đua: xem/thêm/sửa/xóa qua `/api/horses/.../race-history`.
- Ẩn tiếp nhận/duyệt ngựa, chọn trainer, gửi lại yêu cầu vai trò và danh mục quyền vì main không có các endpoint tương ứng. Phân quyền dùng mã quyền và lịch sử thay đổi từ main. Không hiển thị báo cáo/kho/chăm sóc demo trong chế độ API.

Chạy backend từ nhánh main với database và SMTP đúng cấu hình. Thay đổi frontend không sửa được lỗi khởi động Flyway V8 của một backend PreMain3 đang chạy. Không xóa migration hay sửa lịch sử Flyway để thử kết nối.

Kiểm tra: `npm run build`, `npm run typecheck`, `npm test`. Test transport dùng mock, không xác nhận database, SMTP hoặc phân quyền của backend đang chạy.
