// File: src/backend/student/st_api.js

/**
 * Lấy thông tin chi tiết sinh viên theo mã sinh viên
 * @param {string} studentId - Mã sinh viên cần tìm kiếm
 * @returns {string} JSON string chứa {success, data} hoặc {success, error}
 * @description Tự động JOIN với bảng ACCOUNT để lấy thông tin liên hệ
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
 * Lấy thông tin hồ sơ sinh viên theo mã tài khoản
 * @param {string} accountId - ID tài khoản (truyền từ Frontend sau khi đăng nhập)
 * @returns {string} JSON string chứa {success, data} hoặc {success, error}
 * @description Được gọi từ Frontend để lấy dữ liệu hồ sơ, tự động JOIN với bảng ACCOUNT
 */
function api_st_getStudentByAccountId(accountId) {
    try {
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);

        if (!studentInfo) throw new Error("Không tìm thấy hồ sơ sinh viên cho tài khoản: " + accountId);

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", accountId);

        if (!userInfo) throw new Error("Tài khoản không tồn tại: " + accountId);

        var result = {
            email: userInfo.email,
            fullName: userInfo.fullName,
            dob: userInfo.dob,
            number: userInfo.phoneNumber,
            nationalId: userInfo.nationalId,
            address: userInfo.address,

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
 * Lấy danh sách toàn bộ sinh viên trong hệ thống
 * @returns {string} JSON string chứa {success, data} hoặc {success, error}
 * @description Sử dụng HashMap để JOIN O(N) khi dữ liệu lớn, tránh vòng lặp lồng nhau
 */
function api_st_getAllStudents() {
    try {
        var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
        var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);

        if (allStudents.length === 0) {
            return JSON.stringify({ success: true, data: [] });
        }

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
 * Thêm mới sinh viên vào hệ thống
 * @param {Object} studentData - {fullName*, classId*, email, number, nationalId, address, studentId, accountId, password}
 * @returns {string} JSON string chứa {success, message} hoặc {success, error}
 * @description Tạo bản ghi ACCOUNT trước, rồi tạo bản ghi STUDENT. Yêu cầu fullName và classId bắt buộc
 */
function api_st_createStudent(studentData) {
    try {
        if (!studentData.fullName || !studentData.classId) {
            throw new Error("Vui lòng nhập đầy đủ Họ tên và Lớp của sinh viên!");
        }

        var currentAccountId = studentData.accountId;

        if (!currentAccountId || currentAccountId.trim() === "") {
            currentAccountId = "ACC_" + new Date().getTime();
            
            var newAccountObject = {
                id: currentAccountId,
                fullName: studentData.fullName, 
                email: studentData.email || (currentAccountId + "@student.hcmute.edu.vn"),
                number: studentData.number || "",
                nationalId: studentData.nationalId || "",
                address: studentData.address || "",
                password: studentData.password || "123",
                roleId: "STUDENT"
            };
            db_insert(CONFIG.TABLES.ACCOUNT, newAccountObject);
        }

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
 * Cập nhật thông tin sinh viên
 * @param {string} studentId - Mã sinh viên cần cập nhật
 * @param {Object} updateData - Các trường cần cập nhật
 * @returns {string} JSON string chứa {success, message} hoặc {success, error}
 * @description Tự động phân vân dữ liệu: cập nhật ACCOUNT hoặc STUDENT tùy theo trường
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