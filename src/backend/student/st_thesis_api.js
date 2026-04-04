// File: src/backend/student/st_thesis_api.js

/**
 * @description Lấy danh sách tất cả Giảng viên có vai trò LECTURER.
 * Dùng để hiển thị danh sách chọn GVHD trong form đăng ký đề tài KLTN.
 * JOIN bảng ACCOUNT (role = LECTURER) với bảng LECTURER bằng Hash Map.
 * 
 * @returns {string} JSON. Nếu thành công: {success: true, data: [{lecturerId, fullName, email, lecturerCode}, ...]}
 *                   Nếu thất bại: {success: false, error: "message"}
 * 
 * @example
 * var result = api_st_getLecturers();
 * var parsed = JSON.parse(result);
 * if (parsed.success) {
 *   Logger.log("Số GV: " + parsed.data.length);
 * }
 */
function api_st_getLecturers() {
    try {
        // 1. QUERY - Lấy tất cả Account có role LECTURER
        var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);
        var lecturerAccounts = allAccounts.filter(function (acc) {
            return String(acc.role) === "LECTURER";
        });

        if (lecturerAccounts.length === 0) {
            return JSON.stringify({ success: true, data: [] });
        }

        // 2. QUERY - Lấy tất cả Lecturer
        var allLecturers = db_getAll(CONFIG.TABLES.LECTURER);

        // 3. Tạo Hash Map cho Lecturer theo accountId → O(1) lookup
        var lecturerMap = {};
        allLecturers.forEach(function (lec) {
            lecturerMap[lec.accountId] = lec;
        });

        // 4. COMBINE - Kết hợp dữ liệu Account + Lecturer
        var result = lecturerAccounts.map(function (acc) {
            var lecInfo = lecturerMap[acc.id];
            return {
                lecturerId: lecInfo ? lecInfo.id : "",
                lecturerCode: lecInfo ? lecInfo.lecturerCode : "",
                fullName: acc.fullName || "Chưa cập nhật",
                email: acc.email || ""
            };
        });

        // 5. RETURN
        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        Logger.log("ERROR [api_st_getLecturers]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Kiểm tra sinh viên đã đăng ký đề tài KLTN chưa thông qua accountId.
 * Trả về thông tin đề tài nếu đã đăng ký, hoặc null nếu chưa.
 * 
 * @param {string} accountId - ID tài khoản (AccountId).
 * @returns {string} JSON. Nếu thành công: {success: true, data: {thesis object} hoặc null}
 */
function api_st_getStudentThesis(accountId) {
    try {
        // 1. VALIDATION
        if (!accountId || String(accountId).trim() === "") {
            throw new Error("Mã tài khoản không được để trống.");
        }

        // Tìm thông tin Sinh viên từ accountId
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);
        if (!studentInfo) {
            throw new Error("Không tìm thấy thông tin sinh viên cho tài khoản này.");
        }
        var studentId = studentInfo.studentId;

        // 2. QUERY - Tìm Thesis của sinh viên
        var allTheses = db_getAll(CONFIG.TABLES.THESIS);
        var studentThesis = null;

        var studentId_PK = String(studentInfo.id || studentInfo.studentId).toLowerCase();
        var studentCode = String(studentInfo.studentCode).toLowerCase();
        var accId = String(studentInfo.accountId).toLowerCase();

        for (var i = 0; i < allTheses.length; i++) {
            var t_sId = String(allTheses[i].studentId).toLowerCase();
            if (t_sId === studentId_PK || t_sId === studentCode || t_sId === accId) {
                studentThesis = allTheses[i];
                break;
            }
        }

        // 3. Nếu chưa đăng ký
        if (!studentThesis) {
            return JSON.stringify({ success: true, data: null });
        }

        // 4. DATA PROCESSING - Lấy tên GVHD
        var supervisorName = "";
        if (studentThesis.supervisorId) {
            var lecInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "id", studentThesis.supervisorId);
            if (lecInfo && lecInfo.accountId) {
                var accInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", lecInfo.accountId);
                supervisorName = accInfo ? accInfo.fullName : "";
            }
        }

        // 5. COMBINE
        var result = {
            id: studentThesis.id,
            title: studentThesis.title || "",
            description: studentThesis.description || "",
            format: studentThesis.format || "",
            status: studentThesis.status || "",
            supervisorId: studentThesis.supervisorId || "",
            supervisorName: supervisorName,
            reviewerId: studentThesis.reviewerId || "",
            councilId: studentThesis.councilId || ""
        };

        // 6. RETURN
        return JSON.stringify({ success: true, data: result });

    } catch (error) {
        Logger.log("ERROR [api_st_getStudentThesis]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Đăng ký đề tài Khóa luận tốt nghiệp cho sinh viên.
 * Validate input, kiểm tra trùng lặp, rồi insert bản ghi mới vào bảng Thesis.
 * 
 * @param {Object} thesisData - Object chứa thông tin đề tài.
 * @param {string} thesisData.title - Tên đề tài KLTN.
 * @param {string} thesisData.description - Mô tả đề tài.
 * @param {string} thesisData.format - Hình thức KLTN.
 * @param {string} thesisData.supervisorId - ID giảng viên hướng dẫn (Lecturer.id).
 * @param {string} thesisData.accountId - ID tài khoản của sinh viên.
 * @returns {string} JSON. Nếu thành công: {success: true, message: "..."}
 *                   Nếu thất bại: {success: false, error: "message"}
 */
function api_st_registerThesis(thesisData) {
    try {
        // 1. VALIDATION
        if (!thesisData) {
            throw new Error("Dữ liệu đăng ký không được để trống.");
        }
        if (!thesisData.title || String(thesisData.title).trim() === "") {
            throw new Error("Vui lòng nhập tên đề tài khóa luận.");
        }
        if (!thesisData.description || String(thesisData.description).trim() === "") {
            throw new Error("Vui lòng nhập mô tả đề tài.");
        }
        if (!thesisData.format || String(thesisData.format).trim() === "") {
            throw new Error("Vui lòng chọn hình thức KLTN.");
        }
        if (!thesisData.supervisorId || String(thesisData.supervisorId).trim() === "") {
            throw new Error("Vui lòng chọn Giảng viên hướng dẫn.");
        }
        if (!thesisData.accountId || String(thesisData.accountId).trim() === "") {
            throw new Error("Không xác định được tài khoản sinh viên.");
        }

        // Lấy studentId từ accountId
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", thesisData.accountId);
        if (!studentInfo) {
            throw new Error("Không tìm thấy thông tin sinh viên cho tài khoản này.");
        }

        var studentId_PK = String(studentInfo.id || studentInfo.studentId);
        var search_studentId_PK = studentId_PK.toLowerCase();
        var search_studentCode = String(studentInfo.studentCode).toLowerCase();
        var search_accId = String(studentInfo.accountId).toLowerCase();

        // 2. CHECK DUPLICATE - Kiểm tra sinh viên đã đăng ký chưa
        var allTheses = db_getAll(CONFIG.TABLES.THESIS);
        var existingThesis = allTheses.filter(function (t) {
            var t_sId = String(t.studentId).toLowerCase();
            return (t_sId === search_studentId_PK || t_sId === search_studentCode || t_sId === search_accId);
        });

        if (existingThesis.length > 0) {
            throw new Error("Bạn đã đăng ký đề tài KLTN rồi. Không thể đăng ký thêm.");
        }

        // 3. Kiểm tra GVHD có tồn tại không
        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "id", thesisData.supervisorId);
        if (!lecturerInfo) {
            throw new Error("Giảng viên hướng dẫn không tồn tại trong hệ thống.");
        }

        // 4. INSERT - Tạo bản ghi mới trong bảng Thesis
        var newThesisId = "DT001";
        if (allTheses.length > 0) {
            var maxIdNum = 0;
            for (var j = 0; j < allTheses.length; j++) {
                var currentId = String(allTheses[j].id || ""); // Primary key column is usually 'id'
                if (currentId.indexOf("DT") === 0) {
                    var numVal = parseInt(currentId.substring(2), 10);
                    if (!isNaN(numVal) && numVal > maxIdNum) {
                        maxIdNum = numVal;
                    }
                }
            }
            maxIdNum++;
            var numStr = String(maxIdNum);
            if (numStr.length === 1) numStr = "00" + numStr;
            else if (numStr.length === 2) numStr = "0" + numStr;
            newThesisId = "DT" + numStr;
        }

        var newThesisObject = {
            id: newThesisId,
            title: String(thesisData.title).trim(),
            description: String(thesisData.description).trim(),
            descriptionFile: "",
            format: String(thesisData.format).trim(),
            status: "PENDING", // PENDING, APPROVED, REJECTED
            studentId: studentId_PK,
            supervisorId: String(thesisData.supervisorId),
            reviewerId: "",
            councilId: ""
        };

        var isSuccess = db_insert(CONFIG.TABLES.THESIS, newThesisObject);

        if (isSuccess) {
            return JSON.stringify({
                success: true,
                message: "Đăng ký đề tài KLTN thành công! Đề tài đang chờ duyệt.",
                thesisId: newThesisId
            });
        } else {
            throw new Error("Lỗi hệ thống: Không thể ghi dữ liệu vào Google Sheets.");
        }

    } catch (error) {
        Logger.log("ERROR [api_st_registerThesis]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}
