# Đổi nhập mã kế hoạch thành chọn tên kế hoạch

Ngày 14/10/2026. Bản sửa: `D:\SWP391\RaceForge-PreMain3\RaceForge-PreMain3`.

## Hành vi mới

- Cả **Xếp một buổi tập** và **Xếp lịch theo tuần của gói đã đăng ký** dùng dropdown “Kế hoạch huấn luyện”, không bắt người dùng nhớ hoặc nhập `plan_id`.
- Mỗi lựa chọn hiển thị **tên kế hoạch · ngày bắt đầu – ngày kết thúc**. ID vẫn được gửi nội bộ tới API, đúng khóa hiện tại của DB.
- Chỉ lấy các kế hoạch đã liên kết với ngựa đang chọn qua `Horse_Plan`.
- Kế hoạch hoặc liên kết không ACTIVE, hay không bao phủ đủ các ngày tập: lựa chọn bị vô hiệu hóa và ghi lý do.
- Buổi đơn kiểm tra ngày được nhập; lịch tuần kiểm tra tất cả ngày xem trước của gói. Biên ngày bao gồm hai đầu, ngày NULL có nghĩa là không giới hạn phía đó như rule BE hiện có.
- Tự chọn một kế hoạch phù hợp khi tải danh sách. Sau khi tạo kế hoạch mới, tải lại danh sách và ưu tiên chọn kế hoạch vừa tạo nếu phù hợp.
- Chưa có kế hoạch phù hợp: báo cần tạo kế hoạch mới, khóa nút tạo lịch. Không tự kéo dài kế hoạch cũ, không tạo kế hoạch giả trên frontend.
- Có nút “Tải lại kế hoạch”. Lỗi tải danh sách được hiển thị, không được hiểu nhầm là tải thành công nhưng danh sách rỗng.
- Backend vẫn kiểm tra kế hoạch/ngựa/ngày khi tạo lịch; việc vô hiệu hóa ở UI không thay thế validation BE.

## Backend

Thêm API đọc `GET /api/horses/{horseId}/training-plans`, cùng đường dẫn với POST tạo kế hoạch. Giữ điều kiện HEAD_TRAINER + MANAGE_TRAINING đang có ở controller. Không mở quyền đọc kế hoạch này cho Owner.

API trả các trường:

```text
planId, horseId, planName, status, horsePlanStatus, startDate, endDate
```

`status` lấy từ `Training_Plan`, `horsePlanStatus/startDate/endDate` lấy từ `Horse_Plan` của đúng ngựa. Không lấy nhầm ngày từ catalog gói.

Các file dưới `backend/src/main/java/com/raceforge/backend/training/`:

| File | Thay đổi |
|---|---|
| `dto/TrainingPlanOptionResponse.java` | DTO mới cho dropdown. |
| `repository/HorsePlanRepository.java` | Thêm `findById_HorseIdOrderById_PlanIdDesc`, EntityGraph lấy plan để ánh xạ tên/trạng thái. |
| `service/TrainingPlanService.java` | Thêm `getPlansForHorse`, transaction chỉ đọc, kiểm tra ngựa tồn tại và ánh xạ dữ liệu. |
| `controller/TrainingPlanController.java` | Thêm GET danh sách theo ngựa, giữ nguyên POST tạo. |

**Không sửa entity, schema DB, migration, Permission hoặc logic tạo/hoàn tất buổi tập.**

## Frontend

| File dưới `frontend/` | Thay đổi |
|---|---|
| `src/types/api.ts` | Thêm `TrainingPlanOptionDto`. |
| `src/services/planService.ts` | Thêm `plansService.byHorse(horseId)` gọi GET thật. |
| `src/utils/trainingPlanChoice.js` | Kiểm tra trạng thái/khoảng ngày và chọn kế hoạch hợp lệ. |
| `src/pages/live/TrainingPlanSelect.jsx` | Dropdown tên/ngày, lý do lựa chọn không dùng được, thông báo thiếu kế hoạch. |
| `src/pages/live/SingleSessionSchedule.jsx` | Form buổi đơn dùng dropdown, kiểm tra ngày trước khi gửi request. |
| `src/pages/live/RecurringPackageSchedule.jsx` | Thay ô nhập số bằng dropdown, chặn gửi khi không có kế hoạch phù hợp. |
| `src/pages/live/LiveTraining.jsx` | Tải kế hoạch từ DB qua API, tải lại sau tạo, truyền danh sách sang cả hai form. |

## Kiểm tra

- Frontend: **17/17 đạt** trong `plan-selector.test.js`, `package-schedule.test.js`, `api-wiring.test.js`; TypeScript và production build đạt.
- Bao gồm kế hoạch ngắn bị loại, lựa chọn phù hợp/tự chọn kế hoạch mới, trạng thái liên kết, NULL ngày, biên ngày, tên/ngày được hiển thị, cả hai form không còn ô nhập mã số và đúng đường dẫn API.
- Backend: **2/2** test `TrainingPlanOptionsTest` đạt, kiểm tra nguồn ngày/trạng thái của Horse_Plan và ngựa không tồn tại.
- SQL Server: **1/1** `PackageScheduleSqlServerIT` đạt sau mở rộng. GET kế hoạch trả đúng tên/ngày/ngựa; Owner bị 403. Luồng tạo 13 buổi và đọc lại từ SQL Server vẫn đạt; tạo trùng bị 409.
- Test SQL dùng MockMvc với principal test, không phải thao tác trình duyệt hay login thật. Fixture được rollback; không chạy migration hoặc đổi cấu trúc DB.

## Cách dùng

1. Khởi động lại backend PreMain3 để có GET kế hoạch mới; tải lại frontend.
2. Chọn ngựa, mở phần tạo kế hoạch/xếp lịch.
3. Chọn kế hoạch bằng **tên và khoảng ngày**. Với lịch tuần, chọn gói và các thứ trước, kiểm tra những kế hoạch đủ ngày.
4. Nếu tất cả kế hoạch bị vô hiệu hóa: tạo kế hoạch mới theo khoảng ngày của gói. Kế hoạch mới được tự chọn sau khi API lưu thành công.
5. Tạo lịch, xem thông báo và lịch tháng/tuần. Trùng lịch vẫn bị từ chối theo rule đã có.
