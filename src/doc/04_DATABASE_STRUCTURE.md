# 📊 Database Structure - Hướng Dẫn Dùng Database

---

## 🔧 Database System Overview

Dự án sử dụng **Google Sheets** làm database. Mọi dữ liệu được lưu trong các "Tab" (Sheets) khác nhau.

```
Google Drive
└── File: "Hệ thống Quản lý" (ID: 1XGziAyboD4BH...)
    ├── Tab: Account        (Tài khoản người dùng)
    ├── Tab: Student        (Thông tin sinh viên)
    ├── Tab: Lecturer       (Thông tin giảng viên)
    ├── Tab: Class          (Lớp học)
    ├── Tab: Enrollment     (Đăng ký lớp)
    ├── Tab: Score          (Điểm số)
    ├── Tab: Notification   (Thông báo)
    └── ...
```

---

## ⚙️ Cấu Hình Database

### File: `src/config/0_Config.js`

```javascript
var CONFIG = {
  // ID của Google Sheet (Lấy từ URL)
  // https://docs.google.com/spreadsheets/d/1XGziAyboD4BHpS_ifcxrMkj43_iRkVT-BCDxYthoMGI/edit
  //                                            ↑ Đây là Script ID
  DB_ID: '1XGziAyboD4BHpS_ifcxrMkj43_iRkVT-BCDxYthoMGI',
  
  // Tên của các Tab trong Sheets
  TABLES: {
    ACCOUNT: 'Account',
    STUDENT: 'Student',
    LECTURER: 'Lecturer',
    NOTIFICATION: 'Notification',
    TEACHING_ACTIVITY: 'TeachingActivity',
    ACHIVEMENT: 'Achievement',
    THESIS: 'Thesis',
    COUNCIL: 'Council',
    COUNCIL_MEMBER: 'CouncilMember',
    SCORE: 'Score',
    SUBMISSION: 'Submission',
    EVALUATION_RECORD: 'EvaluationRecord',
    DEFENSE_ROOM: 'DefenseRoom',
  }
};
```

**Lưu ý:** Tên tab phải **chính xác 100%** (kể cả chữ hoa/thường)

---

## 📝 Các Bảng Chính

### 1️⃣ **Account Table** (Tài khoản)

| Cột | Kiểu | Mô Tả | Ví Dụ |
|-----|------|-------|-------|
| id | String | ID duy nhất (Primary Key) | ACC_1, ACC_2 |
| email | String | Email (duy nhất) | sv@truong.edu.vn |
| password | String | Mật khẩu (nên hash) | 123456 |
| fullName | String | Họ và tên | Nguyễn Văn A |
| phoneNumber | String | Số điện thoại | 0123456789 |
| nationalId | String | CCCD | 012345678910 |
| address | String | Địa chỉ | TP.HCM |
| dob | String | Ngày sinh | 2003-01-15 |
| role | String | Vai trò | STUDENT, LECTURER |
| createdDate | String | Ngày tạo | 2024-01-01 |
| status | String | Trạng thái | ACTIVE, INACTIVE |

**Ví dụ dòng:**
```
id              email                  password    fullName        phoneNumber  role
ACC_001         sv.a@truong.edu.vn    123456      Nguyễn Văn A    0123456789   STUDENT
ACC_002         gv.b@truong.edu.vn    123456      Trần Thị B      0987654321   LECTURER
```

---

### 2️⃣ **Student Table** (Sinh viên)

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| studentId | String | Mã sinh viên (Primary Key) |
| accountId | String | ID từ bảng Account (Foreign Key) |
| studentCode | String | Mã số sinh viên |
| classId | String | Mã lớp |
| major | String | Ngành học |
| cohort | String | Khóa học |
| programType | String | Hệ đào tạo (Chính quy, VLVH) |
| enrollmentDate | String | Ngày nhập học |
| gpa | Float | Điểm GPA |
| practicumCompany | String | Công ty thực tập 1 |
| practicumScore | Float | Điểm thực tập 1 |
| internshipCompany | String | Công ty thực tập 2 |
| internshipScore | Float | Điểm thực tập 2 |
| status | String | Trạng thái (ACTIVE, GRADUATED, SUSPENDED) |

**Relationship:**
```
Student.accountId → Account.id

Ví dụ:
SELECT * FROM Student 
INNER JOIN Account ON Student.accountId = Account.id
WHERE Student.studentId = "SV001"
```

---

### 3️⃣ **Lecturer Table** (Giảng viên)

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| lecturerId | String | Mã giảng viên (Primary Key) |
| accountId | String | ID từ bảng Account (Foreign Key) |
| departmentId | String | Mã phòng ban |
| specialization | String | Chuyên ngành |
| degree | String | Học vị (ThS, TS, PGS, GS) |
| experience | String | Năm kinh nghiệm |
| officeHours | String | Giờ làm việc |
| status | String | Trạng thái |

---

### 4️⃣ **Class Table** (Lớp học)

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| classId | String | Mã lớp (Primary Key) |
| classCode | String | Mã học phần |
| className | String | Tên lớp học |
| credit | Integer | Số tín chỉ |
| teacherId | String | ID giảng viên (FK) |
| semester | String | Kỳ học |
| capacity | Integer | Sức chứa |
| enrolled | Integer | Số sinh viên đã đăng ký |
| room | String | Phòng học |
| schedule | String | Lịch học |
| status | String | Trạng thái |

---

### 5️⃣ **Enrollment Table** (Đăng ký lớp)

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| enrollmentId | String | ID (Primary Key) |
| studentId | String | Mã sinh viên (FK) |
| classId | String | Mã lớp (FK) |
| enrollmentDate | String | Ngày đăng ký |
| score | Float | Điểm số |
| midtermScore | Float | Điểm giữa kỳ |
| finalScore | Float | Điểm cuối kỳ |
| attendanceRate | Float | Tỷ lệ điểm danh |
| status | String | Trạng thái (REGISTERED, COMPLETED, FAILED, DROPPED) |

**Relationship:**
```
Enrollment.studentId → Student.studentId
Enrollment.classId → Class.classId
```

---

## 🛠️ Database Helper Functions

File: `src/backend/db.js`

### 1. `db_getAll(tableName)`

Lấy **tất cả dữ liệu** của một bảng

```javascript
/**
 * @param {string} tableName - Tên tab (VD: CONFIG.TABLES.STUDENT)
 * @returns {Array<Object>} Mảng các object
 */

// Ví dụ
var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
Logger.log(allStudents.length);  // Số sinh viên
Logger.log(allStudents[0]);      // Sinh viên đầu tiên

// Kết quả:
[
  { studentId: "SV001", fullName: "Nguyễn Văn A", gpa: 3.5, ... },
  { studentId: "SV002", fullName: "Trần Thị B", gpa: 3.7, ... },
  ...
]
```

---

### 2. `db_findRecordByColumn(tableName, columnName, value)`

Tìm **1 bản ghi** dựa trên giá trị cột (nếu có nhiều cùng value, trả về cái đầu tiên)

```javascript
/**
 * @param {string} tableName - Tên tab
 * @param {string} columnName - Tên cột để tìm kiếm
 * @param {string|number} value - Giá trị cần tìm
 * @returns {Object|null} Object nếu tìm thấy, null nếu không
 */

// Ví dụ 1: Tìm sinh viên theo mã
var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", "SV001");
if (student) {
  Logger.log("Tên: " + student.fullName);  // Tên: Nguyễn Văn A
}

// Ví dụ 2: Tìm user theo email
var user = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "email", "sv@truong.edu.vn");
if (!user) {
  Logger.log("Email này không tồn tại!");
}

// Ví dụ 3: Tìm lớp học theo code
var classInfo = db_findRecordByColumn(CONFIG.TABLES.CLASS, "classCode", "CTDL01");
```

---

### 3. `db_getUserByEmail(email)`

Shortcut của `db_findRecordByColumn()` để tìm user theo email

```javascript
/**
 * @param {string} email - Email cần tìm
 * @returns {Object|null} Object account nếu tìm thấy
 */

var user = db_getUserByEmail("sv@truong.edu.vn");
if (user && user.password === "123456") {
  Logger.log("Đăng nhập thành công!");
}
```

---

### 4. `db_insert(tableName, dataObject)`

Thêm **1 bản ghi mới** vào cuối bảng

```javascript
/**
 * @param {string} tableName - Tên tab
 * @param {Object} dataObject - Object chứa dữ liệu
 * @returns {boolean} Luôn true nếu không lỗi
 */

// Ví dụ: Thêm sinh viên mới
var newStudent = {
  studentId: "SV100",
  accountId: "ACC_100",
  fullName: "Lê Văn C",
  classId: "IT21B",
  major: "CNTT",
  gpa: 0
};
db_insert(CONFIG.TABLES.STUDENT, newStudent);

// Ghi chú: Các cột không được truyền sẽ để trống
// nên cần chuẩn bị đầy đủ dữ liệu trước khi thêm
```

---

### 5. `db_update(tableName, idColumn, idValue, updateData)`

Cập nhật dữ liệu của **1 bản ghi** dựa trên ID

```javascript
/**
 * @param {string} tableName - Tên tab
 * @param {string} idColumn - Tên cột dùng làm điều kiện (thường là Primary Key)
 * @param {string|number} idValue - Giá trị của cột đó
 * @param {Object} updateData - Object chứa những gì cần sửa
 * @returns {boolean} true nếu tìm thấy và update, false nếu không tìm thấy
 */

// Ví dụ 1: Cập nhật GPA sinh viên
db_update(CONFIG.TABLES.STUDENT, "studentId", "SV001", {
  gpa: 3.75,
  status: "ACTIVE"
});

// Ví dụ 2: Cập nhật tên người dùng
db_update(CONFIG.TABLES.ACCOUNT, "id", "ACC_001", {
  fullName: "Nguyễn Văn A - Updated"
});

// ⚠️ QUAN TRỌNG: Chỉ truyền vào những cột cần sửa
// Các cột khác sẽ giữ nguyên giá trị cũ
```

---

### 6. `db_delete(tableName, idColumn, idValue)`

Xóa **1 bản ghi** dựa trên ID

```javascript
/**
 * @param {string} tableName - Tên tab
 * @param {string} idColumn - Tên cột làm điều kiện
 * @param {string|number} idValue - Giá trị cần xóa
 * @returns {boolean} true nếu xóa thành công
 */

// Ví dụ: Xóa sinh viên
var success = db_delete(CONFIG.TABLES.STUDENT, "studentId", "SV100");
if (success) {
  Logger.log("Xóa sinh viên thành công!");
} else {
  Logger.log("Sinh viên không tồn tại!");
}
```

---

## 🔄 Các Pattern Sử Dụng Thường Gặp

### **Pattern 1: Lấy tất cả + Filter**

```javascript
// ✅ ĐÚNG: Lấy 1 lần, filter ở client-side
function api_st_findStudentsByClass(classId) {
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    
    var filtered = allStudents.filter(function(student) {
        return student.classId === classId;
    });
    
    return JSON.stringify({ success: true, data: filtered });
}

// ❌ SAI: Query lặp lại nhiều lần
function api_st_findStudentsByClassWrong(classId) {
    var students = [];
    for (var i = 0; i < 500; i++) {
        var student = db_findRecordByColumn(...);  // ← 500 lần query!
    }
}
```

---

### **Pattern 2: JOIN 2 Bảng (Hash Map)**

```javascript
// Khi lấy sinh viên + tài khoản kèm
function api_st_getAllStudentsWithAccount() {
    var students = db_getAll(CONFIG.TABLES.STUDENT);
    var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);
    
    // Tạo Look-up Map
    var accountMap = {};
    accounts.forEach(function(acc) {
        accountMap[acc.id] = acc;
    });
    
    // Join bằng map
    var result = students.map(function(student) {
        var account = accountMap[student.accountId];
        return {
            studentId: student.studentId,
            fullName: account ? account.fullName : "--",
            email: account ? account.email : "--",
            gpa: student.gpa
        };
    });
    
    return JSON.stringify({ success: true, data: result });
}
```

---

### **Pattern 3: Search/Filter Phức Tạp**

```javascript
// Tìm sinh viên theo nhiều tiêu chí
function api_st_searchStudents(filters) {
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    
    var result = allStudents.filter(function(student) {
        // Nếu có filter classId
        if (filters.classId && student.classId !== filters.classId) {
            return false;
        }
        
        // Nếu có filter major
        if (filters.major && student.major !== filters.major) {
            return false;
        }
        
        // Nếu có filter GPA min
        if (filters.minGpa && parseFloat(student.gpa) < filters.minGpa) {
            return false;
        }
        
        return true;
    });
    
    return JSON.stringify({ success: true, data: result });
}

// Cách gọi:
// api_st_searchStudents({classId: "IT21B", minGpa: 3.0})
```

---

### **Pattern 4: Pagination (Phân Trang)**

```javascript
function api_st_getStudentsPaginated(page, pageSize) {
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    
    var startIndex = (page - 1) * pageSize;
    var endIndex = startIndex + pageSize;
    
    var paginated = allStudents.slice(startIndex, endIndex);
    
    return JSON.stringify({ 
        success: true, 
        data: paginated,
        currentPage: page,
        totalPages: Math.ceil(allStudents.length / pageSize),
        totalRecords: allStudents.length
    });
}

// Cách gọi:
// api_st_getStudentsPaginated(1, 10)  // Trang 1, 10 sinh viên/trang
// api_st_getStudentsPaginated(2, 10)  // Trang 2
```

---

### **Pattern 5: Tạo ID Tự Động**

```javascript
function api_st_createStudent(data) {
    try {
        // Tạo ID duy nhất
        var newId = "SV_" + new Date().getTime();
        
        var newStudent = {
            studentId: newId,
            accountId: data.accountId,
            fullName: data.fullName,
            classId: data.classId,
            gpa: 0
        };
        
        db_insert(CONFIG.TABLES.STUDENT, newStudent);
        
        return JSON.stringify({ 
            success: true, 
            message: "Thêm sinh viên thành công",
            id: newId
        });
        
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}
```

---

## ⚠️ Best Practices

### ✅ DO

```javascript
// ✅ Validate dữ liệu trước insert/update
var data = { studentId: "SV001", gpa: 3.5 };
if (!data.studentId) throw new Error("studentId bắt buộc");
db_insert(CONFIG.TABLES.STUDENT, data);

// ✅ Kiểm tra bản ghi tồn tại trước khi update
var existing = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", "SV001");
if (!existing) throw new Error("Sinh viên không tồn tại");
db_update(...);

// ✅ Dùng Hash Map để optimize join
var map = {};
data.forEach(function(item) { map[item.id] = item; });
var joined = others.map(function(item) { return map[item.id]; });
```

### ❌ DON'T

```javascript
// ❌ Lấy nhiều lần trong vòng lặp
allRecords.forEach(function(record) {
    var otherData = db_getAll(OTHER_TABLE);  // ← Query N lần!
});

// ❌ Xóa mà không confirm
db_delete(CONFIG.TABLES.STUDENT, "studentId", "SV001");

// ❌ Để trống validation
function api_updateScore(studentId, score) {
    db_update(CONFIG.TABLES.SCORE, "studentId", studentId, {score: score});
    // Nguy hiểm: Không kiểm tra có bắt buộc, định dạng, ...
}
```

---

## 🧪 Testing Database Queries

### Từ Google Apps Script Editor

```javascript
// Copy hàm này vào Editor và chạy
function test_db() {
  // Test 1: db_getAll
  var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
  Logger.log("Total students: " + allStudents.length);
  
  // Test 2: db_findRecordByColumn
  var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", "SV001");
  Logger.log("Found: " + JSON.stringify(student));
  
  // Test 3: db_insert
  db_insert(CONFIG.TABLES.STUDENT, {
    studentId: "TEST_" + new Date().getTime(),
    fullName: "Test Student"
  });
  
  // Test 4: db_update
  db_update(CONFIG.TABLES.STUDENT, "studentId", "SV001", {
    gpa: 3.99
  });
  
  Logger.log("All tests completed!");
}
```

---

## 📚 Tham Khảo

- `03_API_STRUCTURE.md` : Cách viết API sử dụng db functions
- `02_FEATURE_ARCHITECTURE.md` : Ví dụ thực tế thêm feature với database
