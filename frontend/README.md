# Racehorse Club Management

Frontend độc lập (React 19 + Vite + Tailwind CSS v4 + Recharts), chuyển từ dự án Figma Make.
Các phần phụ thuộc Figma (`.figma/`, plugin trong `vite.config.ts`, placeholder trong `index.html`) đã được loại bỏ.

## Chạy dự án
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build ra thư mục dist/
npm run preview    # xem thử bản build, http://localhost:4173
npm test           # kiểm tra dịch thuật và cập nhật giao diện động
```
Yêu cầu Node.js >= 20.

## Cấu trúc
- `src/App.tsx` – ứng dụng chính, điều hướng theo vai trò
- `src/admin.tsx`, `intake.tsx`, `vetForm.tsx`, `healthRecords.tsx` – tài khoản, tiếp nhận, khám thú y, hồ sơ sức khỏe
- `src/trainingPlans.tsx`, `trainingRegister.tsx`, `trainingLogic.ts`, `packages.tsx` – huấn luyện và gói dịch vụ
- `src/data.ts` – dữ liệu mẫu; `src/ui.tsx` – component dùng chung
- `src/englishUi.ts` + `translations.json` – lớp chuyển giao diện sang tiếng Anh
- `src/imports/` – tài liệu yêu cầu và ảnh tham chiếu

Lớp dịch dùng các cụm từ trong `translations.json`, ưu tiên cụm dài và nhận diện
ranh giới từ Unicode. Nội dung chưa có bản dịch được giữ nguyên để không làm sai
tên riêng, ghi chú y tế hoặc thông báo lỗi. Thêm bản dịch đầy đủ vào từ điển khi
bổ sung giao diện; không thay bằng thông báo chung hoặc xóa dấu. Có thể đặt
`data-ui-translate="off"` trên vùng cần giữ nguyên nội dung.
