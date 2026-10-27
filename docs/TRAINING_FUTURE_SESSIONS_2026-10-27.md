# Training: future sessions and early warnings — 27/10/2026

## Phạm vi

Đã sửa backend/frontend Training và test liên quan. Không đổi schema, migration, Medical, Auth, thanh toán hoặc endpoint/body Generate. Không commit/push. Giữ nguyên hai file backend/.env.example, backend/.env.txt đang bị xóa và file tatus có từ trước.

## Backend đã sửa

- training/config/TrainingClockConfig.java: cung cấp một Clock theo Asia/Bangkok.
- TrainingRoadmapService.java: lấy một cutoff sau khi khóa/kiểm tra Plan; bỏ qua giờ bắt đầu <= cutoff, giữ ngày Stage gốc. Các buổi tương lai vẫn đi qua nghiệp vụ schedule và validation hiện có. Không còn buổi phù hợp trả lỗi rõ; không đổi Plan/Stage/trạng thái.
- TrainingSessionService.java: API thêm riêng chặn quá khứ/bằng hiện tại. Generate dùng entry point nội bộ với cùng cutoff; Add/Adjust lấy thời gian mới. Thời gian start/stop/completion dùng cùng Clock để không lệch múi giờ trong Training.
- TrainingWorkflowGuard.java: kiểm tra ngày hết hạn dùng Clock Training, không phụ thuộc múi giờ máy chủ.
- Giữ transaction, khóa SQL và kiểm tra chống Generate lại khi Plan đã có Session. Một lỗi trong lần sinh rollback mọi Session của lần đó.

## Frontend đã sửa

- trainingPlans.tsx: cảnh báo khi chỉnh lịch Stage, preview phân biệt Past - skipped/Future, khóa xác nhận khi không còn buổi tương lai. Plan vẫn được lưu. Lỗi Generate nói rõ Plan đã lưu.
- Thêm Edit stages trước khi có Session, khi Plan còn hiệu lực và không bị khóa. Đọc lại Session từ server trước khi mở editor; chỉ PUT stages, giữ mốc Plan gốc, backend kiểm tra quyền/nghiệp vụ lần cuối. Không sửa Stage nếu đã có Session.
- Add/Adjust: lỗi sát ô giờ bắt đầu, kiểm tra lại trước khi gửi; giới hạn theo giao của thời hạn Plan và đăng ký hiện hành nếu dữ liệu đăng ký có trong FE. Stage vẫn xác định theo mốc Plan gốc sau resume.
- useTrainingNow.ts: cập nhật mỗi giây, khi focus và khi đổi visibility; dọn timer/listener khi đóng form.
- trainingSchedule.ts: so thời điểm theo UTC+7 thay vì timezone trình duyệt; bổ sung lọc/cảnh báo lịch tương lai và giữ phaseCode khi đọc Stage dạng snake_case từ API.
- remoteActions.ts: bỏ đối chiếu tuyệt đối danh sách preview. Trước mỗi Generate/Retry đọc Session thật từ server; nếu lần trước đã lưu thì dùng lịch đó và reload, không POST Generate thêm. Nếu không đọc được trạng thái thì không gửi Generate.
- Generate vẫn POST /api/training-plans/{id}/generate-sessions với {"confirmed":true}. Không gửi danh sách Session tới backend.

## Kết quả kiểm thử

- Backend Training: 78 test được xét, 77 qua, 1 bỏ qua, không lỗi. Test bỏ qua là import SQL tổng, chỉ chạy khi có MERGED_TRAINING_SQL.
- DB integration tạo database RaceForgeTrainingTest_<UUID>, chạy trong database riêng rồi xóa ở finally. Không ghi vào database RaceForge hiện tại.
- Đã kiểm tra thực tế transaction rollback, hai request Generate đồng thời chỉ một bộ lịch, không Generate lần hai, trường hợp không còn buổi tương lai giữ Plan/Stage/trạng thái, và mốc Stage sau resume.
- Unit test dùng Clock cố định cho quá khứ/bằng hiện tại/tương lai, cutoff chung và mốc ngày gốc.
- Frontend build: PASS (TypeScript + Vite).
- Frontend Training liên quan: 59/59 PASS (schedule, roadmap UI, purchase eligibility, package builder).
- Full frontend: 149 test, 141 qua, 8 lỗi. Chạy lại HEAD chưa sửa trong thư mục tạm: 143 test, 135 qua, đúng cùng 8 lỗi. Không sửa lan để làm xanh các test này.
- Test UI tự động dùng server rendering và adapter/helper; chưa chạy thao tác bằng trình duyệt thật.

## 8 lỗi frontend có sẵn

1. Admin login loads administration data without calling business APIs.
2. Only admin can create a profile for an activated Trainer.
3. Trainer loads and updates only the profile tied to their own account.
4. Trainer-selected days and start time are sent with each stage duration preserved.
5. Trainer selected intensity reaches all plan stages without a LOW cap.
6. Trainer profile and veterinary protocol screens render native English controls.
7. Creates User before an empty trainer profile using the returned ID.
8. Profile failure reports partial success and retry does not create User again.

Hai test Plan cũ vẫn dùng fixture/contract cũ; đợt này giữ nguyên các test đó và ghi nhận là lỗi baseline, không thay đổi nghiệp vụ tạo Plan để né test.

## Kiểm tra thủ công khi mở ứng dụng

1. Tạo Plan có lịch từ trước hôm nay: thấy cảnh báo nhưng vẫn lưu được.
2. Mở Generate: kiểm tra Past - skipped/Future, giờ UTC+7, rồi xác nhận. Danh sách sau đó là kết quả thật từ server.
3. Plan toàn lịch quá khứ: Confirm generation bị khóa; Edit stages chỉ có trước khi có Session, không tự kéo dài gói.
4. Add/Adjust hôm nay với giờ đã qua: lỗi xuất hiện ngay cạnh ô giờ và nút lưu bị khóa. Đổi sang giờ tương lai để xóa lỗi.
5. Để form mở qua giờ bắt đầu hoặc chuyển tab quay lại: cảnh báo cập nhật. Backend vẫn là nguồn quyết định cuối.
6. Mất phản hồi Generate: Retry đọc lịch server trước, không tạo lại Plan hoặc sinh thêm một bộ lịch.

Clock FE không đồng bộ tuyệt đối đồng hồ server; preview là tham khảo. Không bổ sung API đồng bộ thời gian trong đợt này. Kiểm tra xung đột Trainer trên FE chỉ sử dụng dữ liệu lịch đang tải; không mở rộng backend ngoài phạm vi.
