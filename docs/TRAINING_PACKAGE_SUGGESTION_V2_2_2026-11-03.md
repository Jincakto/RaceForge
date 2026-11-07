# Training Package Recommendation V2.2 — 03/11/2026

## Đường dẫn đã được người dùng xác nhận

`D:\SWP391\RaceForge-premain4-premain\RaceForge-premain4`

Các thay đổi dưới đây đã được ghi trực tiếp vào thư mục này. Không dùng kết quả test từ thư mục RaceForge-premain4 cũ. Bản hiện tại không có metadata .git, không thực hiện commit/push.

Theo yêu cầu người dùng, AGENTS.md ghi rõ: trước những lần sửa tiếp theo phải hỏi và xác nhận project/package directory; không suy đường dẫn từ hội thoại cũ. Trong cùng một task đã được xác nhận thì không hỏi lặp lại.

Bản sao sáu file cũ trước khi sửa:
`C:\Users\HP\AppData\Local\Temp\RaceForge-v22-before-97afafff1e3941dfa779c0cb782376ac`

## Luồng trước/sau

Trước: Owner chọn Package rồi chọn ngựa; wizard dùng purchaseBlockReason phía FE.
Sau: chọn ngựa → Suggestions tự động → xem giáo án → Review → Payment → Receipt. Goal tùy chọn chỉ đổi thứ tự trong cùng nhóm, không thay quyền đăng ký. REVIEW_REQUIRED vẫn chọn được nếu canRegister=true.

Không thêm bảng, không đổi schema hoặc dữ liệu RaceForge hiện tại. Không sửa cơ chế Generate/Add/Adjust/Complete Session, Plan hay thanh toán. Không cộng 15/30 phút theo intensity (R01 để đợt sau). Không khôi phục Recommendation/Protocol cũ.

## Backend: file / class / hàm

Các đường dẫn sau nằm dưới backend/src/main/java/com/raceforge/backend/training/.

| File / class | Hàm | Nội dung |
|---|---|---|
| controller/TrainingPackageSuggestionController.java — mới | suggest() | GET /api/horses/{horseId}/training-package-suggestions, role HORSE_OWNER và validation Goal. |
| service/TrainingPackageEligibilityService.java — mới | evaluate() | Điều kiện đăng ký chỉ đọc, trả canRegister và blockReasons. Gói thường dùng guard cũ; RECOVERY phân nhánh riêng. |
| service/TrainingPackageEligibilityService.java | requireEligible() | POST register gọi lại điều kiện khi đang giữ khóa/transaction. |
| service/TrainingPackageEligibilityService.java | check() | Chỉ chuyển BusinessRuleException thành lý do chặn; lỗi DB vẫn là lỗi kỹ thuật. |
| service/TrainingReadinessService.java — mới | read() | Đọc toàn bộ COMPLETED của đúng ngựa để chu kỳ không bị cắt ở cửa sổ 30 ngày. |
| service/TrainingReadinessService.java | analyze() | Cửa sổ 30 ngày, chu kỳ riêng intensity, tối thiểu 6 buổi/3 tuần, nghỉ quá 30 ngày, Starter, thời lượng thực tế và tải ba khối tuần. |
| service/TrainingReadinessService.java | median() | Trung vị ba giá trị workload. |
| service/PackageDemandProfileService.java — mới | analyze() | Phân tích giáo án Package trên bảy khả năng ngày bắt đầu, tải từng tuần, Starter và cảnh báo tăng tải. Không tạo Session thật. |
| service/PackageDemandProfileService.java | rank(), duration() | Thứ tự LOW/MODERATE/HIGH và phút từ giờ Stage đã lưu. Không phải điểm thể lực. |
| service/TrainingPackageSuggestionService.java — mới | suggest() | Sở hữu ngựa, Clock Bangkok, Package ACTIVE, eligibility, history/workload, Goal, sắp xếp và response. |
| service/TrainingPackageSuggestionService.java | match() | RECOMMENDED/REVIEW_REQUIRED theo Starter hoặc bằng chứng lịch sử và tải khởi đầu. RECOVERY/NOT_ELIGIBLE xử lý trước. |
| service/HorsePackageService.java — sửa | constructor | Bỏ dependency HealthProfile/MedicalRecordRepository đã chuyển sang eligibility. |
| service/HorsePackageService.java | register() | Giữ khóa, ownership, transaction, expiry và tạo HPG; gọi requireEligible(). Ngày xét đăng ký lấy từ trainingClock. |
| service/HorsePackageService.java | isConfirmedInitial() | Bỏ helper cũ, điều kiện chuyển vào evaluate(). |
| service/PackageRoadmapTemplateService.java — sửa | validate(), read() | Read-only/noRollbackFor lỗi cấu hình nghiệp vụ để một Package lỗi không làm hỏng toàn bộ request gợi ý. |
| service/PackageRoadmapTemplateService.java | readWeekdays() — mới | JSON thứ tập sai trả lỗi cấu hình; không nuốt lỗi truy vấn DB. |
| repository/TrainingSessionRepository.java — sửa | findByHorse_HorseIdAndStatusOrderByActualEndAsc() — mới | Đọc lịch sử COMPLETED theo actualEnd. |

Các record response nằm trong service tương ứng: Eligibility Reason/Result, Readiness Profile, Demand Week/Scenario/Profile, Suggestion Suggestion/Response. Chúng không phải JPA entity.

TrainingWorkflowGuard.requireHealthy()/requireRacingEligible() giữ nguyên. Gói thường gọi lại hai hàm đó. RECOVERY không gọi guard bắt buộc unlocked; vẫn yêu cầu NOT_FIT, khóa thật xuất phát từ hồ sơ CONFIRMED, admission/ACTIVE/INITIAL và không có lịch sử gói thường. Không biến CENTER_COVERED thành gói Owner tự thanh toán.

## Frontend: file / hàm

| File | Hàm / phần | Nội dung |
|---|---|---|
| frontend/src/trainingSuggestions.ts — mới | PackageSuggestion, SuggestionResponse, SuggestionStatus | Kiểu response API. |
| trainingSuggestions.ts | usePackageSuggestions() | Tải khi chọn ngựa, loading/error/Retry; bỏ response cũ khi đổi ngựa/đóng wizard. Không coi lỗi mạng là ngựa không đủ điều kiện. |
| trainingSuggestions.ts | sortSuggestions() | Trạng thái trước, Goal trong nhóm, rồi thời hạn/tên/ID. |
| trainingSuggestions.ts | reasonLabels, suggestionReason() | Giải thích mã lý do. |
| frontend/src/trainingRegister.tsx — sửa | STEPS, TrainingRegisterPage() | Horse-first, hiển thị lịch sử, mức đầu/đỉnh, min/max tải tuần đầu, trạng thái và lý do. Package được lấy từ API gợi ý. |
| trainingRegister.tsx | start() | Reset Package/Goal; giữ ngựa nếu mở từ gia hạn. |
| trainingRegister.tsx | next() | Cần ngựa ở bước đầu, cần Package được backend cho mua ở bước Suggestions. |
| trainingRegister.tsx | pay() | Bỏ quyết định Medical riêng tại wizard; giữ API/thao tác thanh toán, hiển thị lỗi POST. |
| trainingRegister.tsx | hành động Refresh suggestions | Quay lại Suggestions, tải điều kiện mới sau lỗi đăng ký. |
| trainingRegister.tsx | useEffect theo horseId | Xóa lựa chọn Package khi đổi ngựa. |
| trainingRegister.tsx | Review | Bỏ số buổi mua giả; vẫn hiển thị gói, ngựa, thời hạn và giá. |

ReceiptView(), leave(), StepBar() được tái sử dụng. purchaseBlockReason() trong trainingLogic.ts giữ vì vẫn có nơi khác dùng; wizard mới không dùng. Không sửa remoteActions.purchasePackage() hoặc API thanh toán.

## Quy ước tính theo Rulebook

- Một evaluatedAt cho toàn bộ request, dùng Clock Asia/Bangkok.
- Cửa sổ: hôm nay và 29 ngày trước, actualEnd không vượt evaluatedAt.
- Tuần hoạt động để xét ba tuần tính thứ Hai–Chủ nhật.
- Mỗi intensity có chu kỳ mới nhất riêng; gap lớn hơn 30 ngày tách chu kỳ. Chu kỳ cần ngày cuối cách ngày đầu ít nhất 30 ngày, 6 buổi đúng mức đó trong cửa sổ gần nhất trên 3 tuần.
- Xét HIGH rồi MODERATE rồi LOW. Đúng 30 ngày nghỉ chưa kích hoạt lý do quá hạn; 31 ngày thì có.
- Ba khối workload là 1–7 / 8–14 / 15–21 ngày trước hôm nay, không phải ba tuần lịch và không tính ngày hôm nay chưa hoàn chỉnh. Khối không tập tính 0. Dùng trung vị số buổi, tổng phút, buổi dài nhất.
- Không thay actual duration thiếu bằng planned duration. COMPLETED sai/thiếu dữ liệu không biến thành Starter và được báo là thiếu bằng chứng.
- Starter: chưa có COMPLETED, BASIC vào LOW, tối đa hai buổi/7 ngày đầu và 30 phút/buổi. Giáo án không đạt thì không ép thành RECOMMENDED.
- Mỗi Package đọc bản giáo án của chính nó; xét cả bảy ngày bắt đầu. Tuần giáo án là khối bảy ngày kể từ ngày đầu Package, khối cuối có thể ngắn.
- Stage cùng cường độ liền nhau gộp đoạn; không tính khoảng nghỉ là ngày duy trì. Tăng intensity phải từng bậc, đoạn trước ít nhất 30 ngày; không tăng nhiều yếu tố intensity/thời lượng/tần suất cùng lần.
- GET không gọi expiry và không lưu audit. Đăng ký ACTIVE đã hết hạn được xét như hết hạn mà không ghi DB; POST register vẫn chạy expiry trong transaction.
- COMPLETED là lịch sử được ghi nhận, không chứng nhận thể lực. Không dùng HRR hoặc điểm 0–100.

## API và mã lý do

Goal tùy chọn: FOUNDATION / IMPROVE_PERFORMANCE / PREPARE_FOR_RACING; Goal sai validation HTTP 400. Kiểm tra sở hữu ngựa tại service; không trả Medical chi tiết.

Response: horseId, goal, ruleVersion=2.2, evaluatedAt, historyWindowDays=30, readiness, implementationLimits, packages. Package có ID/tên/type/thời hạn/giá/mục tiêu, workload, recommendationStatus, canRegister, reasonCodes, blockReasons.

Trạng thái: RECOMMENDED → AVAILABLE → REVIEW_REQUIRED → NOT_ELIGIBLE. AVAILABLE dùng cho RECOVERY hợp lệ. Goal không đẩy REVIEW_REQUIRED lên trên RECOMMENDED.

Eligibility codes: ADMISSION_REQUIRED, HORSE_INACTIVE, PACKAGE_INACTIVE, ROADMAP_CONFIGURATION, INITIAL_EXAM_REQUIRED, EXISTING_PACKAGE, MEDICAL_NOT_AUTHORIZED, RACING_REQUIREMENTS, RECOVERY_LOCK_REQUIRED, RECOVERY_CONFIRMED_LOCK_REQUIRED, RECOVERY_MANAGER_ROUTE.

History/matching codes: INCOMPLETE_HISTORY, INSUFFICIENT_STABLE_HISTORY, REASSESSMENT_NEEDED, ACTUAL_DURATION_MISSING, NO_TRAINING_HISTORY, STARTER_OPTION, ENTRY_INTENSITY_EXCEEDS_HISTORY, ENTRY_WORKLOAD_EXCEEDS_HISTORY, HISTORY_AND_WORKLOAD_MATCH, RECOVERY_SEPARATE_ROUTE.

Roadmap codes: INTENSITY_JUMP, MULTIPLE_LOAD_INCREASES, INTENSITY_PERIOD_TOO_SHORT, STAGE_WITHOUT_SESSIONS, INVALID_STAGE_DURATION, NO_PLANNED_SESSIONS, VARIABLE_ENTRY_INTENSITY, STAGE_OUTSIDE_PACKAGE.

## Tests và giới hạn kiểm tra

Thêm TrainingReadinessServiceTest, PackageDemandProfileServiceTest, TrainingPackageEligibilityServiceTest, TrainingPackageSuggestionServiceTest và frontend/tests/trainingSuggestions.test.mjs.
Cập nhật HorsePackageAdmissionTest và TrainingRoadmapDatabaseTest. Integration dùng database ngẫu nhiên RaceForgeTrainingTest_*; tạo schema/seed và xóa chỉ database tạm trong finally, không ghi vào RaceForge hiện tại.

Frontend build TypeScript/Vite qua. Frontend Training 66/66 test qua. Baseline đúng project trước sửa: 159/167 qua, 8 lỗi. Sau sửa: 166/174 qua, cùng 8 lỗi; không thêm regression. Các lỗi sẵn có liên quan admin load, Trainer profile, fixture Plan và tạo tài khoản Trainer; không sửa ngoài phạm vi.

Backend tại đúng project này: 120 test tổng, 119 qua, 1 bỏ qua; không failure/error. Swagger /v3/api-docs và /swagger-ui/index.html HTTP 200 trên DB tạm, có endpoint suggestion mới. Integration kiểm tra sở hữu/Goal, giáo án thiếu không làm hỏng cả request, rollback, concurrent Generate và Plan/Session hiện có. Test bỏ qua có guard SQL riêng không được bật. Chưa test thao tác thủ công trên trình duyệt. Test hook frontend dùng harness bất đồng bộ, các test UI hiện có dùng SSR.