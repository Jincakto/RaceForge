# Phân công Trainer theo gói

- Hồ sơ ngựa chỉ xem lịch sử Trainer; nút phân công chuyển tới trang Trainer assignments.
- Chỉ hiển thị gói ACTIVE/PAID cho phân công và chỉ chọn Trainer hoạt động có profile.
- Tạo/thay thế gọi /api/trainer-assignments và /api/trainer-assignments/{id}/replace; nhận/từ chối gọi /api/trainer-assignments/{id}/respond.
- Không gọi luồng phân công/nhận việc trực tiếp theo ngựa; không biến phân công trực tiếp thành gói giả.
- Trainer chỉ tải kế hoạch/lịch cho ngựa có phân công theo gói đã ACCEPTED.
- Dữ liệu cũ thiếu Training_Assignment không tự sửa. Cần CM phân công lại theo gói, hoặc xử lý liên kết cũ riêng sau xác nhận.
- Chỉ sửa frontend; không sửa backend hoặc dữ liệu DB.
