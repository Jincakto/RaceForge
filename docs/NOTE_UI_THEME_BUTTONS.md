# Note chỉnh giao diện nút và màu chủ đạo

Chỉ sửa frontend. Không sửa backend, API, dữ liệu hoặc schema DB.

## Chủ đề

Lấy màu từ HomePage.jsx: navy #0f1729 / #1a2844, vàng đồng #c9973b, xanh lá đậm #1a4a3a. Giữ nền nội dung sáng để dễ đọc, header navy và viền vàng; card có đường viền và bóng nhẹ.

## File sửa

- frontend/src/raceforge-theme.css (mới): style nền, nút có viền/bo góc, hover, focus bàn phím, disabled, ô nhập, select/option. Dùng cascade layer để các utility có sẵn tiếp tục hoạt động.
- frontend/src/main.jsx: import theme. Giữ nguyên src/index.css.
- frontend/src/components/layout/AppLayout.jsx: gắn rf-shell, rf-topbar, rf-page-content để thống nhất nền và header.
- frontend/src/components/ui/Button.jsx: nút ghost có viền rõ thay vì border-transparent.
- frontend/src/pages/live/LiveApiForms.jsx: nút submit màu navy, viền vàng.
- frontend/src/components/training/PackagePanel.tsx: đăng ký màu vàng; thanh toán thành công xanh; mô phỏng thất bại đỏ nhạt.
- frontend/src/components/training/AdmissionPanel.tsx: gửi tiếp nhận vàng, duyệt xanh, từ chối đỏ nhạt.
- frontend/src/pages/live/LiveTraining.jsx: bắt đầu xanh, ghi kết quả navy.
- frontend/src/pages/live/LiveRaces.jsx: nút xóa đỏ nhạt.

Không đổi handler, payload, endpoint hoặc điều kiện phân quyền.

## Kiểm tra

TypeScript --noEmit và Vite production build đạt. Đã kiểm tra ảnh render bằng Chrome headless từ các component thật với dữ liệu minh họa; ảnh ở UI_THEME_PREVIEW.png. Đây là kiểm tra hiển thị, không phải E2E có đăng nhập hoặc ghi DB.

Ctrl+F5 để tải lại giao diện tại localhost:5173.