# Áp dụng vào dự án

1. Xoá nội dung cũ trong `frontend/src` (giữ `assets/` nếu cần) rồi chép thư mục `src/` của gói này vào.
   Xoá `App.css` cũ nếu không dùng. `index.css` đã chứa Tailwind v4 + theme.
2. `index.html`: script phải trỏ tới `/src/main.jsx` (xem file mẫu).
3. `vite.config.js`: cần plugin `@tailwindcss/vite` (xem file mẫu).
4. Cài thư viện:
   npm i react-router-dom recharts react-is
   npm i -D tailwindcss @tailwindcss/vite
5. Tuỳ chọn: chép `jsconfig.json` (alias `@`, hỗ trợ IntelliSense từ `src/types/index.d.ts`)
   và `.env.example` -> `.env`.
6. `npm run dev`. Tài khoản demo nằm trên trang đăng nhập (mật khẩu 123456).

Không ghi đè `.gitignore`, `.oxlintrc.json`, README, `public/` của bạn.
