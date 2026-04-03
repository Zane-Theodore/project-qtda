# 📚 Hướng Dẫn Code - Tài Liệu Phát Triển

Đây là bộ tài liệu toàn diện hướng dẫn kiến trúc, quy tắc và best practices của codebase.

---

## 📖 Danh Sách Các Hướng Dẫn

### 1️⃣ [01_CODE_WORKFLOW.md](01_CODE_WORKFLOW.md) - Luồng Hoạt Động Của Code

**Dành cho:** Ai vừa mới tham gia dự án

**Nội dung:**
- 🎯 Điểm bắt đầu của ứng dụng (`doGet()` function)
- 📊 Lưu đồ toàn bộ workflow
- 🔄 Luồng dữ liệu từ Database → Backend → Frontend
- 📋 Các hàm cơ bản đã được setup
- 🎬 Tóm tắt luồng đơn giản

**Nên đọc trước nhất để hiểu tổng thể cách code hoạt động!**

---

### 2️⃣ [02_FEATURE_ARCHITECTURE.md](02_FEATURE_ARCHITECTURE.md) - Hướng Dẫn Thiết Kế Tính Năng

**Dành cho:** Khi cần thêm tính năng mới

**Nội dung:**
- 🏗️ Từng bước thiết kế feature từ DB → Backend → Frontend
- 🎨 Ví dụ cụ thể: "Tính năng Xem Điểm Lớp"
- 📋 Danh sách các file cần tạo/sửa
- 🔗 Cách kết nối Frontend-Backend
- 🧪 Cách test feature mới

**Làm theo guide này khi implement feature!**

---

### 3️⃣ [03_API_STRUCTURE.md](03_API_STRUCTURE.md) - Quy Tắc Viết API Backend

**Dành cho:** Developer Backend

**Nội dung:**
- 🔌 Cấu trúc file API (domain-driven)
- 📝 Quy tắc đặt tên API (`api_st_*`, `api_le_*`, ...)
- ✨ Template API standard với JSDoc
- 🎯 5 bước viết API: Validation → Query → Processing → Combine → Return
- 🔐 Security best practices
- 🧪 Cách test API

**Đọc trước khi viết bất kỳ API nào!**

---

### 4️⃣ [04_DATABASE_STRUCTURE.md](04_DATABASE_STRUCTURE.md) - Hệ Thống Database

**Dành cho:** Ai làm việc với Database

**Nội dung:**
- 🔧 Cấu hình Database (Google Sheets)
- 📊 Chi tiết từng bảng (Account, Student, Lecturer, Class, ...)
- 🛠️ Các Database Helper Functions:
  - `db_getAll()` : Lấy tất cả
  - `db_findRecordByColumn()` : Tìm 1 bản ghi
  - `db_insert()` : Thêm mới
  - `db_update()` : Cập nhật
  - `db_delete()` : Xóa
- 🔄 Design Patterns (JOIN, Pagination, Hash Map, ...)
- ⚠️ Best practices

**Tham khảo khi query database!**

---

### 5️⃣ [05_FRONTEND_ROUTING.md](05_FRONTEND_ROUTING.md) - Hệ Thống Routing Frontend

**Dành cho:** Developer Frontend

**Nội dung:**
- 🧭 Cơ chế routing SPA (Single Page Application)
- 📱 2 loại cache: View Cache + Data Cache
- 🔌 Hàm `navigate()` - Router chính
- 🎯 Init Functions - Hàm khởi tạo khi view load
- 🌐 Global Data (`window.currentUserData`)
- 📊 Lifecycle một lần điều hướng
- ❌ Common mistakes

**Đọc khi làm Frontend-side routing!**

---

## 🎯 Quick Start Guide

### Tôi mới vào dự án?
**👉 Đọc theo thứ tự:**
1. `01_CODE_WORKFLOW.md` - Hiểu tổng thể
2. `02_FEATURE_ARCHITECTURE.md` - Biết cách thêm feature

### Tôi cần thêm API mới?
**👉 Đọc theo thứ tự:**
1. `03_API_STRUCTURE.md` - Quy tắc viết API
2. `04_DATABASE_STRUCTURE.md` - Cách query DB
3. `02_FEATURE_ARCHITECTURE.md` - Ví dụ toàn bộ

### Tôi cần thêm UI view mới?
**👉 Đọc theo thứ tự:**
1. `05_FRONTEND_ROUTING.md` - Cơ chế routing
2. `02_FEATURE_ARCHITECTURE.md` - Ví dụ tạo view

### Tôi cần optimize database queries?
**👉 Đọc:**
- `04_DATABASE_STRUCTURE.md` - Các patterns
- `03_API_STRUCTURE.md` - Query optimization

---

## 🗂️ Cấu Trúc Folder Documentation

```
src/doc/
├── README.md                      (📍 Bạn đang ở đây)
├── 01_CODE_WORKFLOW.md            (Luồng hoạt động)
├── 02_FEATURE_ARCHITECTURE.md     (Thiết kế feature)
├── 03_API_STRUCTURE.md            (Viết API)
├── 04_DATABASE_STRUCTURE.md       (Dùng Database)
└── 05_FRONTEND_ROUTING.md         (Routing Frontend)
```

---

## 📋 Checklist Dành Cho Dev Mới

- [ ] Đã đọc xong `01_CODE_WORKFLOW.md`?
- [ ] Hiểu được luồng từ Frontend → Backend → Database?
- [ ] Biết hàm `navigate()` hoạt động như thế nào?
- [ ] Biết cách gọi API từ Frontend?
- [ ] Hiểu Database structure (Account, Student, Lecturer)?
- [ ] Biết cách viết API theo quy tắc?
- [ ] Đã clone code và test local chưa?

---

## 📞 Hỏi Đáp Nhanh

### Q: Làm sao để thêm tính năng mới?
**A:** Xem `02_FEATURE_ARCHITECTURE.md` - có ví dụ từng bước

### Q: Quy tắc đặt tên API là gì?
**A:** Xem `03_API_STRUCTURE.md` - phần "Naming Convention"

### Q: N+1 query là gì? Sao phải tránh?
**A:** Xem `04_DATABASE_STRUCTURE.md` - phần "Pattern 1 & 2"

### Q: Tôi làm sao debug khi Frontend không kết nối Backend?
**A:** Xem `05_FRONTEND_ROUTING.md` - phần "Common Mistakes"

### Q: Cache hoạt động như thế nào?
**A:** Xem `05_FRONTEND_ROUTING.md` - phần "Hệ Thống Cache"

---

## 🚀 Deployment Checklist

Trước khi `clasp push`:

- [ ] Tất cả các hàm API có JSDoc comments?
- [ ] Tất cả các API có validation input?
- [ ] Tất cả error được try-catch?
- [ ] Không có console.log() debug statements?
- [ ] CSS responsive (mobile-friendly)?
- [ ] Init functions có error handling?
- [ ] Database queries tối ưu (không N+1)?

---

## 💡 Tips & Tricks

### 🔍 Cách Debug Backend

```javascript
// Trong Google Apps Script Editor
function test() {
  var result = api_st_getStudentById("SV001");
  Logger.log(result);  // Xem output
}
```

### 🔍 Cách Debug Frontend

```javascript
// Trong Browser Console (F12)
console.log(window.currentUserData);  // Xem user hiện tại
console.log(window.DataCache);        // Xem cache
console.log(window.ViewCache);        // Xem cached views
```

### 🔍 Cách Debug API Call

```javascript
// Khi không chắc API chạy đúng không
google.script.run
  .withSuccessHandler(function(result) {
    console.log("API returned:", result);  // ← Xem kết quả
    const parsed = JSON.parse(result);
    console.log("Parsed:", parsed);
  })
  .api_st_getStudentById("SV001");
```

---

## 📞 Support

Nếu có câu hỏi về architecture hoặc design patterns, hãy:

1. Tìm kiếm từ khóa trong các guide
2. Xem ví dụ code trong codebase
3. Hỏi team lead

---

**Happy coding! 🚀**

Last updated: April 3, 2026
