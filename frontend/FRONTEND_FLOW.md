# UI cũ và luồng điều chỉnh

Giao diện chính đã khôi phục về `src/App.tsx`: sidebar, dashboard, danh sách/
chi tiết ngựa, hồ sơ khám, wizard đăng ký gói và wizard lộ trình cũ. Không dùng
giao diện thay thế `src/live`. Không sửa backend, không commit/push.

Theo lựa chọn của người dùng, phần chưa có API chỉ dựng UI và ghi **Chờ API**.
Không tạo bản xem trước lưu cục bộ, không dùng seed làm fallback khi server lỗi.

| Yêu cầu | Đã làm ở frontend | Còn chờ backend |
| --- | --- | --- |
| Đăng ký và nhân sự | Đăng ký công khai chỉ gửi requestedRoleId=5 (chủ ngựa), OTP và login thật; giữ role từ server, không biến manager thành admin. Dựng biểu mẫu Admin tạo nhân sự, nút tạo bị khóa. | Role Admin, API tạo/gửi lời mời nhân sự, đổi mật khẩu lần đầu và phân quyền dành riêng Admin. Quy tắc cấm nhân sự tự đăng ký vẫn cần backend enforce, UI không thể thay đổi bảo mật server. |
| Mô hình ngựa | Payload chỉ chứa trường API hỗ trợ; cân nặng/chiều cao được nhập thật. Bỏ chuồng/ô khỏi form hồ sơ. Giới tính Male/Female, tương ứng đực/cái; dữ liệu Stallion/Mare/Gelding cũ hiển thị theo hai giới tính. UI bảng HLV và lịch sử thể hiện một ngựa/nhiều HLV. | API quan hệ nhiều HLV. API hiện chỉ trả một headTrainerId; không tự tạo thêm HLV hay trạng thái nhận việc. |
| Tìm kiếm, mã, minh chứng, thành tích | Tìm theo tên, mã HRS và microchip nếu có; mã HRS được định dạng từ ID thật backend. Có UI microchip, URL ảnh/file minh chứng, album và biểu mẫu thành tích/giải thưởng. Ảnh đại diện và lịch sử đua dùng API thật. | Lưu/kiểm chứng microchip, upload/lưu minh chứng và album, thành tích/giải thưởng riêng. Các thao tác chưa có API không được lưu. |
| Duyệt và sửa hồ sơ | Tách duyệt hành chính khỏi kết luận khám. Khóa sửa trực tiếp khi đang duyệt/sau duyệt. Dựng yêu cầu sửa gồm trường, giá trị hiện tại/mới, lý do và minh chứng; nút gửi bị khóa. | API yêu cầu sửa và duyệt/từ chối thay đổi, phân công/nhận/từ chối/thay bác sĩ, lịch sử và xác minh định danh. |
| Ngưỡng và nhập chỉ số | Đối chiếu Rutgers FS1262 cho ngựa trưởng thành lúc nghỉ: 37,2–38,3°C, tim 28–48/phút, thở 8–14/phút; hiển thị khoảng và liên kết nguồn. Chặn chữ, số âm, nhịp tim/thở thập phân, dữ liệu ngoài giới hạn kỹ thuật; cảnh báo ngoài khoảng tham chiếu. Không tự phân loại nặng/nhẹ bằng công thức 10% không có nguồn. | Quy tắc đánh giá trong backend không thay đổi; cần thống nhất nguồn/quy tắc khi hoàn thiện API khám. |
| Thứ tự và kết luận khám | Theo khả năng hiện có của BE: hồ sơ → duyệt hành chính/tạo health profile → phân công/nhận ca → khám → bác sĩ kết luận đủ/cần theo dõi/không đủ điều kiện tập. Màn khám hiển thị ngựa thật; nút lưu chờ API phân công, không giả xác nhận đã được giao khám. | API phân công để mở lưu trong luồng yêu cầu mới. Không coi duyệt hành chính là được phép tập. |
| Lịch sử khám | Đọc hồ sơ thật theo ngựa, giữ veterinarianId, tên bác sĩ nếu API được phép trả; nếu không dùng mã bác sĩ. Hiển thị chỉ số, xem chi tiết nhiều hồ sơ, lọc và so sánh. Lần khám trước lấy hồ sơ đã xác nhận; xét ngày khám trước rồi thời điểm tạo. | API chi tiết phân công và danh bạ bác sĩ đầy đủ. Không suy tên bác sĩ từ người đang đăng nhập. |
| Đăng ký gói | Giữ wizard chọn gói → chọn ngựa → xem lại → xác nhận → thanh toán mô phỏng → biên lai. Chỉ chọn ngựa của mình, đã duyệt, có kết luận khám cho phép, không khóa, không có gói hiệu lực. Đăng ký và thanh toán gọi API riêng; hiệu lực lấy startDate/endDate từ server, phân biệt pending/cancelled/active. | Phân công/nhận/thay nhiều HLV và đọc lịch sử gói với quyền quản lý/HLV. Số buổi cố định không có trong API gói hiện tại; không tự đặt hạn mức giả. |
| Lộ trình và sinh buổi | Giữ wizard tình trạng ngựa → mục tiêu → cường độ/lịch → xem trước → xác nhận. Gợi ý là quy tắc frontend để HLV xem xét. Lưu planName/goal/startDate/endDate và ghi chú thật; dùng plan ID server trả. Sinh buổi bằng API recurring với ngày/giờ/nội dung, lưu cự ly/mục tiêu vào nội dung vì BE chưa có trường riêng. Nếu batch lỗi giữa chừng báo số buổi đã lưu và tải lại. | GET danh sách/chi tiết lộ trình, trường cấu trúc cho cự ly/cường độ/mặt sân, phân công và kiểm tra gói đầy đủ theo quyền HLV. |

Nguồn chỉ số: [Rutgers Equine Science Center, FS1262](https://njaes.rutgers.edu/fs1262/).
Khoảng tham chiếu áp dụng lúc nghỉ; trường hợp sau vận động/ngựa non được ghi
rõ cần bác sĩ đánh giá riêng. Các giới hạn nhập liệu kỹ thuật không được mô tả
là ngưỡng chẩn đoán hay giới hạn sinh tồn.

## Chạy và kiểm tra

Chạy backend hiện có, sau đó chạy `npm run dev` trong frontend. `/api` được Vite
proxy tới localhost:8080. Xem `.env.example` nếu dùng origin backend khác.
Đăng nhập bằng tài khoản backend; không có đăng nhập demo hoặc lưu localStorage.

- `npm run build`: TypeScript và build production.
- `npm test`: HTTP client, phiên đăng nhập, nguồn/ngưỡng chỉ số, mapping dữ liệu,
  vai trò và trạng thái thanh toán, cùng kiểm tra dịch thuật sẵn có.
- `node tests/live-smoke.mjs`: cần Playwright/Chrome; kiểm tra UI cũ với toàn bộ
  `/api` được giả lập trong bài test. Không sửa tài khoản/database thật.

OTP/email, quyền server, quy tắc nghiệp vụ và giao dịch với database thật cần
kiểm tra trên môi trường backend đang chạy. Test giả lập không xác nhận các
phần này đã hoạt động end-to-end.
