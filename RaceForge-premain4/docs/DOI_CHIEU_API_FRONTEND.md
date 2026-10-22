# Đối chiếu endpoint backend với màn hình frontend

Danh sách lấy từ OpenAPI của backend đang chạy. Đây là bản đồ nối UI/API, không phải kết quả E2E cho từng endpoint.

| Method | API | Màn hình / vị trí gọi |
|---|---|---|
| GET | `/api/users/me` | Hồ sơ, tài khoản cơ bản/onboarding, Người dùng & nhân viên |
| PUT | `/api/users/me` | Hồ sơ, tài khoản cơ bản/onboarding, Người dùng & nhân viên |
| PUT | `/api/users/me/password` | Hồ sơ, tài khoản cơ bản/onboarding, Người dùng & nhân viên |
| PUT | `/api/training-sessions/{sessionId}/attendance` | Lịch tập & kết quả: xem lịch, lịch lặp, điểm danh |
| GET | `/api/training-packages/{id}` | Gói huấn luyện |
| PUT | `/api/training-packages/{id}` | Gói huấn luyện |
| PUT | `/api/medical/records/{medicalRecordId}/draft` | Medical & Training: hồ sơ khám và khóa tập |
| GET | `/api/horses/{horseId}` | Danh sách ngựa, tạo/sửa/chi tiết, kích hoạt/ngừng hoạt động |
| PUT | `/api/horses/{horseId}` | Danh sách ngựa, tạo/sửa/chi tiết, kích hoạt/ngừng hoạt động |
| PUT | `/api/horses/{horseId}/trainer` | Chọn trainer / chi tiết trainer / phân công trong hồ sơ ngựa |
| GET | `/api/horses/race-history/{raceHistoryId}` | Lịch sử đua |
| PUT | `/api/horses/race-history/{raceHistoryId}` | Lịch sử đua |
| DELETE | `/api/horses/race-history/{raceHistoryId}` | Lịch sử đua |
| GET | `/api/users/me/registration-request` | Hồ sơ, tài khoản cơ bản/onboarding, Người dùng & nhân viên |
| POST | `/api/users/me/registration-request` | Onboarding / yêu cầu vai trò trong LiveMembership |
| POST | `/api/training-sessions` | Lịch tập & kết quả: buổi đơn, bắt đầu, hoàn tất |
| POST | `/api/training-sessions/recurring` | Lịch tập & kết quả: xem lịch, lịch lặp, điểm danh |
| GET | `/api/training-packages` | Gói huấn luyện |
| POST | `/api/training-packages` | Gói huấn luyện |
| POST | `/api/registration-requests/{id}/reject` | Duyệt thành viên |
| POST | `/api/registration-requests/{id}/approve` | Duyệt thành viên |
| POST | `/api/medical/records` | Medical & Training: hồ sơ khám và khóa tập |
| POST | `/api/medical/records/{medicalRecordId}/confirm` | Medical & Training: hồ sơ khám và khóa tập |
| POST | `/api/medical/horses/{horseId}/training-lock/unlock` | Medical & Training: hồ sơ khám và khóa tập |
| GET | `/api/horses` | Danh sách ngựa, tạo/sửa/chi tiết, kích hoạt/ngừng hoạt động |
| POST | `/api/horses` | Danh sách ngựa, tạo/sửa/chi tiết, kích hoạt/ngừng hoạt động |
| POST | `/api/horses/{horseId}/training-plans` | Lịch tập & kết quả: tạo kế hoạch |
| GET | `/api/horses/{horseId}/race-history` | Lịch sử đua |
| POST | `/api/horses/{horseId}/race-history` | Lịch sử đua |
| POST | `/api/horses/{horseId}/admission` | Hồ sơ ngựa, duyệt ngựa, Medical & Training |
| POST | `/api/horses/{horseId}/admission/reject` | Hồ sơ ngựa, duyệt ngựa, Medical & Training |
| POST | `/api/horses/{horseId}/admission/approve` | Hồ sơ ngựa, duyệt ngựa, Medical & Training |
| POST | `/api/horse-packages/{recoveryId}/resume-original` | Medical & Training: Manager tiếp tục gói gốc |
| POST | `/api/horse-packages/{id}/simulate-recovery-payment` | Medical & Training: Manager duyệt, Owner thanh toán |
| POST | `/api/horse-packages/{id}/simulate-payment` | Medical & Training: đăng ký, lịch sử, mô phỏng thanh toán |
| POST | `/api/horse-packages/register` | Medical & Training: đăng ký, lịch sử, mô phỏng thanh toán |
| POST | `/api/horse-packages/horse/{horseId}/approve-recovery` | Medical & Training: Manager duyệt, Owner thanh toán |
| POST | `/api/auth/verify-email` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/reset-password` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/resend-otp` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/register` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/refresh` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/logout` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/login` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/google` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/google/set-password` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/auth/forgot-password` | Đăng ký/OTP, đăng nhập, Google, quên/đặt lại mật khẩu, profile/logout; refresh tự động |
| POST | `/api/admin/permissions/grant` | Quyền theo vai trò và audit |
| PATCH | `/api/users/{id}/status` | Hồ sơ, tài khoản cơ bản/onboarding, Người dùng & nhân viên |
| PATCH | `/api/training-sessions/{sessionId}/start` | Lịch tập & kết quả: buổi đơn, bắt đầu, hoàn tất |
| PATCH | `/api/training-sessions/{sessionId}/complete` | Lịch tập & kết quả: buổi đơn, bắt đầu, hoàn tất |
| PATCH | `/api/training-packages/{id}/status` | Gói huấn luyện |
| PATCH | `/api/notifications/{id}/read` | Thông báo |
| PATCH | `/api/horses/{horseId}/deactivate` | Danh sách ngựa, tạo/sửa/chi tiết, kích hoạt/ngừng hoạt động |
| PATCH | `/api/horses/{horseId}/activate` | Danh sách ngựa, tạo/sửa/chi tiết, kích hoạt/ngừng hoạt động |
| GET | `/api/users` | Hồ sơ, tài khoản cơ bản/onboarding, Người dùng & nhân viên |
| GET | `/api/users/{id}` | Hồ sơ, tài khoản cơ bản/onboarding, Người dùng & nhân viên |
| GET | `/api/training-sessions/horse/{horseId}` | Lịch tập & kết quả: xem lịch, lịch lặp, điểm danh |
| GET | `/api/training-packages/all` | Gói huấn luyện |
| GET | `/api/trainers` | Chọn trainer / chi tiết trainer / phân công trong hồ sơ ngựa |
| GET | `/api/trainers/{id}` | Chọn trainer / chi tiết trainer / phân công trong hồ sơ ngựa |
| GET | `/api/registration-requests` | Duyệt thành viên |
| GET | `/api/registration-requests/{id}` | Duyệt thành viên |
| GET | `/api/notifications` | Thông báo |
| GET | `/api/notifications/unread-count` | Thông báo |
| GET | `/api/medical/records/{medicalRecordId}` | Medical & Training: hồ sơ khám và khóa tập |
| GET | `/api/medical/horses/{horseId}/training-lock/history` | Medical & Training: hồ sơ khám và khóa tập |
| GET | `/api/medical/horses/{horseId}/records` | Medical & Training: hồ sơ khám và khóa tập |
| GET | `/api/medical/horses/{horseId}/previous-examination` | Medical & Training: hồ sơ khám và khóa tập |
| GET | `/api/horses/{horseId}/health-profile` | Hồ sơ ngựa, duyệt ngựa, Medical & Training |
| GET | `/api/horse-packages/horse/{horseId}` | Medical & Training: đăng ký, lịch sử, mô phỏng thanh toán |
| GET | `/api/health` | Thanh trạng thái kết nối |
| GET | `/api/admin/permissions/{roleName}` | Quyền theo vai trò và audit |
| GET | `/api/admin/permissions/{roleName}/audit-log` | Quyền theo vai trò và audit |
| GET | `/api/admin/permissions/catalog` | Quyền theo vai trò và audit |
| DELETE | `/api/admin/permissions/revoke` | Quyền theo vai trò và audit |

Tổng endpoint: 76.
