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
        if (!lecturerInfo) throw new Error("Không tìm thấy hồ sơ giảng viên cho tài khoản: " + accountId);

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