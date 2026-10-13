# Frontend tích hợp Phuc + minh/frontend

Ứng dụng hiện khởi chạy `src/main.jsx` → `App.jsx` → React Router của Phuc. Sidebar, dashboard của 5 vai trò, các trang ngựa, huấn luyện, y tế, chăm sóc và kho giữ giao diện Phuc (cùng nguồn UI tham khảo trong `D:/ky 8/SWP/New folder`). Các service TypeScript, JWT và DTO số của minh/frontend được dùng chung.

## Chạy và kiểm tra

Trong thư mục `frontend`:

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Không đặt API URL: ứng dụng chạy DEMO, hiển thị nhãn trên giao diện. Tài khoản demo nằm ở trang đăng nhập, mật khẩu `123456`. Dữ liệu thay đổi trong phiên trang, tải lại trang sẽ đặt lại. Đăng xuất rồi đổi vai trò trong cùng tab để thử quy trình nhiều vai trò.

Đặt `VITE_API_BASE_URL` trong `.env.local` để chạy API; cũng hỗ trợ `VITE_API_URL` của Phuc, có hoặc không có hậu tố `/api`. Khởi động lại Vite sau đổi biến môi trường. Chế độ API dùng trang `/api-workflow`, đăng nhập thật, không dùng lại dữ liệu demo. Backend authentication/endpoint còn thiếu được ghi trong `BACKEND_CONTRACT.md`.

## Các quy trình đã đồng bộ

1. Chủ ngựa tạo hồ sơ → yêu cầu chờ CM Approval → CM duyệt → ngựa chờ Initial Medical. Chưa tự xác nhận sức khỏe hoặc kích hoạt gói tập.
2. Thú y nhập biểu mẫu Phuc → **Save Draft** → **Confirm** riêng. Bản nháp chưa ảnh hưởng đến ngựa/giáo án; có thể chọn lại bản nháp đã lưu. Chỉnh sửa sau lưu phải Save Draft lại trước Confirm. Bản đã Confirm chỉ đọc.
3. Hiển thị riêng `healthStatus`, `systemNote`, `trainingNote` và Training Lock trong hồ sơ ngựa/y tế. Bản nháp không được dùng cho thuật toán gợi ý tập.
4. Chủ ngựa đăng ký gói → PENDING/PENDING → thanh toán mô phỏng thành công mới ACTIVE/PAID và tạo lịch. Thất bại chuyển CANCELLED/FAILED.
5. Medical đã Confirm có thể khóa tập. CM duyệt Recovery riêng, tạm dừng gói thường và giữ ngày còn lại. Chủ ngựa thanh toán Recovery riêng.
6. Confirm READY vẫn giữ khóa. Thú y **Unlock riêng** có lý do; không tự Resume hoặc kết thúc Recovery.
7. CM **Resume gói gốc** khi READY, đã Unlock, Recovery ACTIVE/PAID, gói gốc PAUSED/PAID và còn ngày. Gói gốc ACTIVE, Recovery COMPLETED; Head Trainer vẫn cần xác nhận lịch tập lại.

Các trang chăm sóc, kho, nhân sự và dashboard của Phuc vẫn được giữ. Mỗi trang tải thành chunk riêng để giảm kích thước tải đầu. Các view TypeScript cũ còn được lưu để kiểm thử hồi quy; entry point chính là React Router JSX của Phuc. Import được ghi rõ đuôi `.jsx` / `.tsx` để tránh chọn nhầm hai component trùng tên.

## Nhánh Git

Lịch sử Phuc được merge vào `minh/frontend`, sau đó sửa và kiểm tra tại nhánh này. Push `minh/frontend` trước; `FE` được cập nhật sau từ nhánh đã kiểm tra. Nhánh FE chứa lịch sử của cả `Phuc` và `minh/frontend`. Không force-push hay viết lại lịch sử hai nhánh nguồn; không thay đổi backend.

Kiểm thử gồm hợp đồng API mock, quy tắc trạng thái, phân quyền chủ ngựa/CM/thú y, route ID số, router/provider thực tế và render trang. Chưa xác nhận bằng thao tác trình duyệt hoặc backend đang chạy.
