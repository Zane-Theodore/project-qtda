// File: src/backend/student/st_result_api.js

/**
 * @description Lấy kết quả đề tài KLTN cho sinh viên, bao gồm Điểm số, Nhận xét, Biên bản Hội đồng và Tình trạng nộp Báo cáo hoàn thiện.
 * 
 * @param {string} accountId - ID của sinh viên đang thao tác.
 * @returns {string} JSON. Thành công: {success: true, data: {score, reviewerComment, committeeComment, reportFileUrl, isFinalSubmitted}}
 */
function api_st_getThesisResult(accountId) {
    try {
        if (!accountId) throw new Error("Mã tài khoản không hợp lệ.");

        // Kiểm tra cache trước (tránh gọi 5 lần db_getAll mỗi lần load)
        var cache = CacheService.getScriptCache();
        var cacheKey = 'result_' + String(accountId);
        var cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // 1. Lấy thông tin Sinh viên
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);
        if (!studentInfo) throw new Error("Không tìm thấy sinh viên thuộc tài khoản này.");

        // 2. Tìm Thesis (Đề tài) của sinh viên
        var allTheses = db_getAll(CONFIG.TABLES.THESIS);
        var thesis = null;
        var studentId_PK = String(studentInfo.id || studentInfo.studentId).toLowerCase();
        var studentCode = String(studentInfo.studentCode).toLowerCase();
        
        for (var i = 0; i < allTheses.length; i++) {
            var t_sId = String(allTheses[i].studentId).toLowerCase();
            if (t_sId === studentId_PK || t_sId === studentCode || t_sId === String(accountId).toLowerCase()) {
                thesis = allTheses[i];
                break;
            }
        }

        // Nếu chưa đăng ký đề tài
        if (!thesis) {
            return JSON.stringify({ 
                success: true, 
                data: {
                    score: null,
                    reviewerComment: null,
                    committeeComment: null,
                    reportFileUrl: null,
                    isFinalSubmitted: false
                }
            });
        }

        // 3. Lấy Điểm & Nhận xét từ bảng Score
        var allScores = db_getAll(CONFIG.TABLES.SCORE);
        var thesisScores = allScores.filter(function(s) {
            return String(s.thesisId) === String(thesis.id);
        });

        var finalScore = null;
        var reviewerComment = "";
        var committeeComment = "";

        if (thesisScores.length > 0) {
            var totalScore = 0;
            var scoreCount = 0;
            
            thesisScores.forEach(function(s) {
                var sVal = parseFloat(s.scoreValue);
                if (!isNaN(sVal)) {
                    totalScore += sVal;
                    scoreCount++;
                }

                if (s.scoreType === "Reviewer" || s.scoreType === "Supervisor") {
                    if (s.comment) reviewerComment += s.comment + " ";
                }
                if (s.scoreType === "Council") {
                    if (s.comment) committeeComment += s.comment + " ";
                }
            });

            // Tính điểm trung bình cộng của các vòng đánh giá
            if (scoreCount > 0) {
                finalScore = (totalScore / scoreCount).toFixed(1);
            }
        }

        // 4. Lấy Biên bản Hội đồng (EvaluationRecord)
        var allEvals = db_getAll(CONFIG.TABLES.EVALUATION_RECORD);
        var evalRecord = allEvals.filter(function(e) {
            return String(e.thesisId) === String(thesis.id);
        });
        var reportFileUrl = null;
        if (evalRecord.length > 0 && evalRecord[0].pdfFile) {
            reportFileUrl = evalRecord[0].pdfFile;
        }

        // 5. Kiểm tra Tình trạng Nộp Báo cáo hoàn thiện (Submission)
        var allSubs = db_getAll(CONFIG.TABLES.SUBMISSION);
        var submissions = allSubs.filter(function(s) {
            return String(s.thesisId) === String(thesis.id) && String(s.submissionType) === "Final";
        });
        var isFinalSubmitted = submissions.length > 0;

        // 6. Trả về format chuẩn và lưu vào cache 5 phút
        var resultJson = JSON.stringify({
            success: true,
            data: {
                score: finalScore,
                reviewerComment: reviewerComment.trim(),
                committeeComment: committeeComment.trim(),
                reportFileUrl: reportFileUrl,
                isFinalSubmitted: isFinalSubmitted
            }
        });
        try { cache.put(cacheKey, resultJson, 300); } catch(e) { /* bỏ qua nếu quá lớn */ }
        return resultJson;

    } catch (error) {
        Logger.log("ERROR [api_st_getThesisResult]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Xử lý Upload báo cáo hoàn thiện dưới dạng Base64 string.
 * Tạo file trên Google Drive, cập nhật quyền đọc và lưu vào bảng Submission.
 * 
 * @param {string} accountId - ID của sinh viên.
 * @param {string} base64Data - Dữ liệu base64 của file.
 * @param {string} filename - Tên file gốc.
 * @param {string} mimeType - Định dạng file (PDF, DOCX,...).
 * @returns {string} JSON string chứa fileUrl nếu thành công.
 */
function api_st_uploadFinalSubmission(accountId, base64Data, filename, mimeType) {
    try {
        if (!accountId || !base64Data) {
            throw new Error("Dữ liệu tải lên bị trống hoặc không hợp lệ.");
        }

        // Lấy thông tin sinh viên
        var studentInfo = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);
        if (!studentInfo) throw new Error("Không tìm thấy thông tin sinh viên.");

        // Xác minh Đề tài
        var allTheses = db_getAll(CONFIG.TABLES.THESIS);
        var thesis = null;
        var studentId_PK = String(studentInfo.id || studentInfo.studentId).toLowerCase();
        var studentCode = String(studentInfo.studentCode).toLowerCase();
        
        for (var i = 0; i < allTheses.length; i++) {
            var t_sId = String(allTheses[i].studentId).toLowerCase();
            if (t_sId === studentId_PK || t_sId === studentCode || t_sId === String(accountId).toLowerCase()) {
                thesis = allTheses[i];
                break;
            }
        }

        if (!thesis) throw new Error("Bạn chưa đăng ký Đề tài Khóa luận. Không thể nộp Báo cáo.");

        // 1. Tạo folder trên Google Drive nếu chưa có (Tránh vứt file vào Root Drive làm lộn xộn)
        var scriptProps = PropertiesService.getScriptProperties();
        var folderId = scriptProps.getProperty('THESIS_FOLDER_ID');
        var folder = null;
        
        if (folderId) {
            try {
                folder = DriveApp.getFolderById(folderId);
            } catch(e) {
                // Folder bị xóa
                folder = null;
            }
        }
        
        if (!folder) {
            var foldersIter = DriveApp.getFoldersByName("Thesis_Submissions");
            if (foldersIter.hasNext()) {
                folder = foldersIter.next();
            } else {
                folder = DriveApp.createFolder("Thesis_Submissions");
            }
            scriptProps.setProperty('THESIS_FOLDER_ID', folder.getId());
        }

        // 2. Decode Base64 và tạo File
        // Đặt tên file Format: MSSV_Final_TenFileGoc
        var safeCode = studentInfo.studentCode ? studentInfo.studentCode : ("ID" + studentId_PK);
        var newFileName = safeCode + "_Final_" + filename;
        
        var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, newFileName);
        var file = folder.createFile(blob);
        
        // Xét quyền để Hội đồng / Frontend xem được link
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        var fileUrl = file.getUrl();

        // 3. Cập nhật record vào Database (Bảng Submission)
        var allSubs = db_getAll(CONFIG.TABLES.SUBMISSION);
        var existingSub = allSubs.filter(function(s) {
            return String(s.thesisId) === String(thesis.id) && String(s.submissionType) === "Final";
        });

        // Ngày nộp hiện tại
        var submitDate = new Date().toISOString(); // Hoặc format "YYYY-MM-DD" nếu DB dùng format khác, nhưng ISO là chuẩn nhất

        if (existingSub.length > 0) {
            // Update
            db_update(CONFIG.TABLES.SUBMISSION, "id", existingSub[0].id, {
                pdfFile: fileUrl,
                submittedAt: submitDate
            });
        } else {
            // Insert mới
            var newSubId = "SUB_" + new Date().getTime();
            db_insert(CONFIG.TABLES.SUBMISSION, {
                id: newSubId,
                thesisId: thesis.id,
                title: "Báo cáo cuối kỳ: " + (thesis.title || ""),
                pdfFile: fileUrl,
                submissionType: "Final",
                submittedAt: submitDate
            });
        }

        // Xóa cache kết quả để lần tải sau luôn hiện trạng thái mới nhất
        try {
            CacheService.getScriptCache().remove('result_' + String(accountId));
        } catch(e) {}

        return JSON.stringify({
            success: true,
            fileUrl: fileUrl,
            message: "Upload tài liệu thành công."
        });

    } catch (error) {
        Logger.log("ERROR [api_st_uploadFinalSubmission]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}
