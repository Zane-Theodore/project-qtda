# 📊 Code Workflow - Luồng Hoạt Động Của Ứng Dụng

## 🎯 Tổng Quan Lưu Đồ

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER MỞ TRÌNH DUYỆT                              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ doGet() được gọi        │
                    │ (Backend: main.js)      │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────▼────────────────────────────┐
        │ Trả về layout.html - Layout chính của ứng dụng    │
        │ (Nạp tất cả CSS, JS, sidebar, header, footer)     │
        └────────────────────────┬────────────────────────────┘
                                 │
        ┌────────────────────────▼────────────────────────────┐
        │ Frontend nhận mã HTML, kích hoạt JS:               │
        │ - js_utils.html (hàm tiện ích)                     │
        │ - js_router.html (điều hướng trang)                │
        │ - js_auth.html (xử lý đăng nhập/đăng xuất)        │
        │ - js_student.html (xử lý sinh viên)                │
        │ - js_lecturer.html (xử lý giảng viên)              │
        └────────────────────────┬────────────────────────────┘
                                 │
        ┌────────────────────────▼────────────────────────────┐
        │ Kiểm tra session người dùng                        │
        │ - Nếu chưa đăng nhập → Hiển thị trang login       │
        │ - Nếu đã đăng nhập → Hiển thị dashboard            │
        └─────────────────────────────────────────────────────┘
```

---

## 🔍 Chi Tiết Từng Bước

### 1️⃣ **Điểm Bắt Đầu: Hàm `doGet()`**

**File:** `src/backend/main.js`

```javascript
function doGet(e) {
  return HtmlService.createTemplateFromFile('frontend/layout')
      .evaluate()
      .setTitle('Hệ thống Quản lý')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
```

**Mục đích:**
- Đây là điểm **khởi đầu** duy nhất khi bạn truy cập ứng dụng
- Nó tải file `frontend/layout.html` làm bề ngoài chính
- Hàm `createTemplateFromFile()` cho phép sử dụng Google Apps Script template syntax (<?!= ?>)

---

### 2️⃣ **Layout Chính (Template)**

**File:** `src/frontend/layout.html`

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Nạp tất cả CSS -->
  <?!= include('frontend/assets/styles/css_global'); ?>
  <?!= include('frontend/assets/styles/css_layout'); ?>
  <?!= include('frontend/assets/styles/css_login'); ?>
  <?!= include('frontend/assets/styles/css_student'); ?>
  <?!= include('frontend/assets/styles/css_lecturer'); ?>
</head>
<body>
  <div class="app-layout">
    <aside class="layout-sidebar">
      <?!= include('frontend/components/sidebars/sidebar'); ?>
    </aside>

    <div class="layout-right-column">
      <header class="layout-header">
        <?!= include('frontend/components/header'); ?>
      </header>

      <!-- 📌 ĐÂY LÀ NƠI NỘI DUNG ĐỘNG SẼ ĐƯỢC THAY ĐỔI -->
      <main class="layout-main">
        <div id="app-content">
          <!-- Router sẽ thay đổi nội dung tại đây -->
        </div>
      </main>

      <footer class="layout-footer">
        <?!= include('frontend/components/footer'); ?>
      </footer>
    </div>
  </div>

  <!-- Nạp tất cả JavaScript -->
  <?!= include('frontend/assets/scripts/js_utils'); ?>
  <?!= include('frontend/assets/scripts/js_router'); ?>
  <?!= include('frontend/assets/scripts/js_auth'); ?>
  <?!= include('frontend/assets/scripts/js_student'); ?>
  <!-- ... -->
</body>
</html>
```

**Cấu trúc layout:**
- **Sidebar:** Menu chính (cố định bên trái)
- **Header:** Thông tin người dùng (cố định ở trên)
- **Main Content:** Nơi hiển thị các trang (thay đổi động)
- **Footer:** Chân trang (cố định ở dưới)

---

### 3️⃣ **Hàm `include()` - Nạp Các File**

**File:** `src/backend/main.js`

```javascript
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

**Cách dùng trong template:**
```html
<?!= include('frontend/components/header'); ?>
<!-- Nạp file frontend/components/header.html -->
```

**Điểm chú ý:**
- `<?!=` là Google Apps Script template syntax (thực thi và trả về giá trị)
- `<?=` chỉ là để hiển thị biến
- `<?` là để chạy code logic

---

### 4️⃣ **Hệ Thống Routing (SPA - Single Page Application)**

**File:** `src/frontend/assets/scripts/js_router.html`

```javascript
function navigate(viewName, initFunctionName) {
  const contentDiv = document.getElementById('app-content');

  // 1. Kiểm tra cache (nếu đã tải page này trước đó)
  if (window.ViewCache[viewName]) {
    contentDiv.innerHTML = window.ViewCache[viewName];
    // Chạy hàm khởi tạo
    if (initFunctionName && typeof window[initFunctionName] === 'function') {
      window[initFunctionName]();
    }
    return;
  }

  // 2. Nếu chưa cache, hiển thị loading spinner
  contentDiv.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <h3>Đang tải ...</h3>
    </div>
  `;

  // 3. Gọi API Backend để lấy HTML của view
  google.script.run
    .withSuccessHandler(function(htmlContent) {
      // 4. Lưu vào cache
      window.ViewCache[viewName] = htmlContent;
      // 5. Đổ vào DOM
      contentDiv.innerHTML = htmlContent;
      // 6. Chạy hàm khởi tạo (nếu có)
      if (initFunctionName && typeof window[initFunctionName] === 'function') {
        window[initFunctionName]();
      }
    })
    .api_loadView(viewName);
}
```

**Cách sử dụng:**
```javascript
// Điều hướng tới trang hồ sơ sinh viên
navigate('frontend/views/student/view_student_profile', 'initStudentProfile');

// Tham số 1: Đường dẫn file HTML của view
// Tham số 2: Tên hàm JS sẽ được chạy sau khi trang tải xong
```

**Quy trình:**
1. ✅ Kiểm tra cache (để tránh tải lại những trang đã xem)
2. ✅ Hiển thị loading spinner
3. ✅ Gọi API `api_loadView()` từ Backend
4. ✅ Backend trả về mã HTML của view
5. ✅ Lưu vào cache + đổ vào DOM
6. ✅ Chạy hàm khởi tạo (để load dữ liệu từ Database)

---

### 5️⃣ **API Backend - Hàm `api_loadView()`**

**File:** `src/backend/main.js`

```javascript
function api_loadView(viewName) {
  try {
    return HtmlService.createTemplateFromFile(viewName).evaluate().getContent();
  } catch (error) {
    return `<h2>Lỗi 404: Không tìm thấy trang ${viewName}</h2>`;
  }
}
```

**Mục đích:** Gọi từ Frontend qua `google.script.run`, trả về mã HTML của một view

---

### 6️⃣ **Luồng Dữ Liệu: Backend + Database**

#### 📚 **3 Lớp Dữ Liệu:**

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: DATABASE (Google Sheets)                       │
│  - Tất cả dữ liệu được lưu trong Google Sheets         │
│  - Cấu hình trong: src/config/0_Config.js              │
│    DB_ID = 'ID của file Google Sheets'                 │
│    TABLES = { ACCOUNT, STUDENT, LECTURER, ... }        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 2: DATABASE HELPER (db.js)                       │
│  - Hàm truy vấn cơ bản:                                │
│    - db_getAll() : Lấy tất cả dữ liệu                  │
│    - db_findRecordByColumn() : Tìm 1 bản ghi           │
│    - db_insert() : Thêm bản ghi mới                    │
│    - db_update() : Cập nhật bản ghi                    │
│    - db_delete() : Xóa bản ghi                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 3: BUSINESS LOGIC (st_api.js, le_api.js, ...)   │
│  - Các API endpoint cấp cao:                           │
│    - api_st_getStudentById()                           │
│    - api_st_getAllStudents()                           │
│    - api_st_createStudent()                            │
│    - Etc.                                              │
└─────────────────────────────────────────────────────────┘
```

---

### 7️⃣ **Luồng Toàn Bộ: Lấy Dữ Liệu Hồ Sơ Sinh Viên**

**Frontend Code** (`js_student.html`):
```javascript
window.initStudentProfile = function() {
  const currentAccountId = window.currentUserData.id;
  
  // Gọi API từ Backend
  google.script.run
    .withSuccessHandler(function(responseString) {
      const response = JSON.parse(responseString);
      renderProfile(response.data);
    })
    .api_st_getStudentByAccountId(currentAccountId);
};
```

**Backend Code** (`st_api.js`):
```javascript
function api_st_getStudentByAccountId(accountId) {
  try {
    // 1. Lấy dữ liệu sinh viên từ DB
    var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);
    
    // 2. Lấy dữ liệu tài khoản từ DB
    var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", accountId);
    
    // 3. Kết hợp dữ liệu và trả về JSON
    var result = {
      fullName: userInfo.fullName,
      email: userInfo.email,
      studentId: studentInfo.studentId,
      gpa: studentInfo.gpa,
      // ...
    };
    
    return JSON.stringify({ success: true, data: result });
  } catch (error) {
    return JSON.stringify({ success: false, error: error.message });
  }
}
```

**Database Layer** (`db.js`):
```javascript
// Lấy bản ghi từ Google Sheets
function db_findRecordByColumn(tableName, columnName, value) {
  var sheet = _getSheet(tableName);
  var data = sheet.getDataRange().getValues();
  
  // ... tìm kiếm và trả về object
}
```

---

## 📋 Các Hàm Cơ Bản Đã Setup

### **Database Functions** (`src/backend/db.js`)

| Hàm | Mục đích | Ví dụ |
|-----|---------|-------|
| `db_getAll(tableName)` | Lấy tất cả dữ liệu của bảng | `db_getAll(CONFIG.TABLES.STUDENT)` |
| `db_findRecordByColumn(table, col, val)` | Tìm 1 bản ghi theo cột | `db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", "SV001")` |
| `db_getUserByEmail(email)` | Tìm user theo email | `db_getUserByEmail("sv@truong.edu.vn")` |
| `db_insert(table, obj)` | Thêm bản ghi mới | `db_insert(CONFIG.TABLES.STUDENT, {...})` |
| `db_update(table, idCol, idVal, updateObj)` | Cập nhật bản ghi | `db_update(CONFIG.TABLES.STUDENT, "studentId", "SV001", {gpa: 3.5})` |
| `db_delete(table, idCol, idVal)` | Xóa bản ghi | `db_delete(CONFIG.TABLES.STUDENT, "studentId", "SV001")` |

### **Authentication Functions** (`src/backend/auth.js`)

| Hàm | Mục đích |
|-----|---------|
| `verifyLogin(account)` | Kiểm tra email/password, trả về user data |

### **Frontend Utility Functions** (`src/frontend/assets/scripts/js_utils.html`)

| Hàm | Mục đích |
|-----|---------|
| `showNotification(message, type)` | Hiển thị toast notification (success/error/info) |

### **Frontend Router** (`src/frontend/assets/scripts/js_router.html`)

| Hàm | Mục đích |
|-----|---------|
| `navigate(viewName, initFunctionName)` | Điều hướng tới view, cache kết quả, chạy init function |

---

## 🔗 Lưu Ý Quan Trọng

1. **Tất cả dữ liệu đi qua JSON:**
   - Backend trả về dữ liệu dạng `JSON.stringify()`
   - Frontend nhận về và `JSON.parse()`

2. **Cache mechanism:**
   - Các view HTML được cache ở Frontend để tránh tải lại
   - Dữ liệu có thể được cache ở `window.DataCache`

3. **Google Apps Script API:**
   - Frontend gọi Backend qua: `google.script.run.functionName(param).withSuccessHandler(...)`
   - Backend phải là hàm `function functionName(param) {...}`

4. **Template Syntax:**
   - `<?!= %>` : Thực thi code + trả về giá trị
   - `<?= %>` : Hiển thị biến
   - `<? %>` : Chạy code logic (không trả về)

---

## 🎬 Tóm Tắt Luồng Đơn Giản

```
1. User truy cập URL → doGet() được gọi
2. doGet() trả về layout.html (bề ngoài cố định)
3. Frontend JS được nạp và khởi động
4. Kiểm tra session → Nếu chưa login → Điều hướng tới login page
5. User đăng nhập → verifyLogin() xác minh
6. Nếu thành công → Hiển thị Dashboard + Menu sinh viên/giảng viên
7. User click menu → navigate() điều hướng tới view tương ứng
8. Backend gửi HTML → Frontend cache + hiển thị
9. Frontend chạy init function → Gọi API để lấy dữ liệu
10. Backend truy vấn DB → Trả về JSON
11. Frontend render dữ liệu vào view
```

**Next Step:** Tham khảo file `02_FEATURE_ARCHITECTURE.md` để hiểu cách thêm tính năng mới!
