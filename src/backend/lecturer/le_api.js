// File: src/backend/lecturer/le_api.js

/**
 * Lấy thông tin chi tiết giảng viên theo mã giảng viên
 * @param {string} lecturerId - Mã giảng viên cần tìm kiếm
 * @returns {string} JSON string chứa {success, data} hoặc {success, error}
 * @description Tự động JOIN với bảng ACCOUNT để lấy thông tin liên hệ
 */
function api_lec_getLecturerById(lecturerId) {
    try {
        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "lecturerId", lecturerId);
        if (!lecturerInfo) throw new Error("Không tìm thấy hồ sơ giảng viên cho mã: " + lecturerId);

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", lecturerInfo.accountId);
        if (!userInfo) throw new Error("Tài khoản không tồn tại!");

        var lecturerData = {
            fullName: userInfo.fullName,
            email: userInfo.email,
            phoneNumber: userInfo.phoneNumber,
            address: userInfo.address,
            nationalId: userInfo.nationalId,
            dob: userInfo.dob,

            lecturerId: lecturerInfo.lecturerCode,
            yearsOfService: lecturerInfo.yearsOfService,
        };

        return JSON.stringify({ success: true, data: lecturerData });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Lấy thông tin hồ sơ giảng viên theo mã tài khoản
 * @param {string} accountId - ID tài khoản (truyền từ Frontend sau khi đăng nhập)
 * @returns {string} JSON string chứa {success, data} hoặc {success, error}
 * @description Được gọi từ Frontend để lấy dữ liệu hồ sơ, bao gồm hoạt động đào tạo và thành tựu khen thưởng
 */
function api_lec_getLecturerByAccountId(accountId) {
    try {
        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", accountId);
        if (!lecturerInfo) throw new Error("Không tìm thấy hồ sơ giảng viên cho tài khoản: " + accountId);

        var userInfo = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "id", accountId);
        if (!userInfo) throw new Error("Tài khoản không tồn tại!");

        var allTeachingActivities = db_getAll(CONFIG.TABLES.TEACHING_ACTIVITY);
        var myTeachingActivities = allTeachingActivities.filter(function (item) {
            return item.lecturerId == lecturerInfo.id;
        });

        var allAchievements = db_getAll(CONFIG.TABLES.ACHIEVEMENT);
        var myAchievements = allAchievements.filter(function (item) {
            return item.lecturerId == lecturerInfo.id;
        });

        var profileData = {
            fullName: userInfo.fullName,
            email: userInfo.email,
            phoneNumber: userInfo.phoneNumber,
            address: userInfo.address,
            nationalId: userInfo.nationalId,
            dob: userInfo.dob,

            lecturerId: lecturerInfo.lecturerCode,
            yearsOfService: lecturerInfo.yearsOfService,

            teachingActivities: myTeachingActivities,
            achievements: myAchievements
        };

        return JSON.stringify({ success: true, data: profileData });

    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

function getCurrentUser() {
    const email = Session.getActiveUser().getEmail();

    var user = db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "email", email);

    return {
        id: user.id,
        fullName: user.fullName,
        role: user.role         // student / lecturer
    };
}

// ==========================================
// HOD THESIS APPROVAL APIS
// ==========================================

/**
 * Lấy tất cả đề tài kèm thông tin sinh viên và giảng viên hướng dẫn
 */
function api_hod_getAllTheses() {
    try {
        var theses = db_getAll(CONFIG.TABLES.THESIS);
        var students = db_getAll(CONFIG.TABLES.STUDENT);
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);
        var lecturers = db_getAll(CONFIG.TABLES.LECTURER);

        // Tạo maps để join nhanh
        var studentMap = {};
        students.forEach(function (s) { studentMap[s.id] = s; });

        var accountMap = {};
        accounts.forEach(function (a) { accountMap[a.id] = a; });

        var lecturerMap = {};
        lecturers.forEach(function (l) { lecturerMap[l.id] = l; });

        var thesisList = theses.map(function (thesis) {
            var student = studentMap[thesis.studentId];
            var studentAccount = student ? accountMap[student.accountId] : null;
            var supervisor = lecturerMap[thesis.supervisorId];
            var supervisorAccount = supervisor ? accountMap[supervisor.accountId] : null;

            return {
                id: thesis.id,
                title: thesis.title,
                studentName: studentAccount ? studentAccount.fullName : "N/A",
                studentId: thesis.studentId, // need to notify
                studentAccountId: student ? student.accountId : null,
                status: thesis.status,
                descriptionFile: thesis.descriptionFile,
                supervisorId: thesis.supervisorId,
                supervisorName: supervisorAccount ? supervisorAccount.fullName : "Chưa phân công"
            };
        });

        // sắp xếp mới nhất lên đầu, hoặc theo thứ tự mặc định
        return JSON.stringify({ success: true, data: thesisList });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Lấy danh sách giảng viên để phân công
 */
function api_hod_getAllLecturers() {
    try {
        var lecturers = db_getAll(CONFIG.TABLES.LECTURER);
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);

        var accountMap = {};
        accounts.forEach(function (a) { accountMap[a.id] = a; });

        var result = lecturers.map(function (l) {
            var account = accountMap[l.accountId];
            return {
                id: l.id,
                fullName: account ? account.fullName : "N/A"
            };
        });

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Duyệt đề tài (Đồng ý) và chuyển trạng thái sang Chờ duyệt
 */
function api_hod_approveThesis(thesisId, newSupervisorId, comment) {
    try {
        var existing = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!existing) throw new Error("Đề tài không tồn tại");

        var updateData = { status: "Chờ duyệt" };
        if (newSupervisorId) {
            updateData.supervisorId = newSupervisorId;
        }

        // Append comment vào cột comment nếu có
        if (comment && comment.trim()) {
            var timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
            var newEntry = "[Trưởng BM - " + timestamp + "]: " + comment.trim();
            var existingComment = existing.comment || "";
            updateData.comment = existingComment ? existingComment + "\n" + newEntry : newEntry;
        }

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, updateData);

        return JSON.stringify({ success: true, message: "Đã duyệt đề tài thành công!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * HOD thêm nhận xét vào đề tài (append, không ghi đè)
 */
function api_hod_addComment(thesisId, comment) {
    try {
        if (!comment || !comment.trim()) throw new Error("Nội dung nhận xét không được để trống");

        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) throw new Error("Đề tài không tồn tại");

        var currentUser = getCurrentUser();
        var timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
        var newEntry = "[Trưởng BM - " + timestamp + "]: " + comment.trim();

        var existingComment = thesis.comment || "";
        var updatedComment = existingComment ? existingComment + "\n" + newEntry : newEntry;

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, { comment: updatedComment });

        // Gửi thông báo cho sinh viên
        var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "id", thesis.studentId);
        if (student) {
            var commentNotifId = "NOTIF_" + new Date().getTime();
            db_insert(CONFIG.TABLES.NOTIFICATION, {
                id: commentNotifId,
                senderId: currentUser.id,
                receiverId: student.accountId,
                title: "Trưởng BM đã nhận xét đề tài",
                content: "Đề tài '" + thesis.title + "' có nhận xét mới từ Trưởng Bộ môn: " + comment.trim(),
                createdAt: new Date().toISOString(),
                isRead: false
            });
        }

        return JSON.stringify({ success: true, message: "Đã gửi nhận xét thành công!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Từ chối đề tài
 */
function api_hod_rejectThesis(thesisId, comment) {
    try {
        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) throw new Error("Đề tài không tồn tại");

        var updateData = { status: "Từ chối" };

        // Append comment vào cột comment nếu có
        if (comment && comment.trim()) {
            var timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
            var newEntry = "[Trưởng BM - " + timestamp + "]: " + comment.trim();
            var existingComment = thesis.comment || "";
            updateData.comment = existingComment ? existingComment + "\n" + newEntry : newEntry;

            // Gửi notification cho sinh viên
            var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "id", thesis.studentId);
            if (student) {
                var rejectNotifId = "NOTIF_" + new Date().getTime();
                var currentUser = getCurrentUser();
                db_insert(CONFIG.TABLES.NOTIFICATION, {
                    id: rejectNotifId,
                    senderId: currentUser.id,
                    receiverId: student.accountId,
                    title: "Đề tài bị từ chối",
                    content: "Đề tài '" + thesis.title + "' của bạn đã bị từ chối với lý do: " + comment.trim(),
                    createdAt: new Date().toISOString(),
                    isRead: false
                });
            }
        }

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, updateData);

        return JSON.stringify({ success: true, message: "Đã từ chối đề tài và gửi thông báo!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

// ==========================================
// LECTURER THESIS APPROVAL APIS
// ==========================================

/**
 * Lấy tất cả đề tài do LECTURER đó hướng dẫn
 */
function api_lec_getAssignedTheses(accountId) {
    try {
        var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", accountId);
        if (!lecturerInfo) throw new Error("Không tìm thấy thông tin giảng viên");

        var theses = db_getAll(CONFIG.TABLES.THESIS);
        var students = db_getAll(CONFIG.TABLES.STUDENT);
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);

        var studentMap = {};
        students.forEach(function (s) { studentMap[s.id] = s; });

        var accountMap = {};
        accounts.forEach(function (a) { accountMap[a.id] = a; });

        var myTheses = theses.filter(function (t) {
            return t.supervisorId === lecturerInfo.id;
        });

        var result = myTheses.map(function (thesis) {
            var student = studentMap[thesis.studentId];
            var studentAccount = student ? accountMap[student.accountId] : null;

            return {
                id: thesis.id,
                title: thesis.title,
                format: thesis.format || "Chưa có hình thức",
                studentName: studentAccount ? studentAccount.fullName : "N/A",
                studentId: thesis.studentId,
                status: thesis.status,
                descriptionFile: thesis.descriptionFile
            };
        });

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * GVHD đồng ý hướng dẫn và lưu tên sửa đổi (nếu có)
 */
function api_lec_approveThesis(thesisId, newTitle, comment) {
    try {
        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) throw new Error("Đề tài không tồn tại");

        var updateData = {
            status: "Đã duyệt",
            title: newTitle || thesis.title
        };

        // Append comment vào cột comment nếu có
        if (comment && comment.trim()) {
            var timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
            var newEntry = "[GVHD - " + timestamp + "]: " + comment.trim();
            var existingComment = thesis.comment || "";
            updateData.comment = existingComment ? existingComment + "\n" + newEntry : newEntry;
        }

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, updateData);

        return JSON.stringify({ success: true, message: "Đã duyệt đề tài thành công!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * GVHD thêm nhận xét vào đề tài (append, không ghi đè)
 */
function api_lec_addComment(thesisId, comment) {
    try {
        if (!comment || !comment.trim()) throw new Error("Nội dung nhận xét không được để trống");

        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) throw new Error("Đề tài không tồn tại");

        var currentUser = getCurrentUser();
        var timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
        var newEntry = "[GVHD - " + timestamp + "]: " + comment.trim();

        var existingComment = thesis.comment || "";
        var updatedComment = existingComment ? existingComment + "\n" + newEntry : newEntry;

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, { comment: updatedComment });

        // Gửi thông báo cho sinh viên
        var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "id", thesis.studentId);
        if (student) {
            var notifId = "NOTIF_" + new Date().getTime();
            db_insert(CONFIG.TABLES.NOTIFICATION, {
                id: notifId,
                senderId: currentUser.id,
                receiverId: student.accountId,
                title: "GVHD đã nhận xét đề tài",
                content: "Đề tài '" + thesis.title + "' có nhận xét mới từ Giảng viên hướng dẫn: " + comment.trim(),
                createdAt: new Date().toISOString(),
                isRead: false
            });
        }

        return JSON.stringify({ success: true, message: "Đã gửi nhận xét thành công!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * GVHD từ chối đề tài
 */
function api_lec_rejectThesis(thesisId, comment) {
    try {
        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) throw new Error("Đề tài không tồn tại");

        var updateData = { status: "GVHD từ chối" };

        // Append comment vào cột comment nếu có
        if (comment && comment.trim()) {
            var timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
            var newEntry = "[GVHD - " + timestamp + "]: " + comment.trim();
            var existingComment = thesis.comment || "";
            updateData.comment = existingComment ? existingComment + "\n" + newEntry : newEntry;

            // Gửi notification cho sinh viên
            var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "id", thesis.studentId);
            if (student) {
                var notifId = "NOTIF_" + new Date().getTime();
                var currentUser = getCurrentUser();
                db_insert(CONFIG.TABLES.NOTIFICATION, {
                    id: notifId,
                    senderId: currentUser.id,
                    receiverId: student.accountId,
                    title: "GVHD Từ chối đề tài",
                    content: "Đề tài '" + thesis.title + "' đã bị GVHD từ chối với lý do: " + comment.trim(),
                    createdAt: new Date().toISOString(),
                    isRead: false
                });
            }
        }

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, updateData);

        return JSON.stringify({ success: true, message: "Đã từ chối đề tài!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

// ==========================================
// CHAIRMAN — DANH SÁCH ĐỀ TÀI (BBHĐ / BCKLTN / ĐIỂM)
// ==========================================

function _chairmanIsBlankCell(v) {
    return v === undefined || v === null || String(v).trim() === "";
}

function _chairmanSheetIsTrue(v) {
    if (v === true) return true;
    var s = String(v).trim().toUpperCase();
    return s === "TRUE" || s === "1";
}

function _chairmanSheetIsFalse(v) {
    if (v === false) return true;
    var s = String(v).trim().toUpperCase();
    return s === "FALSE" || s === "0";
}

/**
 * Trạng thái hiển thị cột Duyệt BBHĐ (EvaluationRecord).
 */
function _chairmanBbhdStatusFromEval(er) {
    if (!er || _chairmanIsBlankCell(er.pdfFile)) {
        return "CHƯA BẮT ĐẦU";
    }
    if (_chairmanSheetIsFalse(er.presidentApproved) || _chairmanSheetIsFalse(er.headOfDeptApproved)) {
        return "TỪ CHỐI";
    }
    if (_chairmanSheetIsTrue(er.presidentApproved) && _chairmanSheetIsTrue(er.headOfDeptApproved)) {
        return "ĐÃ DUYỆT";
    }
    if (_chairmanSheetIsTrue(er.presidentApproved) && _chairmanIsBlankCell(er.headOfDeptApproved)) {
        return "CHỜ DUYỆT";
    }
    return "CHỜ DUYỆT";
}

/**
 * Trạng thái hiển thị cột Duyệt BCKLTN (Submission cuối kỳ).
 */
function _chairmanBckltnStatusFromSubmission(sub) {
    if (!sub || _chairmanIsBlankCell(sub.pdfFile)) {
        return "CHƯA NỘP";
    }
    if (_chairmanSheetIsFalse(sub.presidentApproved) || _chairmanSheetIsFalse(sub.lectureApproved)) {
        return "TỪ CHỐI";
    }
    if (_chairmanSheetIsTrue(sub.presidentApproved) && _chairmanSheetIsTrue(sub.lectureApproved)) {
        return "ĐÃ DUYỆT";
    }
    if (_chairmanSheetIsTrue(sub.presidentApproved) && _chairmanIsBlankCell(sub.lectureApproved)) {
        return "CHỜ DUYỆT";
    }
    return "CHỜ DUYỆT";
}

function _chairmanIsFinalSubmissionType(t) {
    var s = String(t || "").trim().toLowerCase();
    return s === "final";
}

function _chairmanPickFinalSubmission(rowsForThesis) {
    var list = rowsForThesis.filter(function (s) {
        return _chairmanIsFinalSubmissionType(s.submissionType);
    });
    if (list.length === 0) {
        return null;
    }
    list.sort(function (a, b) {
        var ta = new Date(a.submittedAt).getTime();
        var tb = new Date(b.submittedAt).getTime();
        if (isNaN(ta) && isNaN(tb)) return 0;
        if (isNaN(ta)) return 1;
        if (isNaN(tb)) return -1;
        return tb - ta;
    });
    return list[0];
}

function _chairmanFindEvalByThesisId(allEval, thesisId) {
    for (var i = 0; i < allEval.length; i++) {
        if (String(allEval[i].thesisId) === String(thesisId)) {
            return allEval[i];
        }
    }
    return null;
}

function _chairmanAvgScoreForThesis(allScores, thesisId) {
    var vals = [];
    for (var i = 0; i < allScores.length; i++) {
        var sc = allScores[i];
        if (String(sc.thesisId) !== String(thesisId)) {
            continue;
        }
        var n = parseFloat(sc.scoreValue);
        if (!isNaN(n)) {
            vals.push(n);
        }
    }
    if (vals.length === 0) {
        return null;
    }
    var sum = 0;
    for (var j = 0; j < vals.length; j++) {
        sum += vals[j];
    }
    return Math.round((sum / vals.length) * 100) / 100;
}

/**
 * Danh sách đề tài cho màn CHAIRMAN: điểm TB, trạng thái BBHĐ/BCKLTN, dữ liệu modal.
 * @returns {string} JSON
 */
function api_chairman_getThesisListForReview() {
    try {
        var theses = db_getAll(CONFIG.TABLES.THESIS);
        var students = db_getAll(CONFIG.TABLES.STUDENT);
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);
        var lecturers = db_getAll(CONFIG.TABLES.LECTURER);
        var councils = db_getAll(CONFIG.TABLES.COUNCIL);
        var evaluations = db_getAll(CONFIG.TABLES.EVALUATION_RECORD);
        var submissions = db_getAll(CONFIG.TABLES.SUBMISSION);
        var scores = db_getAll(CONFIG.TABLES.SCORE);

        var studentMap = {};
        students.forEach(function (s) { studentMap[s.id] = s; });

        var accountMap = {};
        accounts.forEach(function (a) { accountMap[a.id] = a; });

        var lecturerMap = {};
        lecturers.forEach(function (l) { lecturerMap[l.id] = l; });

        var councilMap = {};
        councils.forEach(function (c) { councilMap[c.id] = c; });

        var subsByThesis = {};
        submissions.forEach(function (sub) {
            var tid = String(sub.thesisId);
            if (!subsByThesis[tid]) {
                subsByThesis[tid] = [];
            }
            subsByThesis[tid].push(sub);
        });

        var reviewsList = theses.map(function (thesis) {
            var tid = String(thesis.id);
            var student = studentMap[thesis.studentId];
            var studentAccount = student ? accountMap[student.accountId] : null;
            var supervisor = lecturerMap[thesis.supervisorId];
            var supervisorAccount = supervisor ? accountMap[supervisor.accountId] : null;
            var council = thesis.councilId ? councilMap[thesis.councilId] : null;

            var er = _chairmanFindEvalByThesisId(evaluations, thesis.id);
            var finalSub = _chairmanPickFinalSubmission(subsByThesis[tid] || []);

            var bbhd = _chairmanBbhdStatusFromEval(er);
            var bckltn = _chairmanBckltnStatusFromSubmission(finalSub);
            var avg = _chairmanAvgScoreForThesis(scores, thesis.id);

            return {
                thesisId: thesis.id,
                title: thesis.title || "",
                studentName: studentAccount ? studentAccount.fullName : "N/A",
                studentId: thesis.studentId,
                studentCode: student ? (student.studentCode || "") : "",
                avgScore: avg,
                avgScoreDisplay: avg !== null ? String(avg) : "--",
                bbhdStatus: bbhd,
                bckltnStatus: bckltn,
                supervisorName: supervisorAccount ? supervisorAccount.fullName : "Chưa phân công",
                councilName: council ? (council.councilName || council.id || "") : "--",
                evaluationRecordId: er ? er.id : null,
                evaluationPdfFile: er ? (er.pdfFile || "") : "",
                finalSubmissionPdfFile: finalSub ? (finalSub.pdfFile || "") : "",
                hasEvaluationRecord: !!er
            };
        });

        return JSON.stringify({ success: true, data: reviewsList });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * CHAIRMAN duyệt biên bản hội đồng: set EvaluationRecord.headOfDeptApproved = TRUE.
 * @param {string} thesisId
 * @param {string} [senderAccountId]
 */
function api_chairman_approveEvaluationMinutes(thesisId, senderAccountId) {
    try {
        if (!thesisId || String(thesisId).trim() === "") {
            throw new Error("Thiếu mã đề tài.");
        }
        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) {
            throw new Error("Đề tài không tồn tại.");
        }
        var evaluations = db_getAll(CONFIG.TABLES.EVALUATION_RECORD);
        var er = _chairmanFindEvalByThesisId(evaluations, thesisId);
        if (!er) {
            throw new Error("Chưa có biên bản hội đồng (EvaluationRecord) cho đề tài này.");
        }
        var ok = db_update(CONFIG.TABLES.EVALUATION_RECORD, "id", er.id, {
            presidentApproved: true
        });
        if (!ok) {
            throw new Error("Không cập nhật được biên bản.");
        }
        return JSON.stringify({ success: true, message: "Đã duyệt biên bản hội đồng." });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}
