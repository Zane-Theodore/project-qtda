# 🔌 API Structure - Quy Tắc Viết API Backend

Hướng dẫn chuẩn để viết API consistent và dễ bảo trì.

---

## 📑 Cấu Trúc File API

Các API nên được tổ chức theo tính năng (domain-driven):

```
src/backend/
├── main.js                    (Entry point + Router)
├── auth.js                    (Authentication)
├── db.js                      (Database helpers)
├── config/
│   └── 0_Config.js           (Cấu hình toàn cục)
├── student/
│   ├── st_api.js             (API sinh viên chung)
│   ├── st_class_api.js       (API lớp học)
│   ├── st_score_api.js       (API điểm số)
│   └── st_thesis_api.js      (API luận văn)
└── lecturer/
    ├── le_api.js             (API giảng viên chung)
    ├── le_class_api.js       (API quản lý lớp)
    └── le_score_api.js       (API quản lý điểm)
```

---

## 📋 Quy Tắc Đặt Tên API

### Naming Convention

```javascript
// ✅ ĐÚNG
api_st_getStudentById(studentId)
api_st_getAllStudents()
api_st_createStudent(data)
api_st_updateStudent(studentId, updateData)
api_st_deleteStudent(studentId)

api_le_getClassById(classId)
api_le_updateClassScore(classId, scoreData)

// ❌ SAI
function_get_student(id)              // Không có prefix api_
getStudent(id)                         // Quá ngắn, không clear
student_api_get(id)                    // Thứ tự sai
getStudentByIdFromBackend(id)         // Dài, không consistent

// Giải thích từng phần:
// api_   = Đây là API endpoint (gọi được từ Frontend)
// st_    = Student (st = student, le = lecturer)
// get    = Hành động (get, create, update, delete, search, ...)
// StudentById = Resource + filter
```

### Ánh Xạ Hành Động

| Hành Động | CRUD | Ví Dụ |
|-----------|------|-------|
| Get/Read | R | `api_st_getStudentById()`, `api_st_getAllStudents()` |
| Create | C | `api_st_createStudent()` |
| Update | U | `api_st_updateStudent()` |
| Delete | D | `api_st_deleteStudent()` |
| Search | R | `api_st_searchStudents()`, `api_st_findStudentsByClass()` |

---

## 📝 Template API Standard

```javascript
/**
 * @description Mô tả chi tiết hàm làm gì
 * Dòng thứ 2 có thể mô tả thêm chi tiết nếu cần.
 * 
 * @param {string} paramName1 - Mô tả tham số 1
 * @param {Object} paramName2 - Mô tả tham số 2
 * @param {string} paramName2.property - Mô tả property của object
 * 
 * @returns {string} JSON. Nếu thành công: {success: true, data: ...}
 *                   Nếu thất bại: {success: false, error: "message"}
 * 
 * @example
 * // Lấy thông tin sinh viên
 * var result = api_st_getStudentById("SV001");
 * var parsed = JSON.parse(result);
 * if (parsed.success) {
 *   Logger.log("Tên: " + parsed.data.fullName);
 * }
 */
function api_st_getStudentById(studentId) {
    try {
        // 1. VALIDATION - Kiểm tra tham số
        if (!studentId || studentId.trim() === "") {
            throw new Error("Mã sinh viên không được để trống");
        }

        // 2. QUERY - Lấy dữ liệu
        var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", studentId);
        
        if (!student) {
            throw new Error("Không tìm thấy sinh viên: " + studentId);
        }

        // 3. DATA PROCESSING - Xử lý dữ liệu nếu cần
        var account = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", student.accountId);

        // 4. COMBINE - Kết hợp dữ liệu từ nhiều bảng
        var result = {
            studentId: student.studentId,
            fullName: account.fullName,
            email: account.email,
            classId: student.classId,
            gpa: student.gpa,
            major: student.major
        };

        // 5. RETURN - Trả về JSON
        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        // ERROR HANDLING - Xử lý lỗi
        Logger.log("ERROR [api_st_getStudentById]: " + error.message);
        return JSON.stringify({ 
            success: false, 
            error: error.message 
        });
    }
}
```

---

## ✨ Chi Tiết Từng Bước

### 1️⃣ **Validation (Kiểm Tra Tham Số)**

```javascript
function api_st_createStudent(studentData) {
    try {
        // Kiểm tra tham số bắt buộc
        if (!studentData) {
            throw new Error("dữ liệu sinh viên không được để trống");
        }

        if (!studentData.fullName || studentData.fullName.trim() === "") {
            throw new Error("Họ tên là bắt buộc");
        }

        if (!studentData.classId) {
            throw new Error("Lớp là bắt buộc");
        }

        // Kiểm tra format dữ liệu
        if (studentData.gpa && isNaN(parseFloat(studentData.gpa))) {
            throw new Error("GPA phải là số");
        }

        // Kiểm tra dữ liệu trùng lặp
        var existing = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", studentData.studentId);
        if (existing) {
            throw new Error("Mã sinh viên đã tồn tại!");
        }

        // ... tiếp tục logic

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}
```

### 2️⃣ **Query (Lấy Dữ Liệu)**

```javascript
// ✅ Cách tốt: Lấy 1 lần, filter nhiều lần
function api_st_searchStudents(searchTerm, classId) {
    try {
        var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
        
        var filtered = allStudents.filter(function(student) {
            var matchesSearch = !searchTerm || 
                student.name.toLowerCase().includes(searchTerm.toLowerCase());
            var matchesClass = !classId || 
                student.classId === classId;
            return matchesSearch && matchesClass;
        });

        return JSON.stringify({ success: true, data: filtered });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

// ❌ Cách sai: Query nhiều lần
function api_st_searchStudentsWrong(searchTerm) {
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    
    // Đây là vòng lặp quá nhiều query!
    for (var i = 0; i < allStudents.length; i++) {
        var account = db_findRecordByColumn(...);  // ← Query lần 1
        var enrollment = db_findRecordByColumn(...); // ← Query lần 2
        // ...
    }
}
```

### 3️⃣ **JOIN Data (Kết Hợp Dữ Liệu)**

```javascript
// ❌ Cách sai: N+1 Query (lô tô)
function api_st_getAllStudentsWrong() {
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    
    var result = allStudents.map(function(student) {
        var account = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", student.accountId);
        // ↑ Gọi DB N lần!!!
        return { ...student, email: account.email };
    });
    
    return JSON.stringify({ success: true, data: result });
}

// ✅ Cách tốt: Hash Map (Tối ưu hóa)
function api_st_getAllStudents() {
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);

    // Tạo HashMap cho lookup O(1)
    var accountMap = {};
    allAccounts.forEach(function(acc) {
        accountMap[acc.id] = acc;
    });

    var result = allStudents.map(function(student) {
        var account = accountMap[student.accountId]; // ← O(1) lookup!
        return {
            studentId: student.studentId,
            fullName: account ? account.fullName : "--",
            email: account ? account.email : "--"
        };
    });

    return JSON.stringify({ success: true, data: result });
}
```

### 4️⃣ **Data Processing & Format**

```javascript
function api_st_getStudentWithFormattedData(studentId) {
    try {
        var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", studentId);
        
        // Format dữ liệu trước khi trả về
        var result = {
            // Chuỗi
            name: (student.name || "").trim(),
            email: (student.email || "").toLowerCase(),
            
            // Số - Format số thập phân
            gpa: student.gpa ? parseFloat(student.gpa).toFixed(2) : null,
            
            // Ngày - Format ngày
            dob: formatDate(student.dob),
            
            // Boolean - Chuyển thành string
            isActive: student.status === "ACTIVE" ? true : false,
            
            // Enum - Xử lý giá trị mặc định
            role: student.role || "STUDENT",
            status: student.status || "PENDING"
        };

        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

// Helper function
function formatDate(dateStr) {
    if (!dateStr) return null;
    try {
        var date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Return as-is nếu invalid
        return date.toLocaleDateString('vi-VN');
    } catch(e) {
        return dateStr;
    }
}
```

### 5️⃣ **Error Handling**

```javascript
function api_st_updateStudentGPA(studentId, newGPA) {
    try {
        // Validate
        if (!studentId) throw new Error("Mã sinh viên không được để trống");
        if (newGPA === null || newGPA === undefined) throw new Error("GPA không được để trống");
        if (isNaN(parseFloat(newGPA))) throw new Error("GPA phải là số");
        if (newGPA < 0 || newGPA > 4) throw new Error("GPA phải trong khoảng 0-4");

        // Check existence
        var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", studentId);
        if (!student) throw new Error("Sinh viên không tồn tại: " + studentId);

        // Update
        var success = db_update(CONFIG.TABLES.STUDENT, "studentId", studentId, {
            gpa: parseFloat(newGPA).toFixed(2)
        });

        if (!success) throw new Error("Cập nhật GPA thất bại");

        return JSON.stringify({ 
            success: true, 
            message: "Cập nhật GPA thành công" 
        });

    } catch (error) {
        // Log cho debug
        Logger.log("ERROR [api_st_updateStudentGPA]: " + error.message);
        Logger.log("Stack: " + error.stack);
        
        return JSON.stringify({ 
            success: false, 
            error: error.message 
        });
    }
}
```

---

## 🎯 Response Format Standard

### Success Response

```javascript
{
  success: true,
  data: { ... },           // Hoặc mảng nếu lấy nhiều
  message: "Optional message"
}
```

### Error Response

```javascript
{
  success: false,
  error: "Mô tả lỗi chi tiết"
}
```

### Example API Calls

**Get Single Record:**
```javascript
{
  success: true,
  data: {
    studentId: "SV001",
    fullName: "Nguyễn Văn A",
    email: "a@truong.edu.vn",
    gpa: 3.50
  }
}
```

**Get Multiple Records:**
```javascript
{
  success: true,
  data: [
    { studentId: "SV001", fullName: "Nguyễn Văn A", gpa: 3.50 },
    { studentId: "SV002", fullName: "Trần Thị B", gpa: 3.75 }
  ]
}
```

**Create/Update Success:**
```javascript
{
  success: true,
  message: "Thêm sinh viên thành công"
}
```

**Error:**
```javascript
{
  success: false,
  error: "Mã sinh viên đã tồn tại!"
}
```

---

## 🔐 Security Best Practices

### ✅ Luôn Validate Input

```javascript
// ❌ SAI
function api_st_searchStudents(name) {
    return db_findRecordByColumn(CONFIG.TABLES.STUDENT, "name", name);
    // Nguy hiểm: Không kiểm tra input
}

// ✅ ĐÚNG
function api_st_searchStudents(name) {
    if (!name || typeof name !== "string") {
        throw new Error("Tên phải là chuỗi ký tự");
    }
    name = name.trim();
    if (name.length < 2) {
        throw new Error("Tên phải có ít nhất 2 ký tự");
    }
    return db_findRecordByColumn(CONFIG.TABLES.STUDENT, "name", name);
}
```

### ✅ Kiểm Tra Quyền Hạn

```javascript
function api_le_updateStudentScore(studentId, classId, score) {
    try {
        // Kiểm tra quyền: User phải là giảng viên
        if (window.currentUserData.role !== "LECTURER") {
            throw new Error("Chỉ giảng viên mới có quyền cập nhật điểm");
        }

        // Kiểm tra: Giảng viên chỉ cập nhật lớp của mình
        var classInfo = db_findRecordByColumn(CONFIG.TABLES.CLASS, "classId", classId);
        if (classInfo.teacherId !== window.currentUserData.id) {
            throw new Error("Bạn không có quyền cập nhật lớp này");
        }

        // ... tiếp tục update

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}
```

---

## 📚 Checklist Khi Viết API

- [ ] Đặt tên theo convention: `api_{domain}_{action}`
- [ ] Viết JSDoc comment đầy đủ
- [ ] Validate tất cả input parameters
- [ ] Check if data exists trước khi process
- [ ] Tối ưu query (không N+1)
- [ ] Format dữ liệu trước return
- [ ] Try-catch và log error
- [ ] Return JSON format standard
- [ ] Test API từ Frontend console

---

## 🧪 Testing API

### Từ Google Apps Script Console

1. Mở Google Apps Script Editor (script.google.com)
2. Chọn hàm muốn test
3. Nhấn ▶️ Run
4. Xem output ở Executions tab

### Từ Frontend Console (F12)

```javascript
// Gọi API từ Frontend
google.script.run
  .withSuccessHandler(function(result) {
    console.log("API returned:", result);
  })
  .api_st_getStudentById("SV001");
```

---

## 📖 Tham Khảo

- `02_FEATURE_ARCHITECTURE.md` : Ví dụ thực tế khi tạo feature
- `04_DATABASE_STRUCTURE.md` : Cách dùng các db helper functions
