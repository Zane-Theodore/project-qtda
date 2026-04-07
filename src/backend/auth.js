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

      // 👉 LẤY POSITION TẠI ĐÂY
      var lecturer = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", user.id);
      var position = "lecturer";

      if (lecturer) {
        var councilMember = db_findRecordByColumn(
          CONFIG.TABLES.COUNCIL_MEMBER, // fix undefined tab
          "lecturerId",
          lecturer.id
        );

        if (councilMember) {
            var val = councilMember.position || councilMember.Position || councilMember.role || councilMember.Role || "";
            position = mapCouncilRoleToPosition(val);
        } else {
            position = "supervisor";
        }
      }

      return {
        success: true,
        userData: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          position: position
        }
      };
    }

    return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." };

  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.message };
  }
}

function mapCouncilRoleToPosition(role) {
  var raw = String(role || "").trim().toLowerCase();

  if (raw.includes("chủ tịch hội đồng") || raw.includes("chairman")) {
    return "chairman";
  }

  if (raw.includes("thư ký hội đồng") || raw.includes("secretary")) {
    return "secretary";
  }

  if (raw.includes("giảng viên phản biện") || raw.includes("reviewer")) {
    return "reviewer";
  }

  if (raw.includes("thành viên hội đồng") || raw.includes("member")) {
    return "member";
  }

  if (raw.includes("giảng viên hướng dẫn") || raw.includes("supervisor")) {
    return "supervisor";
  }

  if (raw.includes("trưởng bộ môn") || raw.includes("head of department") || raw.includes("hod")) {
    return "hod";
  }
  return "lecturer"; // default
}