// File: src/backend/student/st_api.js

/**
 * @description Đọc thông tin chi tiết của một Sinh viên dựa vào STUDENTID.
 * Hàm này tự động JOIN với bảng ACCOUNT để lấy thêm thông tin liên lạc (Email, Số điện thoại).
 * * @param {string} lectureId - Mã giảng viên cần tìm kiếm.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `data` (Object chi tiết Sinh viên), hoặc `error` nếu thất bại.
 */
function api_lec_getLecturerById(lecturerId) {
    try {
        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "lecturerId", lecturerId);
        if (!lecturerInfo) throw new Error("Không tìm thấy hồ sơ giảng viên!");

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", lecturerInfo.accountId);
        if (!userInfo) throw new Error("Tài khoản không tồn tại!");

        var result = {
            // Account
            fullName: userInfo.fullName,
            email: userInfo.email,
            phoneNumber: userInfo.phoneNumber,
            address: userInfo.address,
            nationalId: userInfo.nationalId,
            dob: userInfo.dob,

            // Lecturer
            lecturerId: lecturerInfo.lecturerId,
            degree: lecturerInfo.degree,
            specialization: lecturerInfo.specialization,
            startDate: lecturerInfo.startDate,

            // Custom
            teachingActivities: lecturerInfo.teachingActivities || [], // array
            achievements: lecturerInfo.achievements || [] // array
        };

        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Đọc thông tin chi tiết của một Giảng viên dựa vào ACCOUNTId.
 * Được gọi từ Frontend sau khi đăng nhập để lấy dữ liệu hồ sơ giảng viên.
 * Hàm này tự động JOIN với bảng ACCOUNT để lấy thêm thông tin liên lạc.
 * * @param {string} accountId - ID tài khoản (User ID) từ bảng ACCOUNT.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `data` (Object chi tiết Giảng viên), hoặc `error` nếu thất bại.
 */
function api_lec_getLecturerByAccountId(accountId) {
    try {
        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", accountId);
        
        if (!lecturerInfo) throw new Error("Không tìm thấy hồ sơ giảng viên!");

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", accountId);
        
        if (!userInfo) throw new Error("Tài khoản không tồn tại!");
       
        var result = {
            // Account
            fullName: userInfo.fullName,
            email: userInfo.email,
            phoneNumber: userInfo.phoneNumber,
            address: userInfo.address,
            nationalId: userInfo.nationalId,
            dob: userInfo.dob,

            // Lecturer
            lecturerId: lecturerInfo.lecturerId,
            degree: lecturerInfo.degree,
            specialization: lecturerInfo.specialization,
            startDate: lecturerInfo.startDate,
            // Custom
            teachingActivities: lecturerInfo.teachingActivities || [], // array
            achievements: lecturerInfo.achievements || [] // array
        };

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
function api_lec_getAllLecturers() {
    try {
        var lecturers = db_getAllRecords(CONFIG.TABLES.LECTURER);
        var accounts = db_getAllRecords(CONFIG.TABLES.ACCOUNT);

        if (lecturers.length === 0) {
            return JSON.stringify({ success: true, data: [] });
        }
        
        // Tạo Hash Map cho Account để truy xuất O(1)
        var accountDictionary = {};
        for (var i = 0; i < accounts.length; i++) {
            var acc = accounts[i];
            accountDictionary[acc.id] = acc;
        }

        var result = lecturers.map(function(lecturerInfo) {
            var userInfo = accountDictionary[lecturerInfo.accountId];

            return {
                lecturerId: lecturerInfo.lecturerId,
                degree: lecturerInfo.degree,
                specialization: lecturerInfo.specialization,
                startDate: lecturerInfo.startDate,
                cohort: lecturerInfo.cohort,
                programType: lecturerInfo.programType,

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
 * @description Thêm mới một Giảng viên vào hệ thống.
 * Sẽ tạo một bản ghi trên bảng ACCOUNT trước, sau đó dùng `accountId` để tạo bản ghi bên bảng LECTURER.
 * * @param {Object} lecturerData - Object chứa thông tin giảng viên mới. Yêu cầu bắt buộc phải có `fullName` và `degree`.
 * @returns {string} Chuỗi JSON chứa trạng thái `success`, `message`.
 */
function api_le_createLecturer(lecturerData) {
    try {
        if (!lecturerData.fullName || !lecturerData.degree) {
            throw new Error("Vui lòng nhập đầy đủ Họ tên và Trình độ của giảng viên!");
        }

        var currentAccountId = lecturerData.accountId;

        // TẠO TÀI KHOẢN (BẢNG ACCOUNT)
        if (!currentAccountId || currentAccountId.trim() === "") {
            currentAccountId = "ACC_" + new Date().getTime();
            
            var newAccountObject = {
                id: currentAccountId,
                fullName: lecturerData.fullName, 
                email: lecturerData.email || (currentAccountId + "@lecturer.hcmute.edu.vn"),
                number: lecturerData.number || "",
                nationalId: lecturerData.nationalId || "",
                address: lecturerData.address || "",
                password: lecturerData.password || "123", // Mật khẩu mặc định
                roleId: "LECTURER" // Hoặc truyền ID (vd: 1) tùy vào quy định của bảng Role
            };
            db_insert(CONFIG.TABLES.ACCOUNT, newAccountObject);
        }

        // TẠO THÔNG TIN HỌC VỤ (BẢNG LECTURER)
        var newLecturerId = lecturerData.lecturerId || ("LEC_" + new Date().getTime());

        var newLecturerObject = {
            lecturerId: newLecturerId,
            accountId: currentAccountId,
            classId: lecturerData.classId,
            major: lecturerData.major || "",
            cohort: lecturerData.cohort || "",
            programType: lecturerData.programType || ""
        };

        var isSuccess = db_insert(CONFIG.TABLES.LECTURER, newLecturerObject);

        if (isSuccess) {
            return JSON.stringify({ success: true, message: "Đã thêm giảng viên và tài khoản thành công!" });
        } else {
            throw new Error("Lỗi hệ thống: Không thể ghi dữ liệu vào Google Sheets.");
        }
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Cập nhật thông tin của một Giảng viên.
 * Hàm sẽ bóc tách dữ liệu để tự động cập nhật vào đúng bảng (ACCOUNT hoặc LECTURER).
 * * @param {string} lecturerId - Mã giảng viên cần cập nhật.
 * @param {Object} updateData - Object chứa các trường cần thay đổi.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `message`.
 */
function api_le_updateLecturer(lecturerId, updateData) {
    try {
        if (!lecturerId) throw new Error("Lỗi: Không xác định được mã giảng viên!");

        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "lecturerId", lecturerId);
        if (!lecturerInfo) throw new Error("Không tìm thấy giảng viên có mã [" + lecturerId + "].");

        var accountUpdates = {};
        var lecturerUpdates = {};

        // Phân loại data cho bảng ACCOUNT
        if (updateData.fullName) accountUpdates.fullName = updateData.fullName;
        if (updateData.email) accountUpdates.email = updateData.email;
        if (updateData.number) accountUpdates.number = updateData.number;
        if (updateData.nationalId) accountUpdates.nationalId = updateData.nationalId;
        if (updateData.address) accountUpdates.address = updateData.address;
        if (updateData.password) accountUpdates.password = updateData.password;

        // Phân loại data cho bảng LECTURER
        if (updateData.classId) lecturerUpdates.classId = updateData.classId;
        if (updateData.major) lecturerUpdates.major = updateData.major;
        if (updateData.cohort) lecturerUpdates.cohort = updateData.cohort;
        if (updateData.programType) lecturerUpdates.programType = updateData.programType;

        // 1. Cập nhật bảng Account (nếu có trường thay đổi)
        if (Object.keys(accountUpdates).length > 0 && lecturerInfo.accountId) {
            db_update(CONFIG.TABLES.ACCOUNT, "id", lecturerInfo.accountId, accountUpdates);
        }

        // 2. Cập nhật bảng LECTURER (nếu có trường thay đổi)
        var isSuccess = true;
        if (Object.keys(lecturerUpdates).length > 0) {
            isSuccess = db_update(CONFIG.TABLES.LECTURER, "lecturerId", lecturerId, lecturerUpdates);
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
 * @description Xóa vĩnh viễn dữ liệu của một Giảng viên khỏi hệ thống.
 * Kỹ thuật nâng cao: Xóa giảng viên đồng thời dọn dẹp luôn tài khoản Account liên kết để tránh rác dữ liệu.
 * * @param {string} lecturerId - Mã giảng viên cần xóa.
 * @returns {string} Chuỗi JSON chứa trạng thái `success` và `message`.
 */
function api_le_deleteLecturer(lecturerId) {
    try {
        if (!lecturerId) {
            throw new Error("Lỗi: Không xác định được mã giảng viên cần xóa!");
        }

        // Lấy thông tin giảng viên để biết đang dùng accountId nào
        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "lecturerId", lecturerId);
        if (!lecturerInfo) {
            throw new Error("Xóa thất bại: Không tìm thấy giảng viên có mã [" + lecturerId + "].");
        }

        // Xóa bên bảng Lecturer trước
        var isSuccess = db_delete(CONFIG.TABLES.LECTURER, "lecturerId", lecturerId);

        if (isSuccess) {
            // Xóa luôn tài khoản bên bảng Account
            if (lecturerInfo.accountId) {
                db_delete(CONFIG.TABLES.ACCOUNT, "id", lecturerInfo.accountId);
            }
            return JSON.stringify({ success: true, message: "Đã xóa giảng viên và tài khoản liên kết khỏi hệ thống!" });
        } else {
            throw new Error("Xóa thất bại do lỗi hệ thống.");
        }
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}