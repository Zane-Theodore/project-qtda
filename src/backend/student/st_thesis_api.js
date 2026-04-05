// File: src/backend/student/st_thesis_api.js

/**
 * Lấy tiến độ các bài báo cáo của Sinh viên (Giả định lấy từ Spreadsheet db)
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
 * Hàm ghi đè File lên Google Drive từ dữ liệu blob Base64.
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
