# RaceForce — bốn trang giao diện từ code tham khảo

Đợt này thay giao diện cũ bằng bốn trang giữ nguyên JSX, Tailwind class, nội dung, ảnh và bố cục từ code bạn gửi trong `New folder`:

- HomePage: trang chủ.
- LoginPage: đăng nhập.
- RegisterPage: đăng ký và OTP demo.
- ManagerDashboard: tổng quan quản lý CLB, sidebar và biểu đồ.

Mỗi trang có một commit riêng. Cấu hình, dữ liệu và component dùng chung có commit riêng; kết nối App và kiểm thử cũng tách riêng. Những trang còn lại chưa triển khai trên nhánh này. Các nút sidebar dẫn tới trang chưa làm sẽ hiện thông báo và giữ nguyên trang quản lý.

## Chạy

```sh
cd frontend
npm ci
npm run dev
```

Chọn tài khoản demo **Club Manager** tại trang đăng nhập hoặc dùng `manager@raceforce.vn` / `123456` để mở dashboard quản lý. Đăng ký xong OTP sẽ trở về đăng nhập; tài khoản mới và các vai trò khác trở về trang chủ khi đăng nhập vì trang theo vai trò chưa nằm trong phạm vi đợt này.

Dữ liệu và tài khoản mẫu giữ như bản gửi, chỉ dùng trạng thái React trong phiên hiện tại; tải lại trang sẽ đặt lại dữ liệu. OTP là demo, chưa gửi email/SMS hoặc kết nối API backend.

## Kiểm tra

```sh
npm run typecheck
npm run test
npm run lint
npm run build
```

Test đối chiếu mã của bốn trang và component dùng chung với bản gốc, đồng thời render các trang, OTP, sidebar và App phía server. Chưa kiểm tra tương tác hay ảnh chụp trình duyệt. Cảnh báo lint về ref OTP của RegisterPage có sẵn trong bản gốc được giữ nguyên.
