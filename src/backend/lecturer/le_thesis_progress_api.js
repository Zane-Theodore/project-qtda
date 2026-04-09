// File: src/backend/lecturer/le_thesis_progress_api.js

/**
 * Lấy tổng quan và danh sách sinh viên cùng tiến độ đề tài do GV quản lý
 * @param {string} accountId - Account ID của người dùng đang đăng nhập
 */
function api_le_getThesesProgress(accountId) {
    try {
        // 1. Tìm Lecturer ID thông qua accountId
        var lecturer = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", accountId);
        if (!lecturer) throw new Error("Tài khoản chưa được liên kết với Giảng viên");
        
        var lecturerId = lecturer.id; // PK của giảng viên

        // 2. Lấy tất cả Theses có GV này là hướng dẫn (supervisorId)
        var allTheses = db_getAll(CONFIG.TABLES.THESIS);
        var myTheses = allTheses.filter(function(t) {
            return t.supervisorId === lecturerId;
        });

        // 3. Lấy thông tin về Sinh Viên + Mảng các Submission + Account name
        var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
        var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);
        var allSubmissions = db_getAll(CONFIG.TABLES.SUBMISSION);

        // Tạo look-up table Account, Student
        var accountMap = {};
        allAccounts.forEach(function(acc) { accountMap[acc.id] = acc; });

        var studentMap = {};
        allStudents.forEach(function(st) { studentMap[st.id] = st; });

        var thesesData = [];
        var overview = {
            total: myTheses.length,
            submitted: 0,
            inProgress: 0,
            overdue: 0
        };

        var now = new Date(); // Dùng để kiểm tra trễ hạn

        myTheses.forEach(function(thesis) {
            // Count status
            if (thesis.status === "Đã nộp" || thesis.status === "Đã Nộp") {
                overview.submitted++;
            } else if (thesis.status === "Đang thực hiện") {
                overview.inProgress++;
            }

            // Tìm thông tin SV
            // Sửa tùy theo db, có thể studentId của Bảng Thesis khớp ID của bảng Student
            var student = studentMap[thesis.studentId];
            var studentFullName = "--";
            if (student) {
                var acc = accountMap[student.accountId];
                if (acc && acc.fullName) {
                    studentFullName = acc.fullName;
                } else if (student.fullName) {
                    studentFullName = student.fullName;
                }
            }

            // Lấy Submissions cho Thesis
            var submissions = allSubmissions.filter(function(sub) {
                return sub.thesisId === thesis.id;
            });

            // Sort submissions by creation time if needed, though they are usually in order
            var isOverdue = false;
            submissions.forEach(function(sub) {
                if (sub.deadline && (!sub.pdfFile || sub.pdfFile.trim() === "")) {
                    var deadlineDate = new Date(sub.deadline);
                    if (!isNaN(deadlineDate) && deadlineDate < now) {
                        isOverdue = true;
                    }
                }
            });

            if (isOverdue) {
                overview.overdue++;
            }

            thesesData.push({
                thesisId: thesis.id,
                thesisTitle: thesis.title,
                status: thesis.status, // "Đã nộp", "Đang thực hiện"
                studentId: thesis.studentId,
                studentFullName: studentFullName,
                isOverdue: isOverdue,
                submissions: submissions.map(function(s) {
                    return {
                        id: s.id,
                        title: s.title,
                        description: s.description,
                        pdfFile: s.pdfFile,
                        submissionType: s.submissionType,
                        submittedAt: s.submittedAt,
                        deadline: s.deadline,
                        comment: s.comment,
                        lectureApproved: s.lectureApproved
                    };
                })
            });
        });

        return JSON.stringify({ 
            success: true, 
            data: {
                overview: overview,
                theses: thesesData
            }
        });
    } catch (error) {
        Logger.log("ERROR [api_le_getThesesProgress]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Thêm bài tập mới (Submission task)
 * @param {Object} payload - { thesisId, title, description, submissionType, deadline }
 */
function api_le_addSubmissionTask(payload) {
    try {
        if (!payload.thesisId) throw new Error("Chưa chọn sinh viên (Đề tài)");
        if (!payload.title) throw new Error("Chưa nhập tiêu đề");
        if (!payload.submissionType) throw new Error("Chưa chọn loại bài tập");

        var newId = "BC" + new Date().getTime(); // BC001..

        var newSubmission = {
            id: newId,
            thesisId: payload.thesisId,
            title: payload.title,
            description: payload.description || "",
            pdfFile: "",
            submissionType: payload.submissionType,
            submittedAt: "",
            presidentApproved: "FALSE", // Default
            lectureApproved: "FALSE", // Default
            comment: "",
            deadline: payload.deadline || ""
        };

        db_insert(CONFIG.TABLES.SUBMISSION, newSubmission);

        return JSON.stringify({ success: true, message: "Thêm bài tập thành công!" });
    } catch (error) {
        Logger.log("ERROR [api_le_addSubmissionTask]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Cập nhật bài tập đã giao (Ghi đè tiêu đề, mô tả, deadline)
 */
function api_le_updateSubmissionTask(submissionId, payload) {
    try {
        if (!submissionId) throw new Error("Thiếu ID bài nộp");

        var existing = db_findRecordByColumn(CONFIG.TABLES.SUBMISSION, "id", submissionId);
        if (!existing) throw new Error("Bài nộp không tồn tại");

        var updateData = {};
        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.deadline !== undefined) updateData.deadline = payload.deadline;

        db_update(CONFIG.TABLES.SUBMISSION, "id", submissionId, updateData);

        return JSON.stringify({ success: true, message: "Cập nhật bài tập thành công!" });
    } catch (error) {
        Logger.log("ERROR [api_le_updateSubmissionTask]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Cập nhật nhận xét cho bài tập (Phản hồi của GV)
 */
function api_le_feedbackSubmission(submissionId, comment) {
    try {
        if (!submissionId) throw new Error("Thiếu ID bài nộp");

        var existing = db_findRecordByColumn(CONFIG.TABLES.SUBMISSION, "id", submissionId);
        if (!existing) throw new Error("Bài nộp không tồn tại");

        db_update(CONFIG.TABLES.SUBMISSION, "id", submissionId, {
            comment: comment || ""
        });

        return JSON.stringify({ success: true, message: "Đã lưu phản hồi!" });
    } catch (error) {
        Logger.log("ERROR [api_le_feedbackSubmission]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Phê duyệt báo cáo KLTN (Đối với bài Final)
 */
function api_le_approveFinalSubmission(submissionId, isApproved) {
    try {
        if (!submissionId) throw new Error("Thiếu ID bài nộp");

        var existing = db_findRecordByColumn(CONFIG.TABLES.SUBMISSION, "id", submissionId);
        if (!existing) throw new Error("Bài báo cáo cuối cùng không tồn tại");

        // Convert bool to string if needed by table structure, or just save Boolean. 
        // Using string "TRUE"/"FALSE" as default approach, but assuming actual boolean values depending on your sheet structure
        var approvalVal = isApproved ? "TRUE" : "FALSE"; 
        // If your sheets use actual booleans, replace with simply isApproved.

        db_update(CONFIG.TABLES.SUBMISSION, "id", submissionId, {
            lectureApproved: approvalVal
        });

        return JSON.stringify({ success: true, message: "Đã cập nhật trạng thái phê duyệt!" });
    } catch (error) {
        Logger.log("ERROR [api_le_approveFinalSubmission]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}
