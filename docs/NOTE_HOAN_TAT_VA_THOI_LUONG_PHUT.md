# Nút kết thúc buổi tập

Chỉ sửa frontend, không sửa backend hoặc DB. Đã bỏ đề xuất bổ sung thời lượng theo phút theo yêu cầu của người dùng; không triển khai durationMinutes.

## Cách sử dụng

- Buổi chưa bắt đầu: bấm Bắt đầu buổi tập.
- Buổi đã có giờ bắt đầu: bấm Kết thúc / nhập kết quả. Giao diện mở và cuộn đến form kết quả.
- Nhập nhịp tim, vận tốc trung bình và các thông tin tùy chọn; bấm Hoàn tất buổi tập.
- Frontend gọi API complete hiện có. Backend ghi actual_end và chuyển trạng thái COMPLETED theo logic sẵn có.

## File đã sửa trước đó

frontend/src/pages/live/LiveTraining.jsx: nhãn nút rõ hơn, mở/cuộn tới form hoàn tất, nhãn submit Hoàn tất buổi tập.

Không thêm bộ đếm tự động kết thúc, không đổi Training_Plan.duration, không thêm cột hoặc thay đổi API.