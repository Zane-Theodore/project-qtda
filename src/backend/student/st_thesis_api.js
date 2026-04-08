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

        // EXTRA: Lấy CouncilMember để lọc ra những ai là Thư ký hoặc Chủ tịch hội đồng
        var allCouncilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
        var excludedLecturerIds = {};
        
        allCouncilMembers.forEach(function (cm) {
            var pos = String(cm.position || cm.Position || cm.role || cm.Role || "").trim().toLowerCase();
            if (pos === "chủ tịch hội đồng" || pos === "thư ký hội đồng" || pos === "chairman" || pos === "secretary") {
                if (cm.lecturerId) {
                    excludedLecturerIds[String(cm.lecturerId)] = true;
                }
            }
        });

        // 3. Tạo Hash Map cho Lecturer theo accountId → O(1) lookup
        var lecturerMap = {};
        allLecturers.forEach(function (lec) {
            if (!excludedLecturerIds[String(lec.id)]) {
                lecturerMap[lec.accountId] = lec;
            }
        });

        // 4. COMBINE - Kết hợp dữ liệu Account + Lecturer
        var result = [];
        lecturerAccounts.forEach(function (acc) {
            var lecInfo = lecturerMap[acc.id];
            if (lecInfo) {
                result.push({
                    lecturerId: lecInfo.id,
                    lecturerCode: lecInfo.lecturerCode,
                    fullName: acc.fullName || "Chưa cập nhật",
                    email: acc.email || ""
                });
            }
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

/**
 * @description Lấy tiến độ các bài báo cáo của Sinh viên (Giả định lấy từ Spreadsheet db)
 * @param {string} accountId - ID tài khoản của sinh viên
 * @returns {string} JSON string chứa {success, data}
 */
function api_st_getStudentProgress(accountId) {
    try {
        if (!accountId) {
            throw new Error("Không xác định được tài khoản người dùng.");
        }

        // Lấy thông tin sinh viên từ accountId
        var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);
        if (!student) {
            throw new Error("Không tìm thấy thông tin Sinh viên liên kết với tài khoản này.");
        }

        // Lấy Đề tài của sinh viên (giả định 1 sinh viên có 1 đề tài active)
        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "studentId", student.id);
        if (!thesis) {
            throw new Error("Sinh viên chưa có đề tài KLTN nào được báo cáo.");
        }

        // Lấy các Submissions (báo cáo tiến độ)
        var allSubmissions = db_getAll(CONFIG.TABLES.SUBMISSION);
        var thesisSubmissions = allSubmissions.filter(function (sub) {
            return sub.thesisId === thesis.id;
        });

        // Định nghĩa 3 mốc cố định bắt buộc cho mọi sinh viên
        var expectedMilestones = [
            { id: "TienDo1", title: "Báo cáo tiến độ lần 1", deadline: "2026-03-15", description: "" },
            { id: "TienDo2", title: "Báo cáo tiến độ lần 2", deadline: "2026-04-15", description: "" },
            { id: "CuoiKy", title: "Nộp bài KLTN", deadline: "2026-05-15", description: "" }
        ];

        // Lấy Score để lấy comment (phản hồi) của GVHD (Supervisor)
        var allScores = db_getAll(CONFIG.TABLES.SCORE);

        // Map cấu trúc trả về dựa trên 3 mốc thời gian cố định
        var milestones = expectedMilestones.map(function (expected) {
            // Kiểm tra xem sinh viên đã nộp bài cho mốc này chưa
            var sub = thesisSubmissions.find(function (s) {
                return s.submissionType === expected.id;
            });

            // Xử lý status: đã nộp (tìm thấy bản ghi và có file) -> "COMPLETED", trống -> "PENDING"
            var isCompleted = !!sub && !!sub.pdfFile && sub.pdfFile.trim() !== "";

            // Tìm phản hồi nếu có (chỉ hiện khi đã nộp bài)
            var feedback = "";
            var idToReturn = expected.id; // hoặc sub.id nếu đã nộp để làm khóa
            if (isCompleted) {
                idToReturn = sub.id; // Ưu tiên trả ID thực lưu trong DB nếu đã có

                // Ưu tiên tìm điểm từ Supervisor cho cùng thesisId
                var score = allScores.find(function (sc) {
                    return sc.thesisId === thesis.id && sc.scoreType === "Supervisor";
                });
                // Dự phòng tìm điểm bất kỳ cho đề tài này
                if (!score) {
                    score = allScores.find(function (sc) { return sc.thesisId === thesis.id; });
                }
                if (score && score.comment) {
                    feedback = score.comment;
                }
            }

            return {
                id: expected.id, // Dùng expected.id (TienDo1, TienDo2, CuoiKy) làm mốc định danh giao diện
                dbId: isCompleted ? sub.id : "", // Truyền thêm dbId chuẩn nếu lỡ cần dùng backend
                title: expected.title,
                deadline: expected.deadline,
                status: isCompleted ? "COMPLETED" : "PENDING",
                feedback: feedback,
                description: expected.description
            };
        });

        // Tính % Tiến độ
        var completedCount = milestones.filter(function (m) { return m.status === "COMPLETED"; }).length;
        var totalCount = milestones.length;
        var progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

        var data = {
            progressPercent: progressPercent,
            milestones: milestones
        };

        return JSON.stringify({ success: true, data: data });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Hàm ghi đè File lên Google Drive từ dữ liệu blob Base64.
 * @param {string} base64Data - Chuỗi Base64 Data URI của file (từ FileReader)
 * @param {string} fileName - Tên file gốc
 * @returns {string} JSON với trạng thái
 */
function uploadFileToDrive(base64Data, fileName) {
    try {
        if (!base64Data || !fileName) {
            throw new Error("Không tìm thấy dữ liệu tệp đính kèm!");
        }

        // Tách scheme "data:application/pdf;base64," khỏi nội dung base64
        var splitBase = base64Data.split(',');
        var fileData = splitBase[1] || splitBase[0];

        // Decode Base64 thành byte array rỗng (đóng gói bằng File Blob Apps Script)
        var decoded = Utilities.base64Decode(fileData);
        var blob = Utilities.newBlob(decoded, "application/pdf", fileName);

        // Lưu file vào thư mục Drive 
        var folderId = "1-0dwSs10b1OmjorFxWMA7qukDgp9Jm5A";
        var folder = DriveApp.getFolderById(folderId);
        var newFile = folder.createFile(blob);
        var fileUrl = newFile.getUrl();

        return JSON.stringify({
            success: true,
            message: "Tệp '" + fileName + "' đã được lưu thành công trên Server!"
        });
    } catch (err) {
        return JSON.stringify({ success: false, error: err.message });
    }
}