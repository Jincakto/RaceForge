# Racehorse Club Management

Frontend React 19 + Vite + Tailwind CSS + Recharts, dùng lại UI cũ trong src/App.tsx.

## Chạy

- npm install
- npm run dev: http://localhost:5173
- npm run build: kiểm tra TypeScript và build production
- npm test: kiểm tra HTTP, phiên đăng nhập, luồng dữ liệu và dịch thuật

Chạy backend bằng cấu hình hiện có. Vite proxy /api tới http://localhost:8080.
Nếu backend ở origin khác, tạo .env theo .env.example, không thêm /api vào VITE_API_BASE_URL.
Đăng nhập bằng tài khoản backend. Không có tài khoản demo, dữ liệu seed dự phòng hoặc lưu localStorage.

## Luồng và phần chờ API

Xem [FRONTEND_FLOW.md](./FRONTEND_FLOW.md) để đối chiếu đủ chín nhóm yêu cầu,
phần đang gọi API thật, phần chỉ dựng UI và lý do phải chờ backend.
Các phần chưa có API được ghi rõ và không báo lưu thành công giả.

Chỉ chủ ngựa được tự đăng ký trên UI. Admin tạo quản lý/thú y/HLV và phân quyền
đã dựng biểu mẫu chờ API; frontend không tự gán quyền Admin cho manager.

## Cấu trúc

- src/App.tsx: UI cũ và điều hướng chính.
- src/api.ts: HTTP, access token trong bộ nhớ và refresh cookie.
- src/backendBridge.ts: chuyển dữ liệu/API hiện có sang model của UI cũ.
- src/pendingUi.tsx: các biểu mẫu chờ API, không lưu dữ liệu cục bộ.
- src/intake.tsx, vetForm.tsx, healthRecords.tsx: tiếp nhận và y tế.
- src/trainingPlans.tsx, trainingRegister.tsx, packages.tsx: lộ trình, lịch và gói.
- src/horseExtras.tsx, admin.tsx: minh chứng, HLV, tài khoản và phân quyền.
- src/data.ts: kiểu dữ liệu và thuật toán gợi ý; seed cũ không được nạp vào ứng dụng.
- src/englishUi.ts + translations.json: lớp dịch của UI cũ.

Kiểm tra trình duyệt tùy chọn: node tests/live-smoke.mjs, cần package playwright
và Chrome/Chromium; có thể cung cấp package bằng NODE_PATH.
Tất cả API trong bài kiểm tra được giả lập. OTP/email, phân quyền và database thật
cần kiểm tra riêng trên backend; không có thay đổi backend trong lần sửa này.
