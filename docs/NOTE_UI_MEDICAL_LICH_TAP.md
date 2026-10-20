# Sửa hiển thị user/medical và lịch tập tương tác

## Phạm vi

Chỉ frontend PreMain3. Không sửa backend, endpoint, migration hoặc DB. Không thêm thư viện lịch.

## Hiển thị dữ liệu

- pages/live/displayValues.js: nhãn tiếng Việt, tên role/trạng thái, định dạng ngày giờ và đơn vị. Không dịch tùy tiện chẩn đoán hoặc ghi chú do người dùng nhập.
- pages/live/ReadableDetails.jsx: thay JSON thô bằng các field có nhãn, object/array lồng được trình bày thành nhóm. Role hiển thị tên, bỏ roleId; không hiện clinicalExamId/vitalSignId trong nội dung khám.
- pages/live/LiveApiForms.jsx: re-export ReadableDetails mới, giữ renderer cũ bằng comment. Thêm dateDefaults để cập nhật ngày theo lịch mà giữ các trường khác đã nhập.
- pages/live/MedicalRecordDetails.jsx: tách thông tin khám, sinh tồn có đơn vị, bảng lâm sàng, chẩn đoán/chăm sóc, kết luận và metadata.
- pages/live/LiveMedicalReadPanel.jsx: dùng MedicalRecordDetails khi xem hồ sơ hoặc lần khám trước.

## Lịch tập

- utils/trainingCalendar.js: ngày theo lịch địa phương của trình duyệt; tuần bắt đầu thứ Hai; tính ô lịch tháng, chuyển tháng có chặn ngày cuối tháng, nhóm/sắp xếp buổi theo ngày.
- pages/live/TrainingCalendar.jsx: lịch tháng 42 ô và thời khóa biểu tuần có giờ; nút trước/sau, hôm nay, chọn ngày; màu theo trạng thái; bấm buổi mở chi tiết.
- pages/live/LiveTraining.jsx: lịch nằm trước form; mặc định ngày hiện tại; lấy sessions qua GET /api/training-sessions/horse/{horseId}. Bấm ngày lọc agenda; ngày điền sẵn vào form đơn/lặp. Tạo kế hoạch/xếp lịch trong mục mở rộng. Các thao tác start/complete/attendance dùng API cũ và tải lại lịch. Giữ toàn bộ danh sách trong mục mở rộng và giữ code cũ bằng comment.
- main.jsx, calendar-details.css: style responsive cho lịch, bảng lâm sàng và chi tiết. Màn nhỏ có cuộn ngang cho lịch/bảng để không mất cột.

Nhãn Đang tập là hiển thị suy ra từ status=SCHEDULED và actualStart có giá trị; không thêm trạng thái IN_PROGRESS vào backend. Không kéo-thả để đổi lịch vì backend chưa có API đổi thời điểm buổi tập. Xem lịch không ghi thêm dữ liệu DB.

## Kiểm tra

TypeScript và production build đạt. Bộ calendar-details + api-wiring: 11/11 đạt. Kiểm tra tuần giao năm, tháng nhuận, nhiều buổi/ngày, giờ muộn 23:30, role không hiện JSON/ID và medical có bảng/đơn vị. Đã kiểm tra ảnh Chrome headless từ component thật với dữ liệu minh họa; ảnh không chứng minh E2E có đăng nhập/ghi DB.

Bản ôn vấn đáp riêng: ON_VAN_DAP_60_PHUT_PERMISSION_TRAINING.md.

## Cách xem

Ctrl+F5. Người dùng & nhân viên: mở Chi tiết để xem tên role. Medical & Training: mở Chi tiết hồ sơ để xem bố cục mới. Lịch tập & kết quả: chọn ngựa, chuyển Tháng/Tuần, bấm Hôm nay hoặc chọn ngày, bấm một buổi để xem kết quả. Head Trainer mở Tạo kế hoạch và xếp lịch để dùng ngày đã chọn.
Kiểm tra hồi quy toàn bộ frontend sau cùng: 108/108 test đạt, 0 bỏ qua.

## Bổ sung nhận diện lịch lặp

Frontend hiển thị tên hoạt động từ notes trên ô lịch và thẻ buổi tập. Sau khi tạo lịch lặp, form báo số buổi và các ngày đã tạo, thay vì chỉ thông báo chung. Backend vẫn lưu mỗi lần lặp thành một Training_Session; không thêm seriesId hoặc trường phân loại lịch lặp.
Các lần tạo vượt khoảng ngày kế hoạch bị backend từ chối; không phải frontend làm mất buổi. Kiểm tra đọc DB cho thấy kế hoạch #1 từ 14/10/2026 đến 23/10/2026, #2 đến 25/10/2026 tại thời điểm kiểm tra.
Đề xuất thời lượng theo phút đã được người dùng hủy, không sửa backend/DB. Nút Kết thúc / nhập kết quả được giữ. Đã sửa lại comment code cũ để tránh hook ngoài component; test render/calendar 11/11 và build đạt.