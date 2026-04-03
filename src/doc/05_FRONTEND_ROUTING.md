# 🧭 Frontend Routing - Hệ Thống Điều Hướng

Hướng dẫn cơ chế routing SPA (Single Page Application) của dự án.

---

## 🎯 Tổng Quan Routing

```
┌─ Người dùng click menu ─────────────────────────┐
│                                                  │
│  navigate('frontend/views/...', 'initFunction')│
│                                                  │
└──────────────────┬───────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ Kiểm tra ViewCache│
         └────┬─────────┬────┘
              │         │
       Có cache│       │Không
              ▼        ▼
        ┌─────────┐  ┌────────────────┐
        │ Render  │  │ Hiển thị loading│
        │ ngay    │  │ gọi API Backend│
        │         │  │ lưu cache      │
        └────┬────┘  └─────┬──────────┘
             │             │
             └──────┬──────┘
                    │
             ┌──────▼──────┐
             │ Render HTML │
             │ Chạy init   │
             │ function    │
             └─────────────┘
```

---

## 📋 Hệ Thống Cache

### Khái Niệm

**Cache** là bộ nhớ tạm lưu các trang đã xem để:
- Tránh tải lại từ Backend
- Tăng tốc độ chuyển trang
- Giảm tải server

### 2 Loại Cache

#### 1️⃣ **View Cache** - Cache HTML

```javascript
// File: js_router.html
window.ViewCache = {};

// Khi load view, lưu vào cache:
window.ViewCache['frontend/views/student/view_student_profile'] = htmlContent;

// Lần tiếp theo, lấy từ cache (faster!)
if (window.ViewCache[viewName]) {
  contentDiv.innerHTML = window.ViewCache[viewName];
}
```

#### 2️⃣ **Data Cache** - Cache Dữ Liệu

```javascript
// File: js_student.html
window.DataCache = window.DataCache || {};

// Lưu dữ liệu hồ sơ
const cacheKey = 'profile_data_' + currentAccountId;
window.DataCache[cacheKey] = response.data;

// Lần sau check cache trước
if (window.DataCache[cacheKey]) {
  renderProfile(window.DataCache[cacheKey]);
  return;  // Không cần gọi API!
}
```

---

## 🔌 Router Function - `navigate()`

**File:** `src/frontend/assets/scripts/js_router.html`

```javascript
/**
 * @description Hàm điều hướng SPA chính
 * @param {string} viewName - Đường dẫn file view (VD: 'frontend/views/student/view_dashboard')
 * @param {string} [initFunctionName] - Tên hàm JS sẽ chạy sau khi view load xong
 */
function navigate(viewName, initFunctionName) {
  const contentDiv = document.getElementById('app-content');

  // 1. KIỂM TRA CACHE
  if (window.ViewCache[viewName]) {
    // View đã được load trước đó
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = window.ViewCache[viewName];
    
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    contentDiv.innerHTML = '';
    contentDiv.appendChild(fragment);
    
    // Chạy hàm khởi tạo (nếu có)
    if (initFunctionName && typeof window[initFunctionName] === 'function') {
      window[initFunctionName](); 
    }
    return;
  }

  // 2. HIỂN THỊ LOADING
  contentDiv.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <h3 style="color: #7f8c8d; margin-top: 20px;">Đang tải ...</h3>
    </div>
  `;

  // 3. GỌI API BACKEND
  google.script.run
    .withSuccessHandler(function(htmlContent) {
      // 4. LƯU VÀO CACHE
      window.ViewCache[viewName] = htmlContent;

      // 5. ĐỔ VÀO DOM
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      contentDiv.innerHTML = '';
      contentDiv.appendChild(fragment);

      // 6. CHẠY HÀM KHỞI TẠO
      if (initFunctionName && typeof window[initFunctionName] === 'function') {
        window[initFunctionName](); 
      } else if (initFunctionName) {
        console.error("LỖI: Không tìm thấy hàm: " + initFunctionName);
      }
    })
    .withFailureHandler(function(error) {
      contentDiv.innerHTML = '<h3 style="color:red">Lỗi tải trang: ' + error.message + '</h3>';
      console.error("Router Error:", error);
    })
    .api_loadView(viewName);
}
```

---

## 🎯 Cách Dùng Router

### Cách 1: Từ Menu Sidebar

**File:** `src/frontend/components/sidebars/sidebar_student.html`

```html
<div class="sidebar-menu-item" onclick="navigate('frontend/views/student/view_student_profile', 'initStudentProfile')">
  <span class="material-symbols-outlined">person</span>
  <span>Hồ Sơ</span>
</div>

<div class="sidebar-menu-item" onclick="navigate('frontend/views/student/view_student_classes', 'initStudentClasses')">
  <span class="material-symbols-outlined">grade</span>
  <span>Lớp Học</span>
</div>
```

**Khi user click:**
1. Gọi `navigate('frontend/views/student/view_student_profile', 'initStudentProfile')`
2. Router kiểm tra cache→ Nếu không có, gọi API Backend
3. Backend trả về HTML
4. Router render HTML
5. Router chạy `initStudentProfile()` function

---

### Cách 2: Từ JavaScript Code

```javascript
// Navigation từ code (VD: sau khi đăng nhập)
function handleLoginSuccess(user) {
  window.currentUserData = user;
  
  if (user.role === 'STUDENT') {
    navigate('frontend/views/student/view_student_profile', 'initStudentProfile');
  } else if (user.role === 'LECTURER') {
    navigate('frontend/views/lecturer/view_lecturer_dashboard', 'initLecturerDashboard');
  }
}
```

---

## 🔧 Init Functions (Hàm Khởi Tạo)

### Mục Đích

Hàm init được chạy **sau khi view HTML được render** để:
- Tải dữ liệu từ Backend
- Setup event listeners
- Format/transform dữ liệu

### Quy Tắc Đặt Tên

```javascript
// ✅ ĐÚNG: init{ViewName}
initStudentProfile()
initStudentClasses()
initLecturerDashboard()

// ❌ SAI: init{viewname} (chữ thường)
initstudentprofile()

// ❌ SAI: load{ViewName}
loadStudentProfile()

// ❌ SAI: render{ViewName}
renderStudentProfile()
```

### Ví Dụ Init Function

```javascript
// File: js_student.html

/**
 * Hàm khởi tạo - được Router gọi tự động khi view tải xong
 */
window.initStudentProfile = function() {
  const currentAccountId = window.currentUserData.id;
  const cacheKey = 'profile_data_' + currentAccountId;
  
  const loadingEl = document.getElementById('profile-loading');
  const contentEl = document.getElementById('profile-content');
  
  // 1. Hiển thị loading
  if (loadingEl) loadingEl.style.display = 'flex';
  if (contentEl) contentEl.style.display = 'none';
  
  // 2. Hàm render dữ liệu
  const renderProfile = (data) => {
    document.getElementById('lbl-fullname').textContent = data.fullName;
    document.getElementById('lbl-email').textContent = data.email;
    document.getElementById('lbl-student-code').textContent = data.studentId;
    document.getElementById('lbl-gpa').textContent = parseFloat(data.gpa).toFixed(2);
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
  };
  
  // 3. Kiểm tra cache
  if (window.DataCache[cacheKey]) {
    renderProfile(window.DataCache[cacheKey]);
    return;
  }
  
  // 4. Gọi API (nếu không có cache)
  google.script.run
    .withSuccessHandler(function(responseString) {
      const response = JSON.parse(responseString);
      if (response.success) {
        window.DataCache[cacheKey] = response.data;
        renderProfile(response.data);
      } else {
        console.error("Lỗi:", response.error);
      }
    })
    .withFailureHandler(function(error) {
      console.error("Lỗi kết nối:", error);
    })
    .api_st_getStudentByAccountId(currentAccountId);
};
```

---

## 📱 Cấu Trúc Một View

```html
<!-- File: src/frontend/views/student/view_student_profile.html -->

<div class="profile-container">
  
  <!-- 1. LOADING STATE -->
  <div id="profile-loading">
    <?!= include('frontend/components/loading_spinner'); ?>
  </div>

  <!-- 2. CONTENT STATE (ẩn ban đầu) -->
  <div id="profile-content" style="display: none;">
    
    <!-- Tiêu đề -->
    <div class="profile-header-card">
      <h1 id="lbl-fullname">...</h1> 
    </div>

    <!-- Nội dung -->
    <div class="profile-grid">
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value" id="lbl-email">...</span>
        </div>
      </div>
    </div>
    
  </div>

</div>
```

**Pattern:**
1. Bất cứ view nào cũng có trạng thái: **loading** vs **content**
2. Ban đầu: loading visible, content hidden
3. Khi init function render dữ liệu: ẩn loading, hiện content

---

## 🌐 Global Data - `window.currentUserData`

Lưu thông tin người dùng hiện tại (toàn cục)

```javascript
// Set sau khi đăng nhập thành công
window.currentUserData = {
  id: 'ACC_001',
  email: 'sv@truong.edu.vn',
  fullName: 'Nguyễn Văn A',
  role: 'STUDENT',
  studentId: 'SV001',  // Nếu là sinh viên
  lecturerId: null      // Nếu là giảng viên
};

// Sử dụng trong init function
window.initStudentProfile = function() {
  const currentAccountId = window.currentUserData.id;
  // ...
};
```

---

## 🎬 Lifecycle Một Lần Điều Hướng

```
User click "View Student"
    ↓
onclick="navigate('frontend/views/student/view_student_profile', 'initStudentProfile')"
    ↓
navigate() function được chạy
    ↓
Kiểm tra ViewCache['frontend/views/student/view_student_profile']
    │
    ├─ Nếu có → Render ngay
    │            Chạy initStudentProfile()
    │            Xong!
    │
    └─ Nếu không → Hiển thị loading spinner
                   │
                   ├─ google.script.run.api_loadView('...')
                   │
                   ├─ Backend xử lý:
                   │   HtmlService.createTemplateFromFile(viewName)
                   │   .evaluate()
                   │   .getContent()
                   │
                   ├─ Frontend nhận HTML
                   │
                   ├─ Lưu vào ViewCache
                   │
                   ├─ Render HTML vào DOM
                   │
                   └─ Chạy initStudentProfile()
                      │
                      ├─ Ẩn loading spinner
                      │
                      ├─ google.script.run.api_st_getStudentByAccountId(...)
                      │
                      ├─ Backend query Database
                      │
                      ├─ Frontend nhận JSON
                      │
                      ├─ Lưu vào DataCache
                      │
                      └─ Render dữ liệu vào HTML
                         └─ User thấy kết quả!
```

---

## 🔄 Quản Lý State

### View State (HTML + CSS)

```html
<!-- View state được quản lý bằng style display -->
<div id="loading" style="display: flex;"><!-- Hiện --></div>
<div id="content" style="display: none;"><!-- Ẩn --></div>

<script>
function toggleView() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
}
</script>
```

### Data State (JavaScript Objects)

```javascript
// Global cache
window.DataCache = {
  'profile_data_ACC_001': { fullName: 'Nguyễn Văn A', ... },
  'classes_data_SV001': [{ classId: 'CLS001', ... }, ...],
  ...
};

// Kiểm tra cache trước khi query
if (window.DataCache[key]) {
  data = window.DataCache[key];  // Lấy từ cache
} else {
  // Gọi API lấy data
}
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Quên truyền init function

```javascript
// SAI
navigate('frontend/views/student/view_student_profile');
// Hình ảnh sẽ load nhưng dữ liệu sẽ không được tải

// ĐÚNG
navigate('frontend/views/student/view_student_profile', 'initStudentProfile');
```

---

### ❌ Mistake 2: Init function không tồn tại

```javascript
// File: js_student.html
// QUÊN ĐỊNH NGHĨA hàm này!
window.initStudentProfile = function() { ... };

// Frontend gọi:
navigate('...', 'initStudentProfile');
// → console.error("Không tìm thấy hàm: initStudentProfile")
```

---

### ❌ Mistake 3: Lấy element sai ID

```html
<!-- View HTML -->
<div id="profile-loading">...</div>
<div id="profile-content">...</div>

<script>
// Init function - SAI
window.initStudentProfile = function() {
  const loading = document.getElementById('loading');  // ❌ ID sai!
  const content = document.getElementById('content');   // ❌ ID sai!
};

// ĐÚNG
window.initStudentProfile = function() {
  const loading = document.getElementById('profile-loading');
  const content = document.getElementById('profile-content');
};
</script>
```

---

### ❌ Mistake 4: Không handle error từ API

```javascript
// ❌ SAI
google.script.run
  .withSuccessHandler(function(result) {
    const data = JSON.parse(result);
    renderProfile(data.data);  // Crash nếu không có data!
  })
  .api_getProfile(id);

// ✅ ĐÚNG
google.script.run
  .withSuccessHandler(function(result) {
    const response = JSON.parse(result);
    if (response.success) {
      renderProfile(response.data);
    } else {
      showNotification('Lỗi: ' + response.error, 'error');
    }
  })
  .withFailureHandler(function(error) {
    showNotification('Lỗi kết nối: ' + error.message, 'error');
  })
  .api_getProfile(id);
```

---

## 📊 Router + Init Function Examples

### Example 1: Student Profile

```javascript
// HTML: view_student_profile.html
// Id: profile-loading, profile-content

// Init function:
window.initStudentProfile = function() {
  const accountId = window.currentUserData.id;
  google.script.run
    .withSuccessHandler(function(result) {
      const resp = JSON.parse(result);
      if (resp.success) {
        // Render dữ liệu vào DOM
        document.getElementById('lbl-fullname').textContent = resp.data.fullName;
        // ...
        // Ẩn loading, hiện content
        document.getElementById('profile-loading').style.display = 'none';
        document.getElementById('profile-content').style.display = 'block';
      }
    })
    .api_st_getStudentByAccountId(accountId);
};

// Menu call:
onclick="navigate('frontend/views/student/view_student_profile', 'initStudentProfile')"
```

### Example 2: Class List

```javascript
// Init function:
window.initStudentClasses = function() {
  const studentId = window.currentUserData.studentId;
  google.script.run
    .withSuccessHandler(function(result) {
      const resp = JSON.parse(result);
      if (resp.success) {
        renderClassTable(resp.data);  // Render bảng
        document.getElementById('classes-loading').style.display = 'none';
        document.getElementById('classes-content').style.display = 'block';
      }
    })
    .api_st_getStudentClasses(studentId);
};

// Menu call:
onclick="navigate('frontend/views/student/view_student_classes', 'initStudentClasses')"
```

---

## 📚 Tham Khảo

- `01_CODE_WORKFLOW.md` : Luồng toàn hệ thống
- `02_FEATURE_ARCHITECTURE.md` : Ví dụ tạo feature mới
- `03_API_STRUCTURE.md` : Viết API đúng cách
