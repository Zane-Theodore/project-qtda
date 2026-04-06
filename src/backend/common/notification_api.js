/**
 * @description Lấy danh sách thông báo của sinh viên theo accountId hiện tại.
 * receiverId trong Notification sẽ map với Student.id
 * senderId sẽ được map ra tên hiển thị từ Account/Lecturer nếu có
 * @param {string} accountId
 * @returns {string} JSON string
 */
function api_st_getMyNotifications(accountId) {
  try {
    if (!accountId || String(accountId).trim() === "") {
      throw new Error("accountId không được để trống");
    }

    var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "accountId", accountId);
    if (!student) {
      throw new Error("Không tìm thấy sinh viên theo accountId: " + accountId);
    }

    var receiverId = student.id;

    var allNotifications = db_getAll(CONFIG.TABLES.NOTIFICATION);
    var allLecturers = db_getAll(CONFIG.TABLES.LECTURER);
    var allAccounts = db_getAll(CONFIG.TABLES.ACCOUNT);

    var lecturerByIdMap = {};
    allLecturers.forEach(function(item) {
      lecturerByIdMap[String(item.id || "")] = item;
    });

    var accountByIdMap = {};
    allAccounts.forEach(function(item) {
      accountByIdMap[String(item.id || "")] = item;
    });

    var notifications = allNotifications.filter(function(item) {
      return String(item.receiverId || "") === String(receiverId);
    });

    notifications = notifications.map(function(item) {
      var senderId = String(item.senderId || "");
      var senderDisplay = senderId;

      // Case 1: senderId map trực tiếp với Account.id
      // Ví dụ: HOD
      if (accountByIdMap[senderId]) {
        senderDisplay = accountByIdMap[senderId].fullName || senderId;
      }
      // Case 2: senderId là Lecturer.id
      // Ví dụ: L101, L102...
      else if (lecturerByIdMap[senderId]) {
        var lecturer = lecturerByIdMap[senderId];
        var lecturerAccountId = String(lecturer.accountId || "");
        var account = accountByIdMap[lecturerAccountId];

        if (account) {
          senderDisplay = account.fullName || senderId;
        }
      }

      return {
        id: item.id || "",
        senderId: senderId,
        senderDisplay: senderDisplay,
        receiverId: item.receiverId || "",
        title: item.title || "",
        content: item.content || "",
        createdAt: item.createdAt || "",
        isRead: normalizeIsRead(item.isRead)
      };
    });

    notifications.sort(function(a, b) {
      return parseDateSafe(b.createdAt) - parseDateSafe(a.createdAt);
    });

    return JSON.stringify({
      success: true,
      data: notifications
    });

  } catch (error) {
    Logger.log("ERROR [api_st_getMyNotifications]: " + error.message);
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
function api_st_markNotificationAsRead(notificationId) {
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
    Logger.log("ERROR [api_st_markNotificationAsRead]: " + error.message);
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