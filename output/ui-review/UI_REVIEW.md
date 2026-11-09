# Rà soát UI ClubOS

Ngày kiểm tra: 09/11/2026. Kiểm tra bản production local bằng Next.js, Express và Firestore emulator `demo-clubos`. Chỉ dùng tài khoản và dữ liệu mẫu. Không sửa mã nguồn ứng dụng.

Giao diện đã có các luồng cốt lõi của MVP và bố cục responsive. Các điểm cần sửa trước tiên là xử lý xung đột phiên bản, lọc sự kiện sắp diễn ra, hiển thị lỗi Delivery và điều hướng sau đăng xuất. Không thấy lỗi JavaScript trong console ở thời điểm kiểm tra trước các ca cố ý gây lỗi HTTP.

## Phạm vi đã kiểm tra

- Desktop: 1280 × 800 và viewport mặc định 1280 × 720.
- Điện thoại giả lập bằng viewport: 390 × 844; admin kiểm tra thêm ở 320 × 740.
- Tablet: 768 × 1024, kiểm tra Delivery và báo cáo.
- Vai trò: chủ nhiệm, thành viên/ứng viên, đối tác được chia sẻ dự án và quản trị viên.
- Đã xem giao diện sáng/System và tối. Chủ đề tối được giữ sau reload; màu nút và chữ được kiểm tra thêm bằng computed style.
- Chưa kiểm tra thiết bị iOS/Android thật, camera thật, bản triển khai Vercel/Render, tốc độ mạng di động, hoặc bản PDF sau khi in. Các kích thước trên không có nghĩa mọi màn hình đã được thử tại mọi breakpoint.

## UI hiện có

| Nhóm | Nội dung đã có | Mức kiểm tra trong lượt này |
| --- | --- | --- |
| Tài khoản | Đăng nhập, form đăng ký, đăng xuất, menu tài khoản, chọn chủ đề | Đăng nhập/đăng xuất nhiều tài khoản; form đăng ký đối chiếu mã nguồn |
| Explore | Tìm kiếm CLB, danh mục, lọc đang tuyển, CLB của tôi, sự kiện gợi ý, tạo CLB | Xem desktop/mobile và mở trang CLB; chưa gửi form tạo CLB qua UI |
| Trang CLB | About, Events, Membership; mô tả, thông tin ban, chiến dịch và sự kiện | Kiểm tra vai trò thành viên và người ngoài CLB |
| My activity | Hồ sơ ứng tuyển, vé sự kiện, nhiệm vụ và tài liệu các CLB | Đối chiếu cấu trúc UI/mã nguồn; vé được kiểm tra từ Events |
| Overview | Hồ sơ chờ duyệt, sự kiện, nhiệm vụ, điều hướng nhanh | Xem desktop/mobile; tái hiện lỗi sự kiện đã qua |
| Recruitment | Chiến dịch, chỉnh form, xem trước; câu hỏi ngắn/dài/một lựa chọn/nhiều lựa chọn; lọc hồ sơ; phỏng vấn/chấp nhận/từ chối | Gửi hồ sơ tiếng Việt; chuyển Interview rồi Accepted; mở editor và tái hiện xung đột; chưa gửi đủ mọi loại câu hỏi qua UI |
| Members | Tìm kiếm, vai trò, ban, sửa thành viên, xuất CSV | Xem desktop/mobile; đối chiếu quyền hiển thị; chưa kiểm tra nội dung CSV tải về |
| Events | Tạo sự kiện, giới hạn chỗ, đăng ký, QR, sao chép vé, check-in, danh sách tham dự, CSV | Đăng ký qua UI và mở QR thành công; chưa quét camera hoặc tải CSV trong lượt này |
| Tasks | Giao cho CLB/ban/cá nhân, bộ lọc, hạn, ưu tiên, tiến độ, bình luận, lịch sử | Lưu In progress 35% kèm ghi chú thành công |
| Knowledge | Danh sách đường dẫn và form thêm tài liệu | Xem UI; chưa tải file trực tiếp vì ứng dụng chỉ lưu link |
| Handover | Chọn người kế nhiệm, ghi chú, xác nhận, lịch sử | Xem màn hình; chưa gửi bàn giao qua UI trong lượt này; nghiệp vụ đã được bộ test backend kiểm tra ở lượt trước |
| Delivery | Dự án, cam kết, tiêu chí, giao việc liên kết, minh chứng, chia sẻ đối tác, yêu cầu sửa, nghiệm thu, báo cáo | Xem ba vai trò; gửi minh chứng tiếng Việt/link dài; đối tác gửi yêu cầu bổ sung; xem báo cáo; mở form quản lý và chia sẻ |
| Admin | Tìm/lọc tài khoản, tạo tài khoản, gán vai trò, tạo CLB kèm chủ nhiệm, thông tin cấp phát và sao chép ID | Tạo một đối tác mẫu bằng UI; kiểm tra admin desktop/mobile/tối; chưa thử mọi loại gán vai trò qua UI |

## Lỗi đã tái hiện

### UI-01 — P2 — Form không tự phục hồi sau xung đột phiên bản

Mở Edit campaign & form. Dùng một HTTP client local khác sửa chiến dịch để giả lập cán bộ thứ hai. Bấm Save ở form cũ: ứng dụng báo `Campaign changed. Refresh before editing.` Đóng và mở lại editor rồi lưu vẫn lỗi như cũ, vì cache chưa được cập nhật. Trong workspace không có nút Refresh trực tiếp.

Người dùng phải rời workspace, refresh danh mục hoặc tải lại cả trang rồi tìm về màn hình cũ. Cần xử lý HTTP 409 bằng cách tải dữ liệu mới, giải thích xung đột tại form và cho người dùng chọn mở lại phiên bản mới; giữ bản nháp nếu có thể. Nhiệm vụ dùng chung hàm `action`, nên cũng cần kiểm tra đường đi tương tự.

Mã nguồn: `frontend/app/page.js:49`, `frontend/app/page.js:90`.

Ảnh: [Form xung đột](./stale-campaign.jpg).

### UI-02 — P2 — Upcoming events hiển thị cả sự kiện đã qua

Thêm một sự kiện lịch sử ngày 01/10/2026 vào emulator và mở Overview ngày 09/11/2026. Sự kiện cũ xuất hiện ngay dưới Upcoming events, trước sự kiện ngày 16/11/2026. UI lấy hai phần tử đầu danh sách đã sắp tăng dần, không lọc thời gian. Nếu có nhiều sự kiện cũ, sự kiện sắp tới có thể không được hiển thị trong khối này.

Cần lọc `starts_at` theo thời gian hiện tại trước khi lấy hai sự kiện. Khối Coming up trong trang About cũng dùng phần tử đầu danh sách mà chưa lọc.

Mã nguồn: `frontend/app/page.js:78`, `frontend/app/page.js:73`.

Ảnh: [Sự kiện đã qua trong Upcoming events](./upcoming-events.jpg).

### UI-03 — P2 — Lỗi Delivery nằm ngoài vùng người dùng đang xem

Ở màn hình đối tác, cuộn tới form phản hồi và bấm Request revision khi chưa nhập nội dung. Backend từ chối đúng, nhưng lỗi `Explain what needs revision.` được đặt ở đầu khối Delivery; viewport vẫn ở cuối form và không thấy thông báo. Trạng thái này đã được xác minh đồng thời bằng ảnh và cây accessibility.

Cần hiển thị lỗi ngay cạnh form/trường liên quan hoặc đưa focus tới thông báo lỗi. Chỉ dùng `role=alert` chưa giải quyết việc người dùng nhìn bằng mắt không thấy lỗi.

Mã nguồn: `frontend/app/delivery.jsx:49`, `frontend/app/delivery.jsx:58` và form review phía cuối file.

### UI-04 — P2 — Đăng xuất từ Delivery vẫn phát sinh lỗi xác thực

Sign out từ Delivery đưa người dùng về trang đăng nhập nhưng hiện thêm toast `Please sign in again.` Ca này được tái hiện hai lần. `logout()` xóa cookie rồi gọi `go('explore')`; `go()` vẫn dùng trạng thái user cũ để gọi `refresh()` khi rời Delivery. Yêu cầu sau đăng xuất nhận HTTP 401.

Cần bỏ refresh khi đăng xuất và vô hiệu hóa các request cũ. Đây là thông báo sai sau một thao tác đã thành công; đồng thời nên kiểm tra tình huống đăng nhập tài khoản khác ngay sau đó.

Mã nguồn: `frontend/app/page.js:36`, `frontend/app/page.js:41`, `frontend/app/page.js:51`.

### UI-05 — P3 — Reload làm mất màn hình đang xem và thiếu link chia sẻ trực tiếp

Reload khi đang ở Admin trở lại Explore, còn phiên đăng nhập và chủ đề được giữ. Các màn hình chính, CLB và dự án đều dùng state ở URL `/`. Không có đường dẫn riêng để mở ngay chiến dịch/dự án hoặc dùng nút Back của trình duyệt để quay lại màn hình trước trong app.

Cần đưa vị trí điều hướng vào route hoặc query string, gồm CLB, tab và dự án. Điều này cũng giúp thực hiện luồng chia sẻ link chiến dịch.

Mã nguồn: `frontend/app/page.js:26`, `frontend/app/page.js:36`, `frontend/app/delivery.jsx:35`.

### UI-06 — P3 — Tài khoản đối tác demo lại được hiển thị là Student

Trong Admin, `delivery-partner@example.test` mang nhãn Student và có nút Assign club role. Một tài khoản đối tác mới tạo qua UI mang nhãn Partner đúng. Seed Delivery không đặt `platform_role`, khiến tài khoản mẫu được chuẩn hóa thành standard. Điều này làm kịch bản demo lệch với chính sách tài khoản đối tác hiện tại.

Cần cập nhật seed và xử lý các tài khoản demo đã tồn tại. Lưu ý: backend hiện còn cho phép người ngoài CLB với tài khoản standard làm người duyệt dự án; đây là mô hình được code hỗ trợ, nên cần thống nhất rõ với mô hình tài khoản Partner do admin cấp.

Mã nguồn: `backend/src/seed-delivery.js:19` và hàm `publicUser` trong `backend/src/admin.js`.

## Các cải thiện nên làm tiếp

- Chốt giao diện tiếng Việt hoặc song ngữ. UI hiện chủ yếu dùng tiếng Anh, đồng thời ngày tháng xuất hiện theo nhiều dạng khác nhau giữa các khu vực.
- Events mới có tạo và đăng ký; chưa có UI sửa/hủy sự kiện hoặc hủy đăng ký. Knowledge mới có thêm link; chưa có sửa/xóa link. Cần thống nhất phạm vi trước khi mở cho người dùng thật.
- Chưa có UI đổi/quên mật khẩu, chỉnh hồ sơ hoặc lời mời đối tác bằng email/link. Chia sẻ bằng UUID khó dùng và không hiển thị rõ tên người nhận để xác nhận danh tính.
- Danh sách Members ở mobile ẩn cột Committee; nên có cách mở chi tiết hoặc mở rộng dòng để đọc thông tin này.
- Editor chiến dịch và các modal có thể đóng bằng dấu X, Escape hoặc bấm nền mà không cảnh báo bản nháp chưa lưu. Nên có cảnh báo khi đã thay đổi nội dung.
- Sau khi lưu modal thành công, focus rơi về trang thay vì được trả về nút mở hoặc tiêu đề kết quả. Cần hoàn thiện đường đi bàn phím và kiểm tra menu mobile bằng screen reader.
- Giao diện Delivery dùng nhiều khối `details` xếp dọc. Nên tách rõ tổng quan, cam kết, công việc, minh chứng và nghiệm thu khi số lượng dữ liệu tăng. Đây là đề xuất thiết kế, không phải lỗi chức năng.
- Dashboard chưa có số liệu tổng hợp về thành viên, việc quá hạn và cam kết chờ đối tác. Hiện Overview chủ yếu là danh sách và liên kết nhanh.

## Điểm hoạt động tốt trong phạm vi kiểm tra

- Typography và màu sắc khá nhất quán; giao diện sáng/tối đều có token riêng, chủ đề được giữ sau tải lại.
- Workspace chuyển sang menu bên trên mobile; form, bảng thành viên và trang Delivery đã có bố cục co giãn.
- Không thấy tràn ngang ở các màn hình đã đo tại 390px, admin 320px và Delivery 768px; đường dẫn minh chứng dài được xuống dòng.
- Tiếng Việt trong câu trả lời, ghi chú và tên tài khoản hiển thị được.
- UI của đối tác không hiển thị danh sách nhiệm vụ nội bộ; chỉ có thông tin dự án, tiêu chí, minh chứng và phản hồi.
- Phân biệt được task Done, đủ minh chứng và nghiệm thu cam kết; dữ liệu 2/2 minh chứng vẫn có thể ở Revision requested.

## Bằng chứng và giới hạn

- [Admin mobile ở chế độ tối](./admin-mobile-dark.jpg).
- [Báo cáo Delivery ở kích thước tablet](./delivery-tablet.jpg).
- Hai ảnh tái hiện lỗi được dẫn ở UI-01 và UI-02.
- Bộ kiểm tra trước đó đã build frontend thành công và chạy 9/9 test backend với emulator. Không chạy lại bộ test trong lượt UI vì không sửa mã nguồn.
- Lượt này tạo/cập nhật dữ liệu thử nghiệm trong emulator: hồ sơ, đăng ký sự kiện, tiến độ, minh chứng, phản hồi đối tác, một tài khoản mẫu và một sự kiện lịch sử. Không thay đổi dữ liệu production.

Ưu tiên triển khai: UI-01 đến UI-04 trước; sau đó routing/link chia sẻ, seed tài khoản và các cải thiện theo phạm vi thí điểm.
