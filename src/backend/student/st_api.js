// File: src/backend/student/st_api.js

/**
 * @description Đọc thông tin chi tiết của một Sinh viên dựa vào ID.
 * Hàm này tự động JOIN với bảng USER để lấy thêm thông tin liên lạc (Email, Số điện thoại).
 * * @param {string} studentId - Mã sinh viên cần tìm kiếm.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `data` (Object chi tiết Sinh viên), hoặc `error` nếu thất bại.
 */
function api_st_getStudentById(studentId) {
    try {
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "student_id", studentId);

        if (!studentInfo) throw new Error("Không tìm thấy sinh viên với ID: " + studentId);

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.USER, "user_id", studentInfo.user_id);

        var result = {
            studentId: studentInfo.student_id,
            classId: studentInfo.class_id,
            major: studentInfo.major,
            cohort: studentInfo.cohort,
            name: userInfo ? userInfo.name : "Chưa cập nhật",
            email: userInfo ? userInfo.email : "Chưa cập nhật",
            number: userInfo ? userInfo.number : "Chưa cập nhật"
        }

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Lấy danh sách toàn bộ Sinh viên có trên hệ thống.
 * Sử dụng kỹ thuật Hash Map (Từ điển) để JOIN siêu tốc với bảng USER, đảm bảo hiệu suất O(N) khi dữ liệu lớn.
 * * @returns {string} Chuỗi JSON chứa trạng thái `success` và `data` (Mảng các Object Sinh viên).
 */
function api_st_getAllStudents() {
    try {
        var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
        var allUsers = db_getAll(CONFIG.TABLES.USER);

        if (allStudents.length === 0) {
            return JSON.stringify({ success: true, data: [] });
        }

        var userDictionary = {};
        for (var i = 0; i < allUsers.length; i++) {
            var user = allUsers[i];
            userDictionary[user.user_id] = user;
        }

        var result = allStudents.map(function(studentInfo) {
            var userInfo = userDictionary[studentInfo.user_id];

            return {
                studentId: studentInfo.student_id,
                classId: studentInfo.class_id,
                major: studentInfo.major,
                cohort: studentInfo.cohort,
                name: userInfo ? userInfo.name : "Chưa cập nhật",
                email: userInfo ? userInfo.email : "Chưa cập nhật",
                number: userInfo ? userInfo.number : "Chưa cập nhật"
            };
        });

        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Thêm mới một Sinh viên vào hệ thống.
 * Mã sinh viên (`student_id`) sẽ được tạo tự động dựa trên thời gian thực (Timestamp).
 * * @param {Object} studentData - Object chứa thông tin sinh viên mới. Yêu cầu bắt buộc phải có `name` và `class_id`.
 * @returns {string} Chuỗi JSON chứa trạng thái `success`, `message`, và `newId` (nếu thành công).
 */
function api_st_createStudent(studentData) {
    try {
        if (!studentData.name || !studentData.class_id) {
            throw new Error("Vui lòng nhập đầy đủ Tên và Lớp của sinh viên!");
        }

        var currentUserId = studentData.user_id;

        // TẠO TÀI KHOẢN (BẢNG USER)
        if (!currentUserId || currentUserId.trim() === "") {
            currentUserId = "USR_" + new Date().getTime();
            
            var newUserObject = {
                user_id: currentUserId,
                name: studentData.name, 
                email: studentData.email || (currentUserId + "@truong.edu.vn"), // Lấy từ form, nếu rỗng thì tự tạo
                number: studentData.number || "",
                password: studentData.password || "123",
                role: "STUDENT"
            };
            db_insert(CONFIG.TABLES.USER, newUserObject);
        }

        // TẠO THÔNG TIN HỌC VỤ (BẢNG STUDENT)
        var newStudentId = "ST_" + new Date().getTime();

        var newStudentObject = {
            student_id: newStudentId,
            user_id: currentUserId,
            class_id: studentData.class_id,
            major: studentData.major || "",
            cohort: studentData.cohort || ""
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
 * Hàm chỉ ghi đè những trường dữ liệu được truyền vào `updateData`, các trường khác giữ nguyên.
 * * @param {string} studentId - Mã sinh viên cần cập nhật.
 * @param {Object} updateData - Object chứa các trường cần thay đổi (Ví dụ: `{ major: "Kinh tế" }`).
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `message`.
 */
function api_st_updateStudent(studentId, updateData) {
    try {
        if (!studentId) throw new Error("Lỗi: Không xác định được mã sinh viên!");

        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "student_id", studentId);
        if (!studentInfo) throw new Error("Không tìm thấy sinh viên có mã [" + studentId + "].");

        var userUpdates = {};
        var studentUpdates = {};

        if (updateData.name) userUpdates.name = updateData.name;
        if (updateData.email) userUpdates.email = updateData.email;
        if (updateData.number) userUpdates.number = updateData.number;
        if (updateData.password) userUpdates.password = updateData.password;

        if (updateData.class_id) studentUpdates.class_id = updateData.class_id;
        if (updateData.major) studentUpdates.major = updateData.major;
        if (updateData.cohort) studentUpdates.cohort = updateData.cohort;

        if (Object.keys(userUpdates).length > 0 && studentInfo.user_id) {
            db_update(CONFIG.TABLES.USER, "user_id", studentInfo.user_id, userUpdates);
        }

        var isSuccess = true;
        if (Object.keys(studentUpdates).length > 0) {
            isSuccess = db_update(CONFIG.TABLES.STUDENT, "student_id", studentId, studentUpdates);
        }

        if (isSuccess) {
            return JSON.stringify({ success: true, message: "Đã cập nhật dữ liệu!" });
        } else {
            throw new Error("Lỗi hệ thống: Cập nhật thất bại.");
        }
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Xóa vĩnh viễn dữ liệu của một Sinh viên khỏi hệ thống.
 * * @param {string} studentId - Mã sinh viên cần xóa.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `message`.
 */
function api_st_deleteStudent(studentId) {
    try {
        if (!studentId) {
            throw new Error("Lỗi: Không xác định được mã sinh viên cần xóa!");
        }

        var isSuccess = db_delete(CONFIG.TABLES.STUDENT, "student_id", studentId);

        if (isSuccess) {
            return JSON.stringify({ success: true, message: "Đã xóa sinh viên khỏi hệ thống!" });
        } else {
            throw new Error("Xóa thất bại: Không tìm thấy sinh viên có mã [" + studentId + "].");
        }
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}