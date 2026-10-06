# RaceForce frontend — minh/frontend

Giao diện dùng JSX, màu sắc, font, Tailwind, hình ảnh và dữ liệu mẫu từ code tham khảo bạn gửi trong `New folder`. Đợt đầu đã làm trang chủ, đăng nhập, đăng ký/OTP và dashboard quản lý CLB. Đợt này bổ sung giao diện Chủ ngựa, giữ cùng bộ giao diện đó.

## Chạy

```sh
cd frontend
npm ci
npm run dev
```

Tài khoản demo, mật khẩu `123456`:

- `manager@raceforce.vn`: dashboard Quản lý CLB.
- `owner@raceforce.vn`: Chủ ngựa có ngựa và trung tâm mẫu.
- `owner2@raceforce.vn`: Chủ ngựa mới chưa có trung tâm/ngựa.

## Chức năng Chủ ngựa

- Tổng quan và sidebar.
- Ngựa của tôi: ngựa trong trung tâm, ngựa chưa vào trung tâm và trạng thái đăng ký chờ duyệt.
- Tạo hồ sơ: thông tin cơ bản, ảnh, kiểm tra dữ liệu; thêm/xóa lịch sử đua nộp kèm; chọn Head Trainer đang hoạt động trong cùng trung tâm hoặc bỏ qua.
- Gửi ngựa vào trung tâm: yêu cầu chờ duyệt có ngày gửi/hết hạn và chống gửi trùng. Tài khoản chưa tham gia trung tâm chưa gửi được.
- Hồ sơ ngựa: thông tin, sức khỏe, tập luyện, lịch sử đua và giáo án gợi ý; sửa thông tin/ảnh; thêm thành tích. Chủ ngựa không sửa các trường phân quyền, duyệt trung tâm hoặc kết luận sức khỏe.
- Hồ sơ y tế: xem lịch sử khám và đánh giá thể trạng của ngựa sở hữu.
- Hiệu suất: chọn ngựa sở hữu, biểu đồ mẫu cố định và tỷ lệ thắng theo dữ liệu ngựa.
- Kết quả đua: ngựa sở hữu, sắp theo ngày và tổng giải thưởng VND.
- Thông báo theo ngựa sở hữu, xác nhận gửi đăng ký; đánh dấu từng thông báo/tất cả đã đọc.
- Hồ sơ cá nhân: đổi họ tên, cập nhật avatar chữ cái và đăng xuất.

## Phạm vi dữ liệu mẫu

Dữ liệu/tài khoản được ghi cố định trong `src/data.ts`; thao tác chỉ cập nhật trạng thái React của phiên hiện tại. Tải lại trang sẽ trở về dữ liệu ban đầu. Chưa kết nối API, gửi email/SMS hoặc lưu dữ liệu lâu dài. Biểu đồ hiệu suất, OTP và trạng thái chờ duyệt/hết hạn là mô phỏng.

Trang tham gia trung tâm, duyệt yêu cầu của Manager và các vai trò khác chưa nằm trong đợt này. Những mục chưa triển khai hiện thông báo và giữ nguyên trang. Đăng ký tài khoản mới vẫn giữ luồng của đợt trước; dùng tài khoản demo để xem vai trò Chủ ngựa.

## Commit và kiểm tra

Mỗi chức năng có commit riêng. Đăng ký ngựa được tách thành hồ sơ cơ bản, lịch sử đua nộp kèm và chọn huấn luyện viên. Hồ sơ chi tiết tách thành xem các tab, chỉnh sửa hồ sơ và ghi nhận thành tích. Kiểm thử/tài liệu có commit riêng.

```sh
npm run typecheck
npm run test
npm run lint
npm run build
```

Test đối chiếu bốn trang gốc với code tham khảo; kiểm tra luồng tạo → chọn trainer → gửi yêu cầu, dữ liệu theo chủ sở hữu, chống gửi trùng, ngày sai, chỉnh sửa hồ sơ, thông báo và đổi họ tên. Render cả 10 trang Chủ ngựa khi có ngựa và khi không có ngựa.

Chưa kiểm thử tương tác hoặc so sánh ảnh chụp trong trình duyệt. Một số cảnh báo lint có sẵn trong code tham khảo vẫn được giữ nguyên.
