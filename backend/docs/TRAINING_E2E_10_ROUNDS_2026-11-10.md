# RaceForge — kết quả E2E Training, 10/11/2026

Source: `D:/SWP391/RaceForge-premain4-premain/RaceForge-premain4`. Database gốc: **RaceForge / SQL Server**. Người dùng đã cho phép ghi dữ liệu thử vào DB gốc.

## Kết quả nghiệm thu

**10/10 lượt nghiệm thu mới, liên tiếp PASS trên bản source cố định**, sau khi sửa lỗi tìm thấy. Không sửa source trong quá trình chạy 10 lượt cuối; đối chiếu SHA-256 của 340 file production cho kết quả không thay đổi.

Trước đó đã chạy đủ 10 bộ luồng rộng trên 10 ngựa độc lập. Tổng hai đợt: **60 buổi Start → Stop → Complete bằng trình duyệt**, **20 lượt Vet khám qua giao diện**, 60 assessment và 600 checklist item mới. Tạo dữ liệu/chuẩn bị và nhiều kiểm tra phân quyền qua HTTP API thật; không phải toàn bộ bước chuẩn bị đều bấm UI.

| Lượt | Ngựa | Gói / ngày | Đăng ký | Plan | Hai buổi nghiệm thu cuối | Hồ sơ Vet cuối | Plan UI cuối | Kết quả |
|---|---|---|---|---|---|---|---|---|
| 1 | HOR-011 | BASIC / 30 | HPG-008 | PLN-007 | SES-221 → SES-222 | MED-078 | 100% | PASS |
| 2 | HOR-012 | PERFORMANCE / 60 | HPG-009 | PLN-008 | SES-223 → SES-224 | MED-079 | 55% | PASS |
| 3 | HOR-013 | RACING / 90 | HPG-010 | PLN-009 | SES-225 → SES-226 | MED-080 | 40% | PASS |
| 4 | HOR-014 | BASIC / 60 | HPG-011 | PLN-010 | SES-227 → SES-228 | MED-081 | 55% | PASS |
| 5 | HOR-015 | PERFORMANCE / 90 | HPG-012 | PLN-011 | SES-229 → SES-230 | MED-082 | 40% | PASS |
| 6 | HOR-016 | RACING / 180 | HPG-013 | PLN-012 | SES-231 → SES-232 | MED-083 | 21% | PASS |
| 7 | HOR-017 | BASIC / 90 | HPG-014 | PLN-013 | SES-233 → SES-234 | MED-084 | 40% | PASS |
| 8 | HOR-018 | PERFORMANCE / 30 | HPG-015 | PLN-014 | SES-235 → SES-236 | MED-085 | 100% | PASS |
| 9 | HOR-019 | RACING / 90 | HPG-016 | PLN-015 | SES-237 → SES-238 | MED-086 | 40% | PASS |
| 10 | HOR-020 | BASIC / 30 | HPG-017 | PLN-016 | SES-239 → SES-240 | MED-087 | 100% | PASS |

## Những luồng đã thực hiện

1. Owner tạo ngựa, gửi ảnh và tài liệu thật lên Supabase; gửi duyệt. Manager phân công Vet; Vet nhận phân công, khám INITIAL, xác nhận; Manager duyệt hồ sơ, kích hoạt ngựa.
2. Tạo gói BASIC/PERFORMANCE/RACING, dùng kỳ hạn phù hợp type từ 30/60/90/180 ngày; Owner đăng ký và xác nhận thanh toán; Manager phân công Trainer; Trainer nhận phân công, tạo Plan và sinh lịch.
3. Trainer Start buổi khác ngày đã xếp, Stop, nhập HR/kết quả và đủ 10 Pass/Concern qua UI. Chưa đủ checklist không lưu được; chỉ có một note tổng tùy chọn.
4. Normal 9/10: gửi Vet thủ công, không tạo pending và không chặn Start. Recommended 6/10: tự thông báo Vet và Manager ACTIVE, pending chặn Start. Urgent 9/10 do Coordination: override đúng dù tổng điểm cao.
5. Đọc chuông không resolve; tạo DRAFT không resolve. Vet xác nhận FIT cho hồ sơ có liên kết đúng mới resolve cảnh báo.
6. NOT_FIT: assessment resolve nhưng Medical Lock vẫn chặn, package PAUSED. Khám FIT sau đó không tự mở khóa; Vet phải mở khóa, Trainer nhận tiếp tục qua UI; số ngày gói còn lại được bảo toàn. Sau đó bắt đầu và hoàn thành buổi mới được.
7. Lượt nghiệm thu cuối trên mỗi ngựa: Concern ở GAIT, 9/10 vẫn Recommended → Start tiếp bị 409 PENDING_POST_TRAINING_REVIEW → Vet mở đúng chuông/session, xem assessment đã lưu, tạo/confirm FOLLOW_UP qua form khám có sẵn → pending hết → Trainer Start và Complete buổi mới.
8. Sai Trainer, Owner, Vet không được phân công bị từ chối theo quyền; Complete lặp bị từ chối; target của notification trả đúng session.
9. Gợi ý theo HR vẫn có increase/maintenance/reduction, chỉ tư vấn; không tự thay lịch hay intensity. Đối chiếu dữ liệu xác nhận scheduledStart/End và intensity giữ nguyên. Thanh tiến độ 10 Plan hiển thị đúng completed / tổng buổi không cancelled.

## Lỗi tìm thấy và đã sửa trong đợt này

- **Refresh đăng nhập gọi đồng thời:** React StrictMode có thể dùng cùng refresh token hai lần, tạo 200 rồi 401 và mất phiên sau reload. Dùng chung request refresh đang chạy cho restore và retry; giữ cơ chế token rotation backend. Đã chạy thêm 10 lần reload Chrome liên tiếp đạt.
- **Vet mất context buổi tập:** click notification trước đây chỉ mark read; form khám không gửi postTrainingSessionId. Thêm mở target đã kiểm tra quyền, xem bản assessment đã lưu, chuyển đúng ngựa/session sang form hiện có; tái dùng DRAFT đúng liên kết, cho thay hồ sơ CANCELLED; giữ luồng khám thường không context. Dọn context khi đăng nhập/chuyển màn hình.
- **Tiến độ Plan bằng 0:** tính từ session thực tế và loại buổi CANCELLED khỏi mẫu số. Cả 10 Plan đã kiểm tra bằng trình duyệt và dữ liệu sau chạy.

8 file production frontend và 2 file test thay đổi trong đợt này:

- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/data.ts`
- `frontend/src/remote.ts`
- `frontend/src/remoteActions.ts`
- `frontend/src/trainingAssessment.ts`
- `frontend/src/TrainingAssessmentNotification.tsx`
- `frontend/src/vetForm.tsx`
- `frontend/tests/passwordSetup.test.mjs`
- `frontend/tests/trainingAssessment.test.mjs`

Không sửa backend production, schema hoặc migration trong **đợt E2E này**. Working tree đã có nhiều thay đổi của các đợt Session/Assessment/Recovery trước đó; không quy các thay đổi cũ thành thay đổi mới. Không tạo package support. Hai bộ snapshot session-back-end-up và session-front-end-up cũ giữ nguyên.

## Bằng chứng kiểm tra

| Kiểm tra | Kết quả thực chạy |
|---|---|
| 10 bộ luồng rộng | PASS cả 10 |
| 10 lượt nghiệm thu liên tiếp, bản cuối | PASS cả 10 |
| SQL read-only đối chiếu đợt rộng | 329/329 PASS |
| SQL read-only đối chiếu cuối | 409/409 PASS |
| Backend unit/controller chọn lọc, 37 suite | 506 PASS, 0 fail/error/skip |
| Frontend focused regression | 142/142 PASS |
| npm run build: TypeScript + Vite | PASS |
| npm test toàn frontend, bản cuối | 242 PASS / 252; 10 FAIL cũ |
| npm test baseline trước sửa E2E | 228 PASS / 238; đúng cùng 10 FAIL |
| Chrome reload sau sửa refresh | 10/10 PASS |
| HTTP của lượt browser nghiệm thu cuối | 5.509 response; 0 lỗi HTTP bất thường sau login |
| Runtime JavaScript trong lượt browser nghiệm thu cuối | 0 exception |
| Hash source trong 10 lượt cuối | 340 file không đổi |

Hai response refresh 401 lúc chưa login là trạng thái đăng xuất dự kiến; đã phân loại riêng, không tính thành lỗi nghiệp vụ. Các request cố ý kiểm tra 403/409 ở harness API cũng được đối chiếu với status mong đợi.

**Toàn bộ frontend test suite chưa xanh.** 10 lỗi có sẵn, tái hiện trên baseline, không sửa/nới test để che lỗi:

- admin login loads administration data without calling business APIs
- all application labels, templates, validation messages and defaults are English at source
- creates User before an empty trainer profile using the returned ID
- only admin can create a profile for an activated Trainer
- owner treats a missing health profile as no examination records, while preserving other errors
- profile failure reports partial success and retry does not create User again
- trainer loads and updates only the profile tied to their own account
- trainer profile and veterinary protocol screens render native English controls
- trainer selected intensity reaches all plan stages without a LOW cap
- trainer-selected days and start time are sent with each stage duration preserved

Log cũ có các lần dò lỗi fixture/harness và các lần tái hiện lỗi thật trước khi sửa; không coi mọi lần chạy đầu tiên đều thành công. Kết quả 10 lần liên tiếp ở trên thuộc acceptance.log trên source cuối cố định.

## Database và phạm vi tích hợp

- Đã backup COPY_ONLY + CHECKSUM và RESTORE VERIFYONLY trước khi ghi dữ liệu thử:
  `C:/Program Files/Microsoft SQL Server/MSSQL15.SQLEXPRESS/MSSQL/Backup/RaceForge_before_e2e10_1794313423528.bak`.
- Dữ liệu thử có nhãn `E2E10 20261110192340`: ngựa HOR-011..HOR-020, catalogue PKG-017..PKG-026, đăng ký HPG-008..HPG-017, Plan PLN-007..PLN-016; giữ lại để xem/demo. Không xóa dữ liệu cũ.
- Kiểm tra cuối: đúng 10 item/assessment; đúng điểm, override, review state, HR, medical linkage; không còn pending, DRAFT chưa confirm, buổi đang tập hoặc Medical Lock đang hoạt động trên 10 ngựa thử; không trùng recipient. Recovery package/type/data vẫn bằng 0.
- Số dòng các đối tượng cũ không đổi: Horse 10; HorsePackage 7; Plan 6; Session 112; MedicalRecord 22; TrainingLock 3; Assessment 27; Item 270; notification linkage 47. Đây là kiểm tra số dòng, không phải phép so sánh từng giá trị của toàn DB.
- Dùng controller/service/transaction thật và **DB RaceForge gốc**; file upload đi Supabase thật. Không thay DB bằng mock.
- **Phản hồi bên ngoài payOS được mô phỏng ở test launcher tạm**, còn API tạo/confirm thanh toán và ghi DB là thật. Chưa kiểm chứng nhà cung cấp payOS thật, webhook thật hoặc tiền thật. Không gửi thanh toán thực.
- Tài khoản fixture có sẵn, không tạo qua email/Google OAuth; không kiểm chứng mail thật. Không chạy load/stress/concurrency production. Các chỉ số khám/HR và thời gian chờ được nhập để kiểm thử chức năng, không chứng minh tính đúng y khoa hoặc đo sinh lý thực tế.

## Tài liệu và log

Bằng chứng đã xuất vào `backend/target/training-e2e-10-rounds-2026-11-10/` (thư mục target có thể bị Maven clean xóa): summary.json, rounds.json, acceptance.log, network/error summary, DB TSV, hash source, regression logs và screenshot. Không xuất password, JWT hoặc fixture.properties. Các script/harness và log dò lỗi gốc còn tại `C:/Users/HP/AppData/Local/Temp/raceforge-e2e10-20261110192340`.

Runner đã thực chạy: node prepare.mjs; node cycles.mjs / suite.mjs; node acceptance.mjs; node progress-final.mjs; bộ JDBC E2EReadOnlyProbe chạy các SELECT kiểm tra; Maven selected test và frontend focused test; npm test; npm run build. Danh sách chính xác 37 suite backend nằm trong backend-unit-summary.json. Không chạy lại toàn bộ Maven integration test có thể tác động DB.

Không commit hoặc push. Kết luận: **luồng Training chính đã đạt các ca kiểm thử và 10 lần nghiệm thu cuối đã nêu**, chưa thể khẳng định toàn hệ thống không còn lỗi hoặc mọi tích hợp bên ngoài đã đạt.

Sau kiểm thử: đã đóng Chrome headless riêng, Java test cổng 8093 và Vite test cổng 5193. Backend gốc 8080 được giữ nguyên; GET /v3/api-docs trả HTTP 200. Dữ liệu E2E10 vẫn giữ để xem lại.
