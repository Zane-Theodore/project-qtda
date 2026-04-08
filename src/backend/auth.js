// src/backend/auth.js

/**
 * Xử lý xác thực đăng nhập.
 * @param {Object} account - Đối tượng chứa thông tin đăng nhập.
 * @param {string} account.email - Email của người dùng.
 * @param {string} account.password - Mật khẩu người dùng nhập vào.
 * @returns {Object} Trả về Object chứa kết quả xác thực.
 */
function verifyLogin(account) {
  try {
    const user = db_getUserByEmail(account.email);
    if (!user) {
      return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." };
    }

    if (String(user.password) === String(account.password)) {

      // Khởi tạo biến positions là một Mảng (Array) để chứa nhiều chức danh
      var positions = [];

      // Nếu Role là HOD (Trưởng bộ môn) -> Gắn cứng luôn
      if (user.role === "HOD") {
         positions.push("hod");
      }
      
      // Nếu là HOD hoặc LECTURER -> Cần quét các bảng để lấy vị trí
      if (user.role === "LECTURER" || user.role === "HOD") {
        
        var lecturer = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", user.id);
        
        if (lecturer) {
          // 1. QUÉT BẢNG HỘI ĐỒNG (COUNCIL_MEMBER)
          // (Dùng db_getAll và filter vì một GV có thể ở nhiều Hội đồng)
          var allCouncilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
          if (allCouncilMembers && allCouncilMembers.length > 0) {
            allCouncilMembers.forEach(function(cm) {
              if (cm.lecturerId == lecturer.id) {
                var roleInCouncil = cm.position || cm.Position || cm.role || cm.Role || "";
                var mappedPosition = mapCouncilRoleToPosition(roleInCouncil);
                // Thêm vào mảng nếu chưa có (Tránh trùng lặp)
                if (mappedPosition !== "lecturer" && positions.indexOf(mappedPosition) === -1) {
                  positions.push(mappedPosition);
                }
              }
            });
          }

          // 2. QUÉT BẢNG ĐỀ TÀI (THESIS) 
          // Để tìm chức danh Hướng dẫn (Supervisor) và Phản biện (Reviewer)
          var allTheses = db_getAll(CONFIG.TABLES.THESIS);
          if (allTheses && allTheses.length > 0) {
            allTheses.forEach(function(thesis) {
              
              // Nếu GV này là người hướng dẫn đề tài này
              if (thesis.supervisorId == lecturer.id) {
                if (positions.indexOf("supervisor") === -1) {
                  positions.push("supervisor");
                }
              }

              // Nếu GV này là người phản biện đề tài này
              if (thesis.reviewerId == lecturer.id) {
                if (positions.indexOf("reviewer") === -1) {
                  positions.push("reviewer");
                }
              }

            });
          }
          
          // 3. Nếu rà soát xong mà không có chức danh nào đặc biệt, gán mặc định
          if (positions.length === 0) {
             positions.push("lecturer"); // Hoặc có thể để "supervisor" làm mặc định tuỳ bạn
          }
        }
      }

      return {
        success: true,
        userData: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          positions: positions // TRẢ VỀ MẢNG POSITIONS
        }
      };
    }

    return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." };

  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.message };
  }
}

/**
 * Hàm phụ trợ map chữ tiếng Việt sang key hệ thống
 */
function mapCouncilRoleToPosition(role) {
  var raw = String(role || "").trim().toLowerCase();

  if (raw.includes("chủ tịch hội đồng") || raw.includes("chairman")) {
    return "chairman";
  }

  if (raw.includes("thư ký hội đồng") || raw.includes("secretary")) {
    return "secretary";
  }

  if (raw.includes("thành viên hội đồng") || raw.includes("member")) {
    return "member";
  }

  return "lecturer"; 
}