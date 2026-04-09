/**
 * Lấy danh sách đề tài mà giảng viên này phải chấm điểm
 * @param {string} accountId - Account ID của giảng viên
 */
function api_lec_getGradingList(accountId) {
  try {
    // 1. Phân định Giảng viên
    var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", accountId);
    if (!lecturerInfo) throw new Error("Không tìm thấy thông tin giảng viên");
    
    var lecturerId = lecturerInfo.id;
    
    // 2. Fetch dữ liệu liên quan
    var allTheses = db_getAll(CONFIG.TABLES.THESIS);
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);
    var allScores = db_getAll(CONFIG.TABLES.SCORE);
    var allSubmissions = db_getAll(CONFIG.TABLES.SUBMISSION);
    var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
    
    // 3. Chắt lọc hội đồng của giảng viên này
    var myCouncils = councilMembers.filter(function(c) {
      return c.lecturerId === lecturerId;
    });
    var myCouncilIds = myCouncils.map(function(c) { return c.councilId; });
    
    var tasks = [];
    var stt = 1;
    
    allTheses.forEach(function(thesis) {
      // Xác định các vai trò của giảng viên trong đề tài này
      var roles = [];
      
      if (thesis.supervisorId === lecturerId) {
        roles.push({ role: 'GVHD', scoreType: 'Supervisor', typeVi: 'HuongDan' });
      }
      if (thesis.reviewerId === lecturerId) {
        roles.push({ role: 'GVPB', scoreType: 'Reviewer', typeVi: 'PhanBien' });
      }
      if (myCouncilIds.indexOf(thesis.councilId) !== -1) {
        roles.push({ role: 'TVHĐ', scoreType: 'Council', typeVi: 'HoiDong' });
        // NOTE: Có thể kiểm tra thêm ChuTichHoiDong nếu cần
      }
      
      roles.forEach(function(roleData) {
        // Tìm thông tin Sinh viên
        var student = allStudents.find(function(s) { return s.id === thesis.studentId; }) || {};
        var studentAccount = allAccounts.find(function(a) { return a.id === student.accountId; }) || {};
        
        // Tìm File báo cáo cuối kỳ
        var reportFile = allSubmissions.find(function(sub) {
          return sub.thesisId === thesis.id && (sub.submissionType === 'Final' || sub.submissionType === 'CuoiKy');
        });
        
        // Tìm Điểm số đã chấm cho vai trò này (CHỈ KHI ĐÃ NỘP BÁO CÁO)
        var scoreRecord = null;
        if (reportFile) {
          scoreRecord = allScores.find(function(sc) {
            return sc.thesisId === thesis.id && sc.lecturerId === lecturerId && (sc.scoreType === roleData.scoreType || sc.scoreType === roleData.typeVi);
          });
        }
        
        tasks.push({
          id: thesis.id + "_" + roleData.role, // Tự tạo composite ID cho dòng dữ liệu
          coreThesisId: thesis.id,
          stt: stt < 10 ? '0' + stt : stt.toString(),
          stName: studentAccount.fullName || "Chưa rõ",
          stMssv: student.studentCode || "----",
          title: thesis.title || "Chưa có tên đề tài",
          score: scoreRecord ? parseFloat(scoreRecord.scoreValue) : null,
          comment: scoreRecord ? scoreRecord.comment : "",
          role: roleData.role,
          scoreTypeLog: roleData.scoreType,
          fileName: reportFile ? reportFile.pdfFile : null,
          fileSize: reportFile ? "X MB" : null // Chưa có thông tin kích thước trong DB
        });
        stt++;
      });
    });
    
    return JSON.stringify({ success: true, data: tasks });
  } catch (error) {
    Logger.log("ERROR [api_lec_getGradingList]: " + error.message);
    return JSON.stringify({ success: false, error: error.message });
  }
}

/**
 * Lưu điểm số, nhận xét của Giảng viên cho 1 đề tài
 */
function api_lec_saveGrade(accountId, coreThesisId, scoreType, scoreValue, comment) {
  try {
    var lecturerInfo = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", accountId);
    if (!lecturerInfo) throw new Error("Chỉ giảng viên mới được nhập điểm");
    
    var lecturerId = lecturerInfo.id;
    
    // Tìm bảng Score xem dòng dữ liệu này có hay chưa (dùng thesisId, lecturerId, scoreType)
    var allScores = db_getAll(CONFIG.TABLES.SCORE);
    
    // Mapping scoreType để check cho cả ngôn ngữ DB mới và cũ
    var isHuongDan = (scoreType === 'Supervisor' || scoreType === 'HuongDan');
    var isPhanBien = (scoreType === 'Reviewer' || scoreType === 'PhanBien');
    var isHoiDong = (scoreType === 'Council' || scoreType === 'HoiDong' || scoreType === 'ChuTichHoiDong');

    var existingScore = allScores.find(function(sc) {
      if (sc.thesisId !== coreThesisId || sc.lecturerId !== lecturerId) return false;
      
      if (isHuongDan && (sc.scoreType === 'Supervisor' || sc.scoreType === 'HuongDan')) return true;
      if (isPhanBien && (sc.scoreType === 'Reviewer' || sc.scoreType === 'PhanBien')) return true;
      if (isHoiDong && (sc.scoreType === 'Council' || sc.scoreType === 'HoiDong' || sc.scoreType === 'ChuTichHoiDong')) return true;
      
      return false;
    });
    
    if (existingScore) {
      // Update
      db_update(CONFIG.TABLES.SCORE, "id", existingScore.id, {
        scoreValue: scoreValue,
        comment: comment
      });
    } else {
      // Insert
      var newScoreId = "SC" + new Date().getTime(); // Hàm auto ID tuỳ cách bạn setup ở DB
      var newRow = {
        id: newScoreId,
        thesisId: coreThesisId,
        lecturerId: lecturerId,
        scoreValue: scoreValue,
        comment: comment,
        scoreType: scoreType
      };
      db_insert(CONFIG.TABLES.SCORE, newRow);
    }
    
    return JSON.stringify({ success: true, message: "Lưu điểm thành công" });
    
  } catch (err) {
    Logger.log("ERROR [api_lec_saveGrade]: " + err.message);
    return JSON.stringify({ success: false, error: err.message });
  }
}
