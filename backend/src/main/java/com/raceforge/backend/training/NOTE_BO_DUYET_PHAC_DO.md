# Bỏ bước Vet duyệt phác đồ

- Bỏ API quản lý/duyệt training-protocols; không xóa bảng hay dữ liệu cũ.
- Gợi ý lấy từ các giai đoạn theo loại gói trong PackageRoadmapPolicy; không cần Protocol APPROVED.
- Lịch nháp mặc định thứ Hai/Tư/Sáu, 07:00–07:30, LOW; đây là mặc định lập lịch, không phải phác đồ y tế hoặc công thức theo cân nặng. Trainer phải xem, chỉnh và xác nhận.
- Giữ dữ liệu cân nặng/nhịp tim nghỉ trong gợi ý. Giữ điều kiện sức khỏe, khóa tập, phân công, thanh toán, ngày áp dụng gói và tối đa 6 ngày/tuần.
- Khi tạo plan từ gợi ý: kiểm tra quyền và độ mới của snapshot, cho phép Trainer gửi stages đã chỉnh; không gửi thì dùng stages gợi ý.
- Training_Recommendation.protocol_id chuyển NULL: Flyway V11 hoặc script backend/scripts/TRAINING_REMOVE_PROTOCOL_APPROVAL.sql. Không cần chạy cả hai thủ công. Bản tạo DB đầy đủ cũng đã cập nhật.
- Gợi ý cũ dùng protocol cần tạo lại. Không sửa frontend hoặc module ngoài training. Chưa chạy SQL vào DB.
