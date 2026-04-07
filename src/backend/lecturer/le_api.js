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

        var result = {
            fullName: userInfo.fullName,
            email: userInfo.email,
            phoneNumber: userInfo.phoneNumber,
            address: userInfo.address,
            nationalId: userInfo.nationalId,
            dob: userInfo.dob,

            lecturerId: lecturerInfo.lecturerCode,
            yearsOfService: lecturerInfo.yearsOfService,
        };

        return JSON.stringify({ success: true, data: result });

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
        var myTeachingActivities = allTeachingActivities.filter(function(item) {
            return item.lecturerId == lecturerInfo.id;
        });

        var allAchievements = db_getAll(CONFIG.TABLES.ACHIEVEMENT);
        var myAchievements = allAchievements.filter(function(item) {
            return item.lecturerId == lecturerInfo.id;
        });

        var result = {
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

        return JSON.stringify({ success: true, data: result });

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

        var result = theses.map(function (thesis) {
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

        return JSON.stringify({ success: true, data: result });
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