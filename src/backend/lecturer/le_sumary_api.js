/**
 * API lấy dữ liệu từ các bảng Thesis, Student, Score và Account
 */
function api_getThesisData() {
  try {
    var thesisData = [];
    var thesisRecords = db_getAll(CONFIG.TABLES.THESIS);  
    var studentRecords = db_getAll(CONFIG.TABLES.STUDENT);  
    var scoreRecords = db_getAll(CONFIG.TABLES.SCORE);  
    var accountRecords = db_getAll(CONFIG.TABLES.ACCOUNT);  
    var lecturerRecords = db_getAll(CONFIG.TABLES.LECTURER);

    thesisRecords.forEach(function(thesis) {
      if (!thesis.id) return; // Bỏ qua nếu ko có id

      // Lấy thông tin sinh viên
      var student = studentRecords.find(s => String(s.id) === String(thesis.studentId));
      var studentName = "";
      var studentCode = "";
      if (student) {
        studentCode = student.studentCode;
        var stAccount = accountRecords.find(acc => String(acc.id) === String(student.accountId));
        if (stAccount) studentName = stAccount.fullName;
      }

      // Lấy điểm 
      var thesisScores = scoreRecords.filter(score => String(score.thesisId) === String(thesis.id));
      let gvhdScore = "--"; let gvpbScore = "--"; let tvhd1Score = "--"; let tvhd2Score = "--";
      let sum = 0; let count = 0;
      
      let relatedLecturers = [];
      let lecturerIds = new Set();
      
      thesisScores.forEach(function(score) {
        var sVal = parseFloat(score.scoreValue);
        let sType = score.scoreType;
        if (!isNaN(sVal)) {
          sum += sVal; count++;
          if (sType === "HuongDan") gvhdScore = sVal.toFixed(1);
          else if (sType === "PhanBien") gvpbScore = sVal.toFixed(1);
          else if (sType === "TVHD1") tvhd1Score = sVal.toFixed(1);
          else if (sType === "TVHD2") tvhd2Score = sVal.toFixed(1);
        }
        
        if (sType === "HuongDan" && score.lecturerId && !lecturerIds.has(score.lecturerId)) {
          lecturerIds.add(score.lecturerId);
          var lec = lecturerRecords.find(l => String(l.id) === String(score.lecturerId));
          if (lec) {
            var lecAcc = accountRecords.find(a => String(a.id) === String(lec.accountId));
            if (lecAcc) {
              relatedLecturers.push({
                id: lec.id,
                fullName: lecAcc.fullName
              });
            }
          }
        }
      });

      let averageScore = "--";
      if (count > 0) {
        averageScore = (sum / count).toFixed(1);
      }

      thesisData.push({
        thesisId: thesis.id,
        studentName: studentName,
        studentCode: studentCode,
        thesisTitle: thesis.title,
        gvhdScore: gvhdScore,
        gvpbScore: gvpbScore,
        tvhd1Score: tvhd1Score,
        tvhd2Score: tvhd2Score,
        averageScore: averageScore,
        lecturers: relatedLecturers
      });
    });

    return { success: true, data: thesisData };
  } catch (error) {
    Logger.log("Error fetching thesis data: " + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Hàm lấy ID ngẫu nhiên cho Submission
 */
function api_generateSimpleId() {
  return 'SUB_' + new Date().getTime() + Math.floor(Math.random() * 1000);
}

/**
 * API để tải lên file PDF lên Google Drive
 * @param {Object} fileObj - Đối tượng file { name, mimeType, bytes }
 * @param {string} thesisId - Mã đề tài
 * @param {Array<string>} receiverIds - Mảng các ID giảng viên nhận (những người chấm thi)
 */
function api_uploadFileToDrive(fileObj, thesisId, receiverIds) {
  try {
    var folder = DriveApp.getFolderById("1-0dwSs10b1OmjorFxWMA7qukDgp9Jm5A");
    var blob = Utilities.newBlob(fileObj.bytes, fileObj.mimeType, fileObj.name);
    var uploadedFile = folder.createFile(blob);
    var fileUrl = uploadedFile.getUrl();
    
    // Lưu thông tin file vào Google Sheets (bảng Submission)
    var submissionData = {
      id: api_generateSimpleId(),
      thesisId: thesisId,
      title: "Biên bản báo vệ khóa luận",
      pdfFile: fileUrl,
      submissionType: "Final",
      submittedAt: new Date().toISOString()
    };
    
    db_insert(CONFIG.TABLES.SUBMISSION, submissionData);

    // Gửi Notification cho tất cả người nhận (receiverIds)
    if (receiverIds && receiverIds.length > 0) {
      var lecturerRecords = db_getAll(CONFIG.TABLES.LECTURER);
      
      receiverIds.forEach(function(recId) {
        var receiverLec = lecturerRecords.find(l => String(l.id) === String(recId));
        if (receiverLec && receiverLec.accountId) {
          var notifData = {
            id: 'NOTIF_' + new Date().getTime() + Math.floor(Math.random() * 1000) + '_' + recId,
            senderId: 'SYSTEM',
            receiverId: receiverLec.accountId,
            title: "Có biên bản mới tải lên",
            content: "Đề tài mã " + thesisId + " vừa tải lên một biên bản lúc " + new Date().toLocaleString(),
            createdAt: new Date().toISOString(),
            isRead: "FALSE"
          };
          db_insert(CONFIG.TABLES.NOTIFICATION, notifData);
        }
      });
    }

    Logger.log("File uploaded successfully: " + fileUrl);
    return { success: true, url: fileUrl };
  } catch (error) {
    Logger.log("Error uploading file: " + error.message);
    return { success: false, error: error.message };
  }
}