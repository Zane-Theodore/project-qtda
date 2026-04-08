/**
 * @description Lấy danh sách thông báo của người dùng theo accountId hiện tại.
 * receiverId trong Notification sẽ map với Student.id hoặc Lecturer.id, 
 * nếu receiverId rỗng hoặc chứa "ALL" thì là thông báo chung.
 * @param {string} accountId
 * @returns {string} JSON string
 */
function api_co_getMyNotifications(accountId) {
  try {
    if (!accountId || String(accountId).trim() === "") {
      throw new Error("accountId không được để trống");
    }

    var receiverId = "";

    // Find if user is Student
    var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);
    if (student) {
      receiverId = student.id;
    } else {
      // Find if user is Lecturer
      var lecturer = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "accountId", accountId);
      if (lecturer) {
        receiverId = lecturer.id;
        position = "lecturer";
      } else {
        throw new Error("Không tìm thấy thông tin Sinh viên hay Giảng viên cho tài khoản này.");
      }
    }

    var allNotifications = db_getAll(CONFIG.TABLES.NOTIFICATION);
    var allLecturers = db_getAll(CONFIG.TABLES.LECTURER);
    var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);

    var lecturerByIdMap = {};
    allLecturers.forEach(function (item) {
      lecturerByIdMap[String(item.id || "")] = item;
    });

    var accountByIdMap = {};
    allAccounts.forEach(function (item) {
      accountByIdMap[String(item.id || "")] = item;
    });

    // Lọc thông báo: 
    // Thông báo chung: receiverId trên thông báo rỗng hoặc "ALL"
    // Thông báo cá nhân: receiverId trên thông báo trùng phương thức
    var notifications = allNotifications.filter(function (item) {
      var notifReceiverId = String(item.receiverId || "").trim().toUpperCase();
      var isGeneral = (notifReceiverId === "" || notifReceiverId === "ALL" || notifReceiverId === "CHUNG");
      var isPersonal = (String(item.receiverId || "") === String(receiverId));

      return isGeneral || isPersonal;
    });

    // Map sender info & categorize
    notifications = notifications.map(function (item) {
      var senderId = String(item.senderId || "");
      var senderDisplay = senderId;

      if (accountByIdMap[senderId]) {
        senderDisplay = accountByIdMap[senderId].fullName || senderId;
      } else if (lecturerByIdMap[senderId]) {
        var lect = lecturerByIdMap[senderId];
        var lecturerAccountId = String(lect.accountId || "");
        var account = accountByIdMap[lecturerAccountId];

        if (account) {
          senderDisplay = account.fullName || senderId;
        }
      }

      var notifReceiverId = String(item.receiverId || "").trim().toUpperCase();
      var type = (notifReceiverId === "" || notifReceiverId === "ALL" || notifReceiverId === "CHUNG")
        ? "general"
        : "personal";

      return {
        id: item.id || "",
        senderId: senderId,
        senderDisplay: senderDisplay,
        receiverId: item.receiverId || "",
        type: type, // Add type for frontend rendering
        title: item.title || "",
        content: item.content || "",
        createdAt: item.createdAt || "",
        isRead: normalizeIsRead(item.isRead)
      };
    });

    notifications.sort(function (a, b) {
      return parseDateSafe(b.createdAt) - parseDateSafe(a.createdAt);
    });

    return JSON.stringify({
      success: true,
      data: notifications
    });

  } catch (error) {
    Logger.log("ERROR [api_co_getMyNotifications]: " + error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}

/**
 * @description Đánh dấu 1 thông báo là đã đọc
 * @param {string|number} notificationId
 * @returns {string} JSON string
 */
function api_co_markNotificationAsRead(notificationId) {
  try {
    if (!notificationId && notificationId !== 0) {
      throw new Error("notificationId không được để trống");
    }

    var success = db_update(
      CONFIG.TABLES.NOTIFICATION,
      "id",
      notificationId,
      { isRead: true }
    );

    if (!success) {
      throw new Error("Không tìm thấy thông báo để cập nhật: " + notificationId);
    }

    return JSON.stringify({
      success: true,
      message: "Đã cập nhật trạng thái đã đọc"
    });

  } catch (error) {
    Logger.log("ERROR [api_co_markNotificationAsRead]: " + error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}

/**
 * @description Chuẩn hóa isRead về boolean
 */
function normalizeIsRead(value) {
  if (value === true) return true;
  if (value === false) return false;

  var str = String(value || "").trim().toUpperCase();
  return str === "TRUE";
}

/**
 * @description Parse ngày dạng dd/MM/yyyy hoặc format khác
 */
function parseDateSafe(dateStr) {
  if (!dateStr) return new Date(0);

  var str = String(dateStr).trim();

  if (str.indexOf("/") > -1) {
    var parts = str.split("/");
    if (parts.length === 3) {
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10) - 1;
      var year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }

  var parsed = new Date(str);
  if (isNaN(parsed.getTime())) return new Date(0);
  return parsed;
}

// =========================================
// BBHĐ (Biên bản Hội đồng) APIs
// =========================================

/**
 * @description Lấy danh sách biên bản hội đồng cần duyệt
 * Dựa vào notificationId để truy ngược ra councilId, từ đó lấy các EvaluationRecord
 * @param {string} notificationId
 * @returns {string} JSON string
 */
function api_co_getBBHDRecords(notificationId) {
  try {
    // Lấy tất cả EvaluationRecord
    var allRecords = db_getAll(CONFIG.TABLES.EVALUATION_RECORD);
    var allThesis = db_getAll(CONFIG.TABLES.THESIS);
    var allStudents = db_getAll(CONFIG.TABLES.STUDENT);
    var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);

    // Build lookup maps
    var thesisMap = {};
    allThesis.forEach(function(t) {
      thesisMap[String(t.id || "")] = t;
    });

    var studentMap = {};
    allStudents.forEach(function(s) {
      studentMap[String(s.id || "")] = s;
    });

    var accountMap = {};
    allAccounts.forEach(function(a) {
      accountMap[String(a.id || "")] = a;
    });

    // Map dữ liệu ra format cho frontend
    var data = allRecords.map(function(record) {
      var thesis = thesisMap[String(record.thesisId || "")] || {};
      var student = studentMap[String(thesis.studentId || "")] || {};
      var studentAccount = accountMap[String(student.accountId || "")] || {};

      return {
        id: record.id || "",
        topicTitle: thesis.title || record.topicTitle || "",
        studentName: studentAccount.fullName || student.fullName || "",
        studentId: student.id || "",
        fileLink: record.fileLink || record.bbhdFile || "",
        fileName: record.fileName || "",
        status: record.status || "Chờ duyệt"
      };
    });

    return JSON.stringify({
      success: true,
      data: data
    });

  } catch (error) {
    Logger.log("ERROR [api_co_getBBHDRecords]: " + error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}

/**
 * @description Cập nhật trạng thái duyệt cho 1 biên bản
 * @param {string} recordId - ID của EvaluationRecord
 * @param {string} newStatus - "Chờ duyệt" | "Đã đồng ý" | "Từ chối"
 * @returns {string} JSON string
 */
function api_co_updateBBHDStatus(recordId, newStatus) {
  try {
    if (!recordId) {
      throw new Error("recordId không được để trống");
    }

    var validStatuses = ["Chờ duyệt", "Đã đồng ý", "Từ chối"];
    if (validStatuses.indexOf(newStatus) === -1) {
      throw new Error("Trạng thái không hợp lệ: " + newStatus);
    }

    var success = db_update(
      CONFIG.TABLES.EVALUATION_RECORD,
      "id",
      recordId,
      { status: newStatus }
    );

    if (!success) {
      throw new Error("Không tìm thấy biên bản để cập nhật: " + recordId);
    }

    return JSON.stringify({
      success: true,
      message: "Đã cập nhật trạng thái: " + newStatus
    });

  } catch (error) {
    Logger.log("ERROR [api_co_updateBBHDStatus]: " + error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}

/**
 * @description Duyệt hàng loạt tất cả biên bản đang "Chờ duyệt"
 * @param {string} recordIdsJson - JSON string chứa mảng các recordId
 * @returns {string} JSON string
 */
function api_co_approveAllBBHD(recordIdsJson) {
  try {
    var recordIds = JSON.parse(recordIdsJson);

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      throw new Error("Danh sách biên bản trống");
    }

    var successCount = 0;
    var failCount = 0;

    recordIds.forEach(function(id) {
      var result = db_update(
        CONFIG.TABLES.EVALUATION_RECORD,
        "id",
        id,
        { status: "Đã đồng ý" }
      );

      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    });

    return JSON.stringify({
      success: true,
      message: "Đã duyệt " + successCount + "/" + recordIds.length + " biên bản",
      successCount: successCount,
      failCount: failCount
    });

  } catch (error) {
    Logger.log("ERROR [api_co_approveAllBBHD]: " + error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}