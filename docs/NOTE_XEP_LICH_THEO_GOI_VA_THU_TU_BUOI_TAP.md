# Xếp lịch theo gói đã đăng ký và thứ tự buổi tập

Ngày sửa: 14/10/2026. Bản được sửa: `D:\SWP391\RaceForge-PreMain3\RaceForge-PreMain3`.

## Kết quả

- Lịch lặp bắt buộc chọn **gói đăng ký của chính ngựa đó**, trạng thái ACTIVE, đã thanh toán PAID và có ngày bắt đầu/kết thúc hợp lệ.
- Hiển thị tên gói, từ ngày nào đến ngày nào, số ngày áp dụng và các ngày tập dự kiến.
- Bỏ nhập số tuần và ngày bắt đầu tùy ý trong form lịch lặp. Backend đọc ngày từ `HORSE_PACKAGE`, không tin khoảng ngày do frontend gửi.
- Chọn thứ bằng checkbox tiếng Việt. Tạo tất cả buổi đúng các thứ đã chọn trong khoảng ngày gói, tính cả hai đầu; không làm tròn khoảng ngày thành số tuần.
- Ví dụ gói 14/10/2026–12/11/2026 có **30 ngày**, chọn Hai/Tư/Sáu tạo **13 buổi**, buổi cuối 11/11. 30 ngày áp dụng không có nghĩa là phải tập 30 buổi.
- Kế hoạch mới trên UI lấy cùng khoảng ngày với gói được chọn. Nếu dùng kế hoạch cũ quá ngắn, backend từ chối và chỉ rõ gói/ngày lỗi. Không tự sửa kế hoạch cũ.
- Một buổi trùng giờ hoặc ngày không hợp lệ: cả lô bị từ chối, không lưu một phần. Sau khi tạo thành công, UI tải lại lịch và chọn buổi đầu tiên vừa tạo.
- Giữ nút **Kết thúc / nhập kết quả** và quy trình nhập nhịp tim, vận tốc. Không thêm thời lượng phút hay tự động kết thúc.

## Thứ tự danh sách buổi tập

Chỉ sắp thứ tự ở frontend, không thay đổi truy vấn hay vị trí buổi trên lịch:

1. Đang tập (`SCHEDULED` có `actualStart`) để dễ hoàn tất.
2. Chưa tập, thời điểm dự kiến từ hiện tại trở đi: gần nhất trước.
3. Lịch đã qua nhưng vẫn chưa tập: ngày gần hiện tại trước.
4. Hoàn tất / bỏ buổi / trạng thái đã kết thúc: ngày gần nhất trước.

Áp dụng cho danh sách ngày đang chọn và “Xem toàn bộ … buổi tập”. Lịch tháng/tuần vẫn đặt buổi đúng ngày giờ.

## File backend đã sửa

Package gốc: `com.raceforge.backend.training`.

| File | Thay đổi |
|---|---|
| `dto/ScheduleRecurringRequest.java` | Bắt buộc `horsePackageId`, `planId`, `activityName`, `daysOfWeek`; bỏ cách tính lịch theo số tuần. DTO cũ giữ bằng comment. |
| `dto/SchedulingPackageResponse.java` | DTO mới chỉ trả mã đăng ký, tên gói, ngày bắt đầu/kết thúc; không trả thông tin thanh toán chi tiết của Owner. |
| `controller/TrainingScheduleController.java` | Thêm GET gói dùng để xếp lịch; yêu cầu HEAD_TRAINER + MANAGE_TRAINING. POST recurring giữ nguyên đường dẫn và quyền. |
| `service/TrainingScheduleService.java` | Đọc gói từ repository có sẵn; kiểm tra ngựa/trạng thái/thanh toán/ngày; sinh lịch theo toàn bộ khoảng ngày đăng ký; giữ kiểm tra khóa tập, kế hoạch, trùng giờ, transaction và saveAll. Thuật toán tuần cũ giữ bằng comment. |

Không sửa Permission, tài khoản, medical, entity, repository hoặc migration/schema DB.

## API mới và hợp đồng đã đổi

GET `/api/training-sessions/horse/{horseId}/scheduling-packages`

- HEAD_TRAINER + MANAGE_TRAINING.
- Trả `data: [{horsePackageId, packageName, startDate, endDate}]`.
- Danh sách rỗng nếu ngựa chưa có gói đủ điều kiện. Gói PENDING/PAUSED/CANCELLED hoặc chưa thanh toán không được dùng tạo lịch lặp.
- API lịch sử gói dành cho Owner giữ nguyên quyền.

POST `/api/training-sessions/recurring`:

```json
{
  "planId": 3,
  "horseId": 7,
  "horsePackageId": 9,
  "activityName": "Tập sức bền",
  "daysOfWeek": ["MONDAY", "WEDNESDAY", "FRIDAY"],
  "sessionTime": "07:00"
}
```

Các ID trên chỉ là ví dụ, dùng ID thực tế do API trả về. Không gửi `durationWeeks`/`startDate` để điều khiển thời gian lịch lặp nữa.

## File frontend đã sửa/thêm

| File | Thay đổi |
|---|---|
| `src/types/api.ts` | DTO gói dùng xếp lịch và hợp đồng recurring mới. |
| `src/services/trainingService.ts` | Thêm `schedulingPackages(horseId)`. |
| `src/pages/live/RecurringPackageSchedule.jsx` | Form riêng: lấy gói từ API, chọn gói/thứ/giờ, xem trước ngày, nhập kế hoạch/hoạt động, báo kết quả hoặc lỗi. |
| `src/utils/packageSchedule.js` | Sinh danh sách xem trước và tính số ngày gói, đồng nhất với khoảng ngày bao gồm hai đầu của backend. |
| `src/pages/live/LiveTraining.jsx` | Gắn form mới, hiển thị tên gói và khoảng ngày, điền ngày kế hoạch, tải lại lịch, sắp buổi theo ưu tiên. Giữ mã cũ đã comment. |
| `src/utils/trainingCalendar.js` | Thêm `sortSessionsForDisplay`; không sửa dữ liệu đầu vào và không đổi cách xếp ô lịch. |

## DB và giới hạn

- **Không chạy ALTER/CREATE/DROP hoặc thêm migration**. Giữ nguyên DB hiện tại.
- Đọc `HORSE_PACKAGE.start_date/end_date`, `status/payment_status`, liên kết `TRAINING_PACKAGE` để lấy tên gói. Dùng khoảng ngày đăng ký thực tế, không tính lại từ thời lượng catalog có thể đã thay đổi hoặc gói đã được gia hạn.
- Ghi các buổi mới vào `Training_Session` như trước; FK `(plan_id,horse_id)` vẫn tham chiếu `Horse_Plan`.
- Không có FK trực tiếp từ buổi tập tới gói đăng ký trong schema hiện tại. `horsePackageId` dùng kiểm tra khi tạo, **không được lưu vào cột mới**. Nhãn “gói đang chọn để tạo lịch” không khẳng định các buổi cũ đều được tạo từ gói đó.
- Rule mới áp dụng cho POST recurring, không thay đổi API xếp một buổi/start/complete. Không tự xóa lịch cũ, tạo lịch lại khi thanh toán, hay tự dời lịch khi gói bị pause.
- Quyền xếp lịch vẫn theo HEAD_TRAINER + MANAGE_TRAINING như trước; không bổ sung quy tắc Trainer phải được phân công riêng cho ngựa.

## Kiểm tra

- `PackageRecurringScheduleTest`: **9/9 đạt**. Bao gồm 30 ngày/tuần cuối chưa đủ, biên ngày, giờ chỉ định, sai ngựa, PAUSED/chưa thanh toán/ngày thiếu, trùng buổi cuối, kế hoạch hẹp, không có thứ phù hợp, validation và lọc gói.
- `PackageScheduleSqlServerIT`: **1/1 đạt**, API qua MockMvc → security/controller/service/JPA → SQL Server thật. Tạo 13 buổi, flush/clear rồi đọc lại bằng JDBC và GET; Owner bị 403; tạo trùng bị 409. Auth principal được cung cấp bởi test, không kiểm tra login hay trình duyệt trong test này.
- Test SQL Server bật riêng bằng `RACEFORGE_SCHEDULE_DB_TEST=true`, tắt Flyway trong test; fixture và buổi tập nằm trong transaction rollback. Có thể có khoảng trống IDENTITY sau rollback, đây là hành vi SQL Server.
- Frontend: **17/17 test đạt** cho logic ngày, hợp đồng API, render, thứ tự danh sách và hồi quy calendar/medical/API; build và TypeScript đều đạt.
- Đọc lại SQL Server sau test: số user/ngựa/gói/kế hoạch/buổi tập mang dấu hiệu fixture thử đều **0**, xác nhận dữ liệu thử không còn lưu trong DB.

## Cách chạy thử

1. Khởi động lại backend trong **PreMain3/backend** bằng `mvn spring-boot:run` để nạp DTO và API mới.
2. Giữ/chạy frontend trong **PreMain3/frontend** bằng `npm run dev`, tải lại trang.
3. Đăng nhập Head Trainer có MANAGE_TRAINING, chọn ngựa, mở “Tạo kế hoạch và xếp lịch”.
4. Chọn gói áp dụng; kiểm tra tên và khoảng ngày. Nếu chưa có gói: Owner đăng ký và thanh toán trước, sau đó bấm tải lại gói.
5. Tạo kế hoạch mới với khoảng ngày đã điền theo gói; mã kế hoạch tự điền sang form lịch.
6. Nhập hoạt động, chọn các thứ, giờ tập, đọc danh sách xem trước rồi tạo. Kiểm tra thông báo số buổi và các ô trên lịch, chuyển tháng để xem phần gói kéo dài sang tháng sau.
7. Danh sách đầy đủ ưu tiên buổi đang/chưa tập trước, lịch đã kết thúc sau.

Tại lần kiểm tra dữ liệu 14/10/2026: ngựa #1 có gói `abcc` ACTIVE/PAID, 14/10–03/11; ngựa #2 có đăng ký PENDING/PENDING và đăng ký CANCELLED/FAILED nên chưa có gói dùng để tạo lịch lặp. Đây là ảnh chụp trạng thái dữ liệu lúc kiểm tra, có thể đổi khi người dùng thao tác.
