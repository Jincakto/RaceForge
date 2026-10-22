# Sửa frontend cho ngựa mới chưa tiếp nhận

## Kết quả kiểm tra chỉ đọc

Tại thời điểm kiểm tra: ngựa #1 ACTIVE / APPROVED / READY, có Health_Profile #1. Ngựa #2 ACTIVE / NOT_SUBMITTED, health_status NULL, chưa có Health_Profile. Chủ ngựa #2 vẫn là user #4, role HORSE_OWNER.
ACTIVE là trạng thái hoạt động, không phải đã được tiếp nhận. HorseAdmissionService tạo Health_Profile khi Manager duyệt yêu cầu PENDING. Frontend gọi medical trước bước này nên nhận Health profile not found.

## Chỉ sửa frontend

- src/services/loadHorseWorkflow.ts: đọc đúng ngựa trước, chỉ tải medical/lock/profile khi admissionStatus=APPROVED. Các lỗi của ngựa đã được duyệt vẫn báo lỗi; không che lỗi DB hoặc lỗi xác thực.
- src/pages/training/WorkflowWorkspace.tsx: dùng loader chung khi chọn ngựa hoặc tải lại; cập nhật profileId theo ngựa hiện tại; không mở form khám khi chưa duyệt.
- src/components/training/AdmissionPanel.tsx: hiển thị trạng thái tiếp nhận riêng, Owner gửi đúng ID ngựa; Manager duyệt/từ chối yêu cầu PENDING bằng API có sẵn. Sau thay đổi tải lại dữ liệu từ backend.
- tests/admission-workflow.test.js: kiểm tra ACTIVE không thay thế APPROVED; ngựa chưa duyệt không gọi medical; ngựa đã duyệt tải đúng profile; lỗi medical của ngựa đã duyệt không bị bỏ qua.

Không sửa backend, migration hoặc dữ liệu DB. Không tự gửi hoặc tự duyệt ngựa thay người dùng.

## Kiểm tra

TypeScript và build đạt. Bộ test admission-workflow + backend-contract: 16/16 đạt. Đây là test hợp đồng/loader frontend với fetch giả lập, chưa phải E2E thao tác duyệt có ghi DB.

## Cách dùng

Ctrl+F5, đăng nhập Horse Owner. Chọn ngựa #2 trong Medical & Training rồi Gửi ngựa vào trung tâm (hoặc dùng Ngựa của tôi). Đăng nhập Club Manager, mở Duyệt ngựa hoặc chọn ngựa trong Medical & Training, duyệt yêu cầu. Sau đó đăng nhập Veterinarian, tải lại và chọn đúng ngựa #2 để khám ban đầu.
Không cần tạo lại ngựa và không cần chạy SQL để chuyển trạng thái.