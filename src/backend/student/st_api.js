// File: src/backend/student/st_api.js

/**
 * @description Đọc thông tin chi tiết của một Sinh viên dựa vào STUDENTID.
 * Hàm này tự động JOIN với bảng ACCOUNT để lấy thêm thông tin liên lạc (Email, Số điện thoại).
 * * @param {string} studentId - Mã sinh viên cần tìm kiếm.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `data` (Object chi tiết Sinh viên), hoặc `error` nếu thất bại.
 */
function api_st_getStudentById(studentId) {
    try {
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", studentId);

        if (!studentInfo) throw new Error("Không tìm thấy sinh viên với ID: " + studentId);

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", studentInfo.accountId);

        var result = {
            email: userInfo.email,
            fullName: userInfo.fullName,
            nationalId: userInfo.nationalId,
            number: userInfo.phoneNumber,
            address: userInfo.address,
            studentId: studentInfo.studentId,
            classId: studentInfo.classId,
            major: studentInfo.major,
            cohort: studentInfo.cohort,
            programType: studentInfo.programType,
        }

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Đọc thông tin chi tiết của một Sinh viên dựa vào ACCOUNTId.
 * Được gọi từ Frontend sau khi đăng nhập để lấy dữ liệu hồ sơ sinh viên.
 * Hàm này tự động JOIN với bảng ACCOUNT để lấy thêm thông tin liên lạc.
 * * @param {string} accountId - ID tài khoản (User ID) từ bảng ACCOUNT.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `data` (Object chi tiết Sinh viên), hoặc `error` nếu thất bại.
 */
function api_st_getStudentByAccountId(accountId) {
    try {
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);

        if (!studentInfo) throw new Error("Không tìm thấy hồ sơ sinh viên cho tài khoản: " + accountId);

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", accountId);

        if (!userInfo) throw new Error("Tài khoản không tồn tại: " + accountId);

        var result = {
            // Account Info
            email: userInfo.email,
            fullName: userInfo.fullName,
            dob: userInfo.dob,
            number: userInfo.phoneNumber,
            nationalId: userInfo.nationalId,
            address: userInfo.address,

            // Student Info
            studentId: studentInfo.studentCode,
            gpa: studentInfo.gpa,
            classId: studentInfo.classId,
            major: studentInfo.major,
            cohort: studentInfo.cohort,
            programType: studentInfo.programType,
            enrollmentDate: studentInfo.enrollmentDate,
            practicumCompany: studentInfo.practicumCompany,
            practicumScore: studentInfo.practicumScore,
            internshipCompany: studentInfo.internshipCompany,
            internshipScore: studentInfo.internshipScore,
        }

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Lấy danh sách toàn bộ Sinh viên có trên hệ thống.
 * Sử dụng kỹ thuật Hash Map (Từ điển) để JOIN siêu tốc với bảng ACCOUNT, đảm bảo hiệu suất O(N) khi dữ liệu lớn.
 * * @returns {string} Chuỗi JSON chứa trạng thái `success` và `data` (Mảng các Object Sinh viên).
 */
function api_st_getAllStudents() {
    try {
        var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
        var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);

        if (allStudents.length === 0) {
            return JSON.stringify({ success: true, data: [] });
        }

        // Tạo Hash Map cho Account để truy xuất O(1)
        var accountDictionary = {};
        for (var i = 0; i < allAccounts.length; i++) {
            var acc = allAccounts[i];
            accountDictionary[acc.id] = acc;
        }

        var result = allStudents.map(function(studentInfo) {
            var userInfo = accountDictionary[studentInfo.accountId];

            return {
                studentId: studentInfo.studentId,
                classId: studentInfo.classId,
                major: studentInfo.major,
                cohort: studentInfo.cohort,
                programType: studentInfo.programType,
                
                // Dữ liệu từ bảng Account
                fullName: userInfo ? userInfo.fullName : "Chưa cập nhật",
                email: userInfo ? userInfo.email : "Chưa cập nhật",
                number: userInfo ? userInfo.number : "Chưa cập nhật",
                nationalId: userInfo ? userInfo.nationalId : "Chưa cập nhật",
                address: userInfo ? userInfo.address : "Chưa cập nhật"
            };
        });

        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Thêm mới một Sinh viên vào hệ thống.
 * Sẽ tạo một bản ghi trên bảng ACCOUNT trước, sau đó dùng `accountId` để tạo bản ghi bên bảng STUDENT.
 * * @param {Object} studentData - Object chứa thông tin sinh viên mới. Yêu cầu bắt buộc phải có `fullName` và `classId`.
 * @returns {string} Chuỗi JSON chứa trạng thái `success`, `message`.
 */
function api_st_createStudent(studentData) {
    try {
        if (!studentData.fullName || !studentData.classId) {
            throw new Error("Vui lòng nhập đầy đủ Họ tên và Lớp của sinh viên!");
        }

        var currentAccountId = studentData.accountId;

        // TẠO TÀI KHOẢN (BẢNG ACCOUNT)
        if (!currentAccountId || currentAccountId.trim() === "") {
            currentAccountId = "ACC_" + new Date().getTime();
            
            var newAccountObject = {
                id: currentAccountId,
                fullName: studentData.fullName, 
                email: studentData.email || (currentAccountId + "@student.hcmute.edu.vn"),
                number: studentData.number || "",
                nationalId: studentData.nationalId || "",
                address: studentData.address || "",
                password: studentData.password || "123", // Mật khẩu mặc định
                roleId: "STUDENT" // Hoặc truyền ID (vd: 1) tùy vào quy định của bảng Role
            };
            db_insert(CONFIG.TABLES.ACCOUNT, newAccountObject);
        }

        // TẠO THÔNG TIN HỌC VỤ (BẢNG STUDENT)
        var newStudentId = studentData.studentId || ("ST_" + new Date().getTime());

        var newStudentObject = {
            studentId: newStudentId,
            accountId: currentAccountId,
            classId: studentData.classId,
            major: studentData.major || "",
            cohort: studentData.cohort || "",
            programType: studentData.programType || ""
        };

        var isSuccess = db_insert(CONFIG.TABLES.STUDENT, newStudentObject);

        if (isSuccess) {
            return JSON.stringify({ success: true, message: "Đã thêm sinh viên và tài khoản thành công!" });
        } else {
            throw new Error("Lỗi hệ thống: Không thể ghi dữ liệu vào Google Sheets.");
        }
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Cập nhật thông tin của một Sinh viên.
 * Hàm sẽ bóc tách dữ liệu để tự động cập nhật vào đúng bảng (ACCOUNT hoặc STUDENT).
 * * @param {string} studentId - Mã sinh viên cần cập nhật.
 * @param {Object} updateData - Object chứa các trường cần thay đổi.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `message`.
 */
function api_st_updateStudent(studentId, updateData) {
    try {
        if (!studentId) throw new Error("Lỗi: Không xác định được mã sinh viên!");

        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", studentId);
        if (!studentInfo) throw new Error("Không tìm thấy sinh viên có mã [" + studentId + "].");

        var accountUpdates = {};
        var studentUpdates = {};

        // Phân loại data cho bảng ACCOUNT
        if (updateData.fullName) accountUpdates.fullName = updateData.fullName;
        if (updateData.email) accountUpdates.email = updateData.email;
        if (updateData.number) accountUpdates.number = updateData.number;
        if (updateData.nationalId) accountUpdates.nationalId = updateData.nationalId;
        if (updateData.address) accountUpdates.address = updateData.address;
        if (updateData.password) accountUpdates.password = updateData.password;

        // Phân loại data cho bảng STUDENT
        if (updateData.classId) studentUpdates.classId = updateData.classId;
        if (updateData.major) studentUpdates.major = updateData.major;
        if (updateData.cohort) studentUpdates.cohort = updateData.cohort;
        if (updateData.programType) studentUpdates.programType = updateData.programType;

        // 1. Cập nhật bảng Account (nếu có trường thay đổi)
        if (Object.keys(accountUpdates).length > 0 && studentInfo.accountId) {
            db_update(CONFIG.TABLES.ACCOUNT, "id", studentInfo.accountId, accountUpdates);
        }

        // 2. Cập nhật bảng Student (nếu có trường thay đổi)
        var isSuccess = true;
        if (Object.keys(studentUpdates).length > 0) {
            isSuccess = db_update(CONFIG.TABLES.STUDENT, "studentId", studentId, studentUpdates);
        }

        if (isSuccess) {
            return JSON.stringify({ success: true, message: "Đã cập nhật dữ liệu thành công!" });
        } else {
            throw new Error("Lỗi hệ thống: Cập nhật thất bại.");
        }
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Xóa vĩnh viễn dữ liệu của một Sinh viên khỏi hệ thống.
 * Kỹ thuật nâng cao: Xóa sinh viên đồng thời dọn dẹp luôn tài khoản Account liên kết để tránh rác dữ liệu.
 * * @param {string} studentId - Mã sinh viên cần xóa.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `message`.
 */
function api_st_deleteStudent(studentId) {
    try {
        if (!studentId) {
            throw new Error("Lỗi: Không xác định được mã sinh viên cần xóa!");
        }

        // Lấy thông tin sinh viên để biết đang dùng accountId nào
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "studentId", studentId);
        if (!studentInfo) {
            throw new Error("Xóa thất bại: Không tìm thấy sinh viên có mã [" + studentId + "].");
        }

        // Xóa bên bảng Student trước
        var isSuccess = db_delete(CONFIG.TABLES.STUDENT, "studentId", studentId);

        if (isSuccess) {
            // Xóa luôn tài khoản bên bảng Account
            if (studentInfo.accountId) {
                db_delete(CONFIG.TABLES.ACCOUNT, "id", studentInfo.accountId);
            }
            return JSON.stringify({ success: true, message: "Đã xóa sinh viên và tài khoản liên kết khỏi hệ thống!" });
        } else {
            throw new Error("Xóa thất bại do lỗi hệ thống.");
        }
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}