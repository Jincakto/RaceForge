# Lỗi sau khi tạo ngựa: medical trả 401

## Bằng chứng

Log lần thao tác trước khi khởi động lại cho thấy POST /api/horses?ownerId=4 trả 201 CREATED, có INSERT Horse và Audit_Log. SQL xác nhận horse_id=1, owner_id=4, status=INACTIVE, admission_status=NOT_SUBMITTED.
Ngay sau đó GET /api/medical/horses/1/records trả 401 với thông báo Authentication user ID must be numeric. Vì frontend xử lý 401 như lỗi phiên đăng nhập, người dùng thấy lỗi ngay sau khi đã tạo ngựa.

## Nguyên nhân

MedicalRecordController.currentUserId() dùng Integer.valueOf(authentication.getName()). JWT filter tạo principal kiểu AuthenticatedUser; getName() không phải chuỗi ID số của người dùng. ID đúng nằm trong principal.userId().

## Sửa backend lần này (ngoại lệ được note riêng)

File backend/src/main/java/com/raceforge/backend/medical/controller/MedicalRecordController.java, package com.raceforge.backend.medical.controller, method currentUserId(): kiểm tra authentication hợp lệ, principal đúng AuthenticatedUser, userId dương; trả user.userId(). Code cũ giữ bằng comment.
Không sửa API tạo ngựa, không đổi quyền, service nghiệp vụ, schema hoặc dữ liệu DB trong lần sửa này.

Thêm backend/src/test/java/com/raceforge/backend/medical/controller/MedicalPrincipalTest.java: 3 test đạt. Kiểm tra principal JWT có tên không phải số vẫn dùng đúng userId; thiếu authentication bị từ chối; principal dạng chuỗi số tùy ý không được dùng thay JWT principal.

## Người dùng cần làm

Tải lại trang và đăng nhập lại vì request 401 trước đó có thể đã xóa token. Mở danh sách ngựa và kiểm tra ngựa đã tạo; không bấm tạo lại ngay để tránh trùng dữ liệu. Ngựa mới có INACTIVE / NOT_SUBMITTED là trạng thái ban đầu, chưa phải đã được duyệt.

Test controller là test hồi quy với service giả lập, không phải kiểm tra toàn bộ luồng tạo ngựa và medical có đăng nhập từ trình duyệt.