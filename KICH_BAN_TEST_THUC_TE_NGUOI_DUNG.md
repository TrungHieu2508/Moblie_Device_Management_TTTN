# 📱 KỊCH BẢN TEST THỰC TẾ TRÊN WEB & ĐIỆN THOẠI ANDROID (DEMO BÁO CÁO)

Bên cạnh 50 Unit Test tự động bằng `pytest` (xem file `HUONG_DAN_CHAY_UNIT_TEST.md`), tài liệu này tổng hợp **12 kịch bản kiểm thử thực tế (End-to-End Demo Scenarios)** mà người dùng hoặc giảng viên chấm bài thường trực tiếp bấm thử trên **Web Dashboard** và **Điện thoại học sinh**.

---

## Nhóm A: Kiểm thử trên Trang Giáo Viên (`/teacher`)

### Kịch bản 1: Đăng nhập tài khoản Giáo viên & Kiểm tra giao diện đầy đủ
1. **Thao tác:** Mở trình duyệt tại `http://localhost:5173`, đăng nhập bằng tài khoản Giáo viên (`TEACHER`).
2. **Kiểm tra:**
   - Thanh menu bên trái hiển thị đầy đủ: **Lớp học & Giám sát**, **Thiết bị học sinh**, **Mã ghi danh (QR)**, **Cảnh báo vi phạm**, **Quản lý Lớp học**, **Bản Đồ 3D**, **Lịch sử buổi học**.
   - Trang chính hiển thị 4 thẻ thống kê (Tổng thiết bị, Đang trực tuyến, Cảnh báo/Vi phạm, Lớp đang Live) và danh sách thẻ thiết bị học sinh trực tiếp.

### Kịch bản 2: Theo dõi Ứng dụng học sinh đang mở theo thời gian thực
1. **Thao tác:** Trên điện thoại học sinh, mở một ứng dụng hợp lệ (ví dụ: *Máy tính*, *Cài đặt*, hoặc *Chrome*).
2. **Kiểm tra:**
   - Trên trang Giáo viên (`/teacher`) hoặc trang Phòng học Live (`/live-classes/:id`), tại thẻ thiết bị của học sinh đó, mục **"Ứng dụng đang mở"** tự động cập nhật tên ứng dụng và Package Name trong vòng 1–2 giây kèm chấm xanh `● LIVE`.

### Kịch bản 3: Xem Màn Hình Trực Tiếp (Live Screen Stream) ngay tại Trang Giáo Viên
1. **Thao tác:**
   - Tại thẻ thiết bị học sinh đang `ONLINE` trên trang Giáo viên (`/teacher`), bấm nút **"Xem Màn Hình"**.
   - *(Nếu là lần đầu tiên sau khi mở máy, bấm "Bắt đầu ngay / Cho phép" trên hộp thoại quay màn hình của điện thoại).*
2. **Kiểm tra:**
   - Cửa sổ **Xem Màn Hình Trực Tiếp** bật lên ngay trên trang Giáo viên, hiển thị mượt mà mọi thao tác vuốt/chạm trên màn hình điện thoại học sinh theo thời gian thực.
   - Bấm nút **"Dừng Xem Màn Hình"** → Luồng phát dừng ngay lập tức.

### Kịch bản 4: Vào Trang Chi Tiết Cụ Thể của 1 Thiết Bị (`/devices/:id`)
1. **Thao tác:** Trên thẻ thiết bị ở trang Giáo viên, bấm nút **"Trang Chi Tiết"** (hoặc bấm vào tên thiết bị).
2. **Kiểm tra:**
   - Chuyển sang trang chi tiết của riêng máy đó (`/devices/:id`).
   - Có đầy đủ: Mô hình 3D Digital Twin (xoay 360 độ), Khung Xem Màn Hình Trực Tiếp (có nút Phóng to toàn màn hình), Biểu đồ Pin/RAM, Bảng nút điều khiển nhanh, và Lịch sử lệnh/Cảnh báo của máy.
   - Phần *"Điều khiển Nâng cao & Hỗ trợ Học tập"* đã được ẩn gọn gàng theo đúng yêu cầu.

---

## Nhóm B: Kiểm thử Điều Khiển Thiết Bị Từ Xa

### Kịch bản 5: Khóa Màn Hình Từ Xa (`LOCK_SCREEN`)
1. **Thao tác:** Trên Web Dashboard (trang Giáo viên hoặc trang Chi tiết thiết bị), bấm nút **"Khóa"** (hoặc **"Khóa Màn Hình"**).
2. **Kiểm tra:**
   - Điện thoại học sinh lập tức bị khóa cứng hoặc bật màn hình khóa đỏ **EduGuardian Lock Screen** đè lên trên mọi ứng dụng.
   - Học sinh bấm nút Home hoặc Back đều không thể thoát ra ngoài.

### Kịch bản 6: Mở Khóa Thiết Bị Từ Xa (`UNLOCK_DEVICE`)
1. **Thao tác:** Trên Web Dashboard, bấm nút **"Mở"** (hoặc **"Mở Khóa Thiết Bị"**).
2. **Kiểm tra:**
   - Màn hình khóa đỏ trên điện thoại học sinh tự động đóng lại, trả thiết bị về trạng thái sử dụng bình thường.

### Kịch bản 7: Gửi Thông Báo Nhắc Nhở Lên Màn Hình (`SHOW_ALERT`)
1. **Thao tác:** Bấm nút **"Nhắc"** (hoặc **"Gửi Thông Báo"**), nhập nội dung: *"Em vui lòng tập trung vào bài giảng!"* rồi bấm **Gửi**.
2. **Kiểm tra:**
   - Điện thoại học sinh bật ngay hộp thoại thông báo toàn màn hình hiển thị đúng lời nhắc của Giáo viên.

### Kịch bản 8: Phát Còi Cảnh Báo (`RING_ALARM`) & Dọn RAM (`CLEAR_BACKGROUND_APPS`)
1. **Thao tác:** Bấm nút **"Còi"** trên thẻ thiết bị.
2. **Kiểm tra:** Điện thoại học sinh phát âm thanh cảnh báo lớn ngay cả khi đang để âm lượng nhỏ.
3. **Thao tác:** Bấm nút **"Dọn RAM & Đóng App Nền"**.
4. **Kiểm tra:** Các tiến trình chạy ngầm trên điện thoại được dọn dẹp và thông báo xác nhận gửi về Web.

---

## Nhóm C: Kiểm thử Tự Động Chặn Ứng Dụng Mạng Xã Hội & Game

### Kịch bản 9: Tự động chặn khi học sinh mở Facebook / TikTok / YouTube / Zalo / Game
1. **Thao tác:** Trên điện thoại học sinh đang kết nối, thử bấm mở **YouTube**, **Facebook**, **TikTok**, **Zalo**, hoặc một **Game** bất kỳ.
2. **Kiểm tra trên Điện thoại:**
   - Chỉ sau ~1 giây, ứng dụng mạng xã hội/giải trí bị đẩy văng ra và màn hình **Cảnh Báo Vi Phạm Nội Quy (AlertActivity)** bật đè lên, không cho phép học sinh tiếp tục sử dụng ứng dụng đó.
3. **Kiểm tra trên Web của Giáo viên:**
   - Trạng thái thiết bị chuyển sang màu cam/đỏ (**CẢNH BÁO / VI PHẠM**).
   - Một bản ghi cảnh báo mới xuất hiện ngay tại mục **Cảnh Báo Vi Phạm Chưa Xử Lý** trên trang Giáo viên.

### Kịch bản 10: Giáo viên xử lý Cảnh báo vi phạm
1. **Thao tác:** Tại mục **Cảnh Báo Vi Phạm Chưa Xử Lý** trên trang Giáo viên, bấm **"Xem màn hình"** để kiểm tra máy học sinh, sau đó bấm **"Đã xử lý"** (hoặc **"Xử lý tất cả"**).
2. **Kiểm tra:** Cảnh báo được chuyển sang trạng thái `RESOLVED` và biến khỏi danh sách tồn đọng.

---

## Nhóm D: Kiểm thử Phòng Học Trực Tiếp (Live Class) & Hàng Loạt (Bulk Actions)

### Kịch bản 11: Mở Phiên Lớp Học Live & Điều Khiển Hàng Loạt Cả Lớp
1. **Thao tác:**
   - Tại trang Giáo viên (`/teacher`), bấm **"Bắt đầu / Lên lịch học"** → Chọn lớp → Bấm **"Bắt đầu ngay"**.
   - Trong giao diện Phòng học Live (`/live-classes/:id`), bấm **"Khóa Tất Cả"** trên thanh Thao Tác Hàng Loạt.
2. **Kiểm tra:**
   - Tất cả thiết bị học sinh đang `ONLINE` trong lớp đồng loạt nhận lệnh khóa màn hình cùng lúc.
   - Bấm **"Mở Khóa Tất Cả"** → Toàn bộ máy trong lớp được mở khóa.

### Kịch bản 12: Tạo Mã Ghi Danh QR cho Học Sinh Mới Quét Vào Lớp
1. **Thao tác:**
   - Giáo viên bấm nút **"Mã Ghi Danh QR"** (`/enrollments`) → Bấm **"Tạo Mã Ghi Danh Mới"** → Chọn Trường, Cơ sở, Lớp học.
   - Bấm biểu tượng **QR Code** để phóng to mã QR lên màn hình máy chiếu.
2. **Kiểm tra:**
   - Học sinh mở app **EduSphere Agent** trên điện thoại → Quét mã QR hoặc nhập mã 6 ký tự → Máy tự động được gán vào đúng lớp học của Giáo viên và chuyển sang trạng thái `ONLINE`.

