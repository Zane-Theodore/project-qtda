# 🏗️ Feature Architecture - Hướng Dẫn Thiết Kế Tính Năng

Hướng dẫn từng bước cách thiết kế và phát triển một tính năng mới, từ Database đến Frontend.

---

## 📝 Ví Dụ: Thêm Tính Năng "Xem Điểm Lớp" cho Sinh Viên

Chúng ta sẽ tạo tính năng cho phép sinh viên xem danh sách các lớp học và điểm số của mình.

---

## 🔧 Bước 1: Thiết Kế Database

### 1.1 Xác Định Data Structure

Trước tiên, xác định dữ liệu cần lưu trữ:

**Bảng 1: CLASS (Lớp học)**
```
ClassID | ClassCode | ClassName      | Credit | TeacherID
--------|-----------|-----------------|--------|----------
CLS001  | CTDL01    | Cấu Trúc Dữ Liệu| 3      | GV001
CLS002  | OOP01     | Lập Trình OOP  | 3      | GV002
```

**Bảng 2: ENROLLMENT (Đăng ký lớp)**
```
EnrollmentID | StudentID | ClassID | Score | Status
-------------|-----------|---------|-------|--------
ENR001       | SV001     | CLS001  | 8.5   | PASSED
ENR002       | SV001     | CLS002  | 7.0   | PASSED
```

### 1.2 Cập Nhật Config

**File:** `src/config/0_Config.js`

```javascript
var CONFIG = {
  DB_ID: '1XGziAyboD4BHpS_ifcxrMkj43_iRkVT-BCDxYthoMGI',
  
  TABLES: {
    ACCOUNT: 'Account',
    STUDENT: 'Student',
    LECTURER: 'Lecturer',
    CLASS: 'Class',                    // ← THÊM MỚI
    ENROLLMENT: 'Enrollment',           // ← THÊM MỚI
    // ... các bảng khác
  }
};
```

### 1.3 Tạo Bảng trong Google Sheets

1. Mở Google Sheet được cấu hình
2. Thêm 2 tab mới: `Class` và `Enrollment`
3. Tạo header cho mỗi tab

**Tab "Class":**
```
ClassID | ClassCode | ClassName | Credit | TeacherID
```

**Tab "Enrollment":**
```
EnrollmentID | StudentID | ClassID | Score | Status
```

---

## 🔑 Bước 2: Tạo Backend API

### 2.1 Tạo File API Mới

**File:** `src/backend/student/st_class_api.js` (File mới)

```javascript
/**
 * @description Lấy danh sách tất cả lớp học và điểm số của một sinh viên.
 * @param {string} studentId - Mã sinh viên.
 * @returns {string} JSON chứa danh sách lớp học và điểm.
 */
function api_st_getStudentClasses(studentId) {
    try {
        // 1. Lấy tất cả enrollment của sinh viên
        var allEnrollments = db_getAll(CONFIG.TABLES.ENROLLMENT);
        var studentEnrollments = allEnrollments.filter(function(e) {
            return String(e.studentId) === String(studentId);
        });

        if (studentEnrollments.length === 0) {
            return JSON.stringify({ success: true, data: [] });
        }

        // 2. Lấy thông tin chi tiết của mỗi lớp
        var allClasses = db_getAll(CONFIG.TABLES.CLASS);
        var classMap = {};
        allClasses.forEach(function(cls) {
            classMap[cls.classId] = cls;
        });

        // 3. Kết hợp dữ liệu
        var result = studentEnrollments.map(function(enrollment) {
            var classInfo = classMap[enrollment.classId];
            return {
                enrollmentId: enrollment.enrollmentId,
                classId: enrollment.classId,
                classCode: classInfo ? classInfo.classCode : "--",
                className: classInfo ? classInfo.className : "--",
                credit: classInfo ? classInfo.credit : "--",
                score: enrollment.score || "--",
                status: enrollment.status || "PENDING"
            };
        });

        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Lấy chi tiết một lớp học cụ thể.
 * @param {string} classId - Mã lớp học.
 * @returns {string} JSON chứa thông tin lớp học.
 */
function api_st_getClassDetails(classId) {
    try {
        var classInfo = db_findRecordByColumn(CONFIG.TABLES.CLASS, "classId", classId);
        
        if (!classInfo) {
            throw new Error("Không tìm thấy lớp học: " + classId);
        }

        return JSON.stringify({ success: true, data: classInfo });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}
```

### 2.2 Làm Cho Hàm Accessible Từ Frontend

Các hàm Google Apps Script có thể được gọi từ Frontend thông qua `google.script.run` **miễn là chúng là global functions** (không được private).

✅ **Hàm có thể gọi từ Frontend:**
```javascript
function api_st_getStudentClasses(studentId) { ... }
```

❌ **Hàm KHÔNG thể gọi từ Frontend:**
```javascript
function _privateHelper() { ... }  // Bắt đầu với "_"
```

---

## 🎨 Bước 3: Tạo Frontend View

### 3.1 Tạo File HTML View

**File:** `src/frontend/views/student/view_student_classes.html` (File mới)

```html
<div class="classes-container">
  
  <div id="classes-loading">
    <?!= include('frontend/components/loading_spinner'); ?>
  </div>

  <div id="classes-content" style="display: none;">
    
    <div class="classes-header">
      <h2>Danh Sách Lớp Học</h2>
      <p>Tổng số lớp đã đăng ký: <span id="lbl-total-classes">0</span></p>
    </div>

    <div class="classes-table-wrapper">
      <table class="classes-table">
        <thead>
          <tr>
            <th>Mã Lớp</th>
            <th>Tên Lớp</th>
            <th>Số Tín Chỉ</th>
            <th>Điểm</th>
            <th>Trạng Thái</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody id="classes-table-body">
          <!-- Dữ liệu sẽ được render vào đây -->
        </tbody>
      </table>
    </div>

  </div>

</div>

<style>
  .classes-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
  }

  .classes-header {
    margin-bottom: 30px;
  }

  .classes-header h2 {
    font-size: 28px;
    color: #1a202c;
    margin-bottom: 10px;
  }

  .classes-table-wrapper {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    overflow: auto;
  }

  .classes-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .classes-table thead {
    background: #f8f9fa;
    border-bottom: 2px solid #e0e0e0;
  }

  .classes-table th {
    padding: 15px;
    text-align: left;
    font-weight: 600;
    color: #2d3748;
  }

  .classes-table td {
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
    color: #4a5568;
  }

  .classes-table tbody tr:hover {
    background: #f9fafb;
  }

  .status-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .status-passed {
    background: #d4edda;
    color: #155724;
  }

  .status-pending {
    background: #fff3cd;
    color: #856404;
  }

  .status-failed {
    background: #f8d7da;
    color: #721c24;
  }

  .btn-view-details {
    background: #0F57D0;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-view-details:hover {
    background: #1a3c73;
  }
</style>
```

### 3.2 Tạo File JavaScript Xử Lý

**File:** `src/frontend/assets/scripts/js_student_classes.html` (File mới)

```javascript
<script>
  /**
   * Hàm khởi tạo - được Router gọi tự động
   */
  window.initStudentClasses = function() {
    const currentAccountId = window.currentUserData.id;
    
    // Lấy Student ID từ Global Data (đã được set khi login)
    const currentStudentId = window.currentUserData.studentId;
    
    if (!currentStudentId) {
      alert("Lỗi: Không tìm thấy mã sinh viên!");
      return;
    }

    const loadingEl = document.getElementById('classes-loading');
    const contentEl = document.getElementById('classes-content');

    // Hiển thị loading
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';

    // Gọi API Backend
    google.script.run
      .withSuccessHandler(function(responseString) {
        const response = JSON.parse(responseString);
        
        if (response.success) {
          renderClassesTable(response.data);
          loadingEl.style.display = 'none';
          contentEl.style.display = 'block';
        } else {
          alert("Lỗi: " + response.error);
          loadingEl.innerHTML = '<span style="color: red;">Lỗi tải dữ liệu</span>';
        }
      })
      .withFailureHandler(function(error) {
        alert("Lỗi kết nối máy chủ!");
        console.error(error);
      })
      .api_st_getStudentClasses(currentStudentId);
  };

  /**
   * Render dữ liệu vào bảng
   */
  function renderClassesTable(classes) {
    const tableBody = document.getElementById('classes-table-body');
    const totalEl = document.getElementById('lbl-total-classes');

    totalEl.textContent = classes.length;

    if (classes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">Chưa đăng ký lớp nào</td></tr>';
      return;
    }

    tableBody.innerHTML = classes.map(function(cls) {
      const statusClass = cls.status === 'PASSED' ? 'status-passed' : 
                         cls.status === 'PENDING' ? 'status-pending' : 'status-failed';
      
      const score = cls.score === '--' ? '--' : parseFloat(cls.score).toFixed(2);

      return `
        <tr>
          <td>${cls.classCode}</td>
          <td>${cls.className}</td>
          <td>${cls.credit}</td>
          <td><strong>${score}</strong></td>
          <td><span class="status-badge ${statusClass}">${cls.status}</span></td>
          <td>
            <button class="btn-view-details" onclick="viewClassDetails('${cls.classId}')">
              Chi Tiết
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Xem chi tiết lớp học
   */
  function viewClassDetails(classId) {
    console.log("Xem chi tiết lớp: " + classId);
    // TODO: Thêm logic để hiển thị modal chi tiết lớp
    showNotification('Chi tiết lớp sẽ được hiển thị tại đây', 'info');
  }
</script>
```

---

## 🔗 Bước 4: Kết Nối Frontend

### 4.1 Thêm Script Vào Layout

**File:** `src/frontend/layout.html`

Tìm dòng `<?!= include('frontend/assets/scripts/js_student'); ?>` và thêm phía dưới:

```html
<!-- Thêm dòng này: -->
<?!= include('frontend/assets/scripts/js_student_classes'); ?>
```

### 4.2 Thêm Menu Item

**File:** `src/frontend/components/sidebars/sidebar_student.html`

```html
<div class="sidebar-menu-item" onclick="navigate('frontend/views/student/view_student_classes', 'initStudentClasses')">
  <span class="material-symbols-outlined">grade</span>
  <span>Lớp Học & Điểm</span>
</div>
```

**Giải thích:**
- `navigate()` : Hàm router (trong `js_router.html`)
- Tham số 1: Đường dẫn file HTML view
- Tham số 2: Hàm JS được chạy khi view load xong

---

## 📊 Bước 5: Kiểm Tra Và Test

### 5.1 Push Code Lên Google Apps Script

```bash
clasp push
```

### 5.2 Test Trên Trình Duyệt

1. Truy cập URL test deployment
2. Đăng nhập với tài khoản sinh viên
3. Click vào menu "Lớp Học & Điểm"
4. Kiểm tra:
   - ✅ Loading spinner hiện lên đúng không?
   - ✅ Dữ liệu được tải từ Google Sheets?
   - ✅ Bảng được render đúng không?
   - ✅ Các nút "Chi Tiết" hoạt động không?

### 5.3 Debug

**Nếu gặp lỗi:**

1. Mở browser DevTools (F12)
2. Kiểm tra tab Console để xem lỗi JS
3. Kiểm tra Network để xem request tới Backend
4. Mở Google Apps Script tại script.google.com → Executions để xem lỗi Backend

---

## 🗂️ Tóm Tắt File Cần Tạo/Sửa

| File | Loại | Mục Đích |
|------|------|---------|
| `0_Config.js` | ✏️ Sửa | Thêm TABLES.CLASS, TABLES.ENROLLMENT |
| `st_class_api.js` | ✨ Mới | Backend API cho tính năng |
| `view_student_classes.html` | ✨ Mới | HTML view của tính năng |
| `js_student_classes.html` | ✨ Mới | JavaScript xử lý logic |
| `layout.html` | ✏️ Sửa | Thêm include js_student_classes.html |
| `sidebar_student.html` | ✏️ Sửa | Thêm menu item |

---

## 🔄 Workflow Khi User Tương Tác

```
User click "Lớp Học & Điểm" menu
    ↓
navigate('frontend/views/student/view_student_classes', 'initStudentClasses')
    ↓
Hiển thị loading ui
    ↓
Backend tải HTML từ view_student_classes.html
    ↓
Frontend đổ HTML vào #app-content
    ↓
Chạy initStudentClasses() function
    ↓
google.script.run.api_st_getStudentClasses(studentId)
    ↓
Backend query Google Sheets lấy dữ liệu
    ↓
Backend trả về JSON: {success: true, data: [...]}
    ↓
Frontend renderClassesTable(data)
    ↓
Ẩn loading, hiển thị bảng dữ liệu
```

---

## 💡 Best Practices

### ✅ DO

- **Luôn trả về JSON từ Backend:** `return JSON.stringify({...})`
- **Kiểm tra dữ liệu:** Check nếu dữ liệu null/undefined trước khi render
- **Cache dữ liệu:** Lưu dữ liệu ở `window.DataCache` để tránh query lại
- **Error handling:** Luôn có try-catch ở Backend
- **Responsive design:** Mobile-friendly CSS
- **Descriptive names:** Đặt tên hàm rõ ràng (api_ prefix cho API, init_ cho init function)

### ❌ DON'T

- **Không render quá nhiều row:** Nếu > 500 dòng, dùng pagination
- **Không gọi DB nhiều lần:** Lấy tất cả 1 lần, sau đó filter
- **Không xóa dữ liệu mà không confirm:** Luôn có dialog xác nhận
- **Không hardcode ID:** Luôn từ global data (currentUserData, etc)
- **Không quên test:** Test trên nhiều browser, mobile

---

## 📚 Tham Khảo Thêm

- `03_API_STRUCTURE.md` : Cách viết API đúng cách
- `04_DATABASE_STRUCTURE.md` : Chi tiết cấu trúc database
- `05_FRONTEND_ROUTING.md` : Chi tiết routing system
