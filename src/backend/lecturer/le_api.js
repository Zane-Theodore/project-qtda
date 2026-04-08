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
        var myTeachingActivities = allTeachingActivities.filter(function (item) {
            return item.lecturerId == lecturerInfo.id;
        });

        var allAchievements = db_getAll(CONFIG.TABLES.ACHIEVEMENT);
        var myAchievements = allAchievements.filter(function (item) {
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
// HOD COUNCIL ASSIGNMENT APIS
// ==========================================

/**
 * @description Lấy tất cả hội đồng với danh sách thành viên chi tiết
 * @returns {string} JSON. {success: true, data: [{id, councilName, isGradeLocked, members: [...], ...}]}
 */
function api_hod_getAllCouncils() {
    try {
        var councils = db_getAll(CONFIG.TABLES.COUNCIL);
        var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
        var lecturers = db_getAll(CONFIG.TABLES.LECTURER);
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);

        // Create lookup maps
        var lecturerMap = {};
        lecturers.forEach(function (l) {
            lecturerMap[l.id] = l;
        });

        var accountMap = {};
        accounts.forEach(function (a) {
            accountMap[a.id] = a;
        });

        var membersMap = {};
        councilMembers.forEach(function (m) {
            if (!membersMap[m.councilId]) {
                membersMap[m.councilId] = [];
            }
            var lecturer = lecturerMap[m.lecturerId];
            var account = lecturer ? accountMap[lecturer.accountId] : null;
            membersMap[m.councilId].push({
                id: m.id,
                lecturerId: m.lecturerId,
                fullName: account ? account.fullName : "N/A",
                position: m.position,
                lecturerCode: lecturer ? lecturer.lecturerCode : ""
            });
        });

        // Build result
        var result = councils.map(function (c) {
            return {
                id: c.id,
                councilName: c.councilName,
                isGradeLocked: c.isGradeLocked || false,
                members: membersMap[c.id] || [],
                createdAt: c.createdAt
            };
        });

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        Logger.log("ERROR [api_hod_getAllCouncils]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Lấy danh sách giảng viên có sẵn (chưa assign vào hội đồng nào, không phải HOD)
 * @returns {string} JSON. {success: true, data: [{id, fullName, lecturerCode, ...}]}
 */
function api_hod_getAvailableLecturers() {
    try {
        var lecturers = db_getAll(CONFIG.TABLES.LECTURER);
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);
        var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);

        // Create account map
        var accountMap = {};
        accounts.forEach(function (a) {
            accountMap[a.id] = a;
        });

        // Get lecturer IDs already assigned to councils
        var assignedLecturerIds = {};
        councilMembers.forEach(function (m) {
            assignedLecturerIds[m.lecturerId] = true;
        });

        // Filter: exclude HOD and already assigned lecturers
        var available = lecturers.filter(function (l) {
            var account = accountMap[l.accountId];
            var role = account ? account.role : "";
            var notHod = role !== "HOD";
            var notAssigned = !assignedLecturerIds[l.id];
            return notHod && notAssigned;
        });

        var result = available.map(function (l) {
            var account = accountMap[l.accountId];
            return {
                id: l.id,
                fullName: account ? account.fullName : "N/A",
                lecturerCode: l.lecturerCode,
                email: account ? account.email : ""
            };
        });

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        Logger.log("ERROR [api_hod_getAvailableLecturers]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Lấy danh sách giảng viên available + những người đã trong council này (để edit)
 * @param {string} councilId - Mã hội đồng
 * @returns {string} JSON. {success: true, data: [{id, fullName, ...}]}
 */
function api_hod_getAvailableLecturersForEdit(councilId) {
    try {
        var lecturers = db_getAll(CONFIG.TABLES.LECTURER);
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT);
        var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);

        // Create account map
        var accountMap = {};
        accounts.forEach(function (a) {
            accountMap[a.id] = a;
        });

        // Get lecturer IDs in this council
        var thisCouncilLecturerIds = {};
        councilMembers.forEach(function (m) {
            if (m.councilId === councilId) {
                thisCouncilLecturerIds[m.lecturerId] = true;
            }
        });

        // Get lecturer IDs in OTHER councils
        var otherCouncilLecturerIds = {};
        councilMembers.forEach(function (m) {
            if (m.councilId !== councilId) {
                otherCouncilLecturerIds[m.lecturerId] = true;
            }
        });

        // Filter: non-HOD and (available OR in this council)
        var filtered = lecturers.filter(function (l) {
            var account = accountMap[l.accountId];
            var role = account ? account.role : "";
            var notHod = role !== "HOD";
            var inThisCouncil = thisCouncilLecturerIds[l.id];
            var notInOtherCouncil = !otherCouncilLecturerIds[l.id];
            return notHod && (inThisCouncil || notInOtherCouncil);
        });

        var result = filtered.map(function (l) {
            var account = accountMap[l.accountId];
            return {
                id: l.id,
                fullName: account ? account.fullName : "N/A",
                lecturerCode: l.lecturerCode,
                email: account ? account.email : ""
            };
        });

        return JSON.stringify({ success: true, data: result });
    } catch (error) {
        Logger.log("ERROR [api_hod_getAvailableLecturersForEdit]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Tạo hội đồng mới với các thành viên
 * @param {Object} councilData - {councilName, presidentId, secretaryId, memberIds[], reviewerIds[]}
 * @returns {string} JSON. {success: true, message, id} hoặc {success: false, error}
 */
function api_hod_createCouncil(councilData) {
    try {
        // Validate
        if (!councilData.councilName || councilData.councilName.trim() === "") {
            throw new Error("Tên hội đồng không được để trống");
        }
        if (!councilData.presidentId) {
            throw new Error("Chủ tịch hội đồng là bắt buộc");
        }
        if (!councilData.secretaryId) {
            throw new Error("Thư ký hội đồng là bắt buộc");
        }
        if (!councilData.memberIds) councilData.memberIds = [];
        if (!councilData.reviewerIds) councilData.reviewerIds = [];

        // Total member count check
        var totalMembers = 1 + councilData.memberIds.length + councilData.reviewerIds.length;
        if (totalMembers % 2 === 0) {
            throw new Error("Số lượng thành viên hội đồng phải là số lẻ (hiện tại: " + totalMembers + ")");
        }

        // Check for duplicates
        var allIds = [councilData.presidentId, councilData.secretaryId].concat(councilData.memberIds).concat(councilData.reviewerIds);
        var seen = {};
        for (var i = 0; i < allIds.length; i++) {
            if (seen[allIds[i]]) {
                throw new Error("Giảng viên " + allIds[i] + " xuất hiện nhiều lần");
            }
            seen[allIds[i]] = true;
        }

        // Check if any lecturer is already in another council
        var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
        var assignedIds = {};
        councilMembers.forEach(function (m) {
            assignedIds[m.lecturerId] = m.councilId;
        });

        for (var j = 0; j < allIds.length; j++) {
            if (assignedIds[allIds[j]]) {
                var lecturer = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "id", allIds[j]);
                throw new Error("Giảng viên " + (lecturer ? lecturer.lecturerCode : allIds[j]) + " đã được phân công vào hội đồng khác");
            }
        }

        // Generate council ID HD00x
        var councilsList = db_getAll(CONFIG.TABLES.COUNCIL);
        var maxId = 0;
        for (var k = 0; k < councilsList.length; k++) {
            var cId = councilsList[k].id ? councilsList[k].id.toString() : "";
            if (cId.startsWith("HD")) {
                var num = parseInt(cId.substring(2), 10);
                if (!isNaN(num) && num > maxId) maxId = num;
            }
        }
        var councilId = "HD" + (maxId + 1).toString().padStart(3, '0');

        var d = new Date();
        var dateStr = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();

        // Create council
        db_insert(CONFIG.TABLES.COUNCIL, {
            id: councilId,
            councilName: councilData.councilName.trim(),
            isGradeLocked: true,
            createdAt: dateStr
        });

        // Create council members
        var membersToCreate = [
            { lecturerId: councilData.presidentId, position: "Chủ tịch hội đồng" },
            { lecturerId: councilData.secretaryId, position: "Thư ký hội đồng" }
        ];

        councilData.memberIds.forEach(function (id) {
            membersToCreate.push({ lecturerId: id, position: "Thành viên hội đồng" });
        });

        councilData.reviewerIds.forEach(function (id) {
            membersToCreate.push({ lecturerId: id, position: "Giảng viên phản biện" });
        });

        membersToCreate.forEach(function (m) {
            db_insert(CONFIG.TABLES.COUNCIL_MEMBER, {
                id: "CM_" + new Date().getTime() + Math.random(),
                councilId: councilId,
                lecturerId: m.lecturerId,
                position: m.position
            });
        });

        return JSON.stringify({ success: true, message: "Tạo hội đồng thành công", id: councilId });
    } catch (error) {
        Logger.log("ERROR [api_hod_createCouncil]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Cập nhật hội đồng (tên và thành viên)
 * @param {string} councilId - Mã hội đồng
 * @param {Object} councilData - {councilName, presidentId, secretaryId, memberIds[], reviewerIds[]}
 * @returns {string} JSON. {success: true, message} hoặc {success: false, error}
 */
function api_hod_updateCouncil(councilId, councilData) {
    try {
        // Validate
        if (!councilData.councilName || councilData.councilName.trim() === "") {
            throw new Error("Tên hội đồng không được để trống");
        }
        if (!councilData.presidentId) {
            throw new Error("Chủ tịch hội đồng là bắt buộc");
        }
        if (!councilData.secretaryId) {
            throw new Error("Thư ký hội đồng là bắt buộc");
        }

        var council = db_findRecordByColumn(CONFIG.TABLES.COUNCIL, "id", councilId);
        if (!council) {
            throw new Error("Hội đồng không tồn tại");
        }

        if (!councilData.memberIds) councilData.memberIds = [];
        if (!councilData.reviewerIds) councilData.reviewerIds = [];

        // Total member count check
        var totalMembers = 1 + councilData.memberIds.length + councilData.reviewerIds.length;
        if (totalMembers % 2 === 0) {
            throw new Error("Số lượng thành viên hội đồng phải là số lẻ (hiện tại: " + totalMembers + ")");
        }

        // Check for duplicates
        var allIds = [councilData.presidentId, councilData.secretaryId].concat(councilData.memberIds).concat(councilData.reviewerIds);
        var seen = {};
        for (var i = 0; i < allIds.length; i++) {
            if (seen[allIds[i]]) {
                throw new Error("Giảng viên " + allIds[i] + " xuất hiện nhiều lần");
            }
            seen[allIds[i]] = true;
        }

        // Check if any NEW lecturer is already in another council
        var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
        var thisCouncilMemberIds = {};
        var assignedIds = {};

        councilMembers.forEach(function (m) {
            if (m.councilId === councilId) {
                thisCouncilMemberIds[m.lecturerId] = true;
            } else {
                assignedIds[m.lecturerId] = m.councilId;
            }
        });

        for (var j = 0; j < allIds.length; j++) {
            if (assignedIds[allIds[j]] && !thisCouncilMemberIds[allIds[j]]) {
                var lecturer = db_findRecordByColumn(CONFIG.TABLES.LECTURER, "id", allIds[j]);
                throw new Error("Giảng viên " + (lecturer ? lecturer.lecturerCode : allIds[j]) + " đã được phân công vào hội đồng khác");
            }
        }

        // Update council name and status
        db_update(CONFIG.TABLES.COUNCIL, "id", councilId, {
            councilName: councilData.councilName.trim(),
            isGradeLocked: councilData.isGradeLocked === true
        });

        // Delete old members
        var allMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
        allMembers.forEach(function (m) {
            if (m.councilId === councilId) {
                db_delete(CONFIG.TABLES.COUNCIL_MEMBER, "id", m.id);
            }
        });

        // Create new members
        var membersToCreate = [
            { lecturerId: councilData.presidentId, position: "Chủ tịch hội đồng" },
            { lecturerId: councilData.secretaryId, position: "Thư ký hội đồng" }
        ];

        councilData.memberIds.forEach(function (id) {
            membersToCreate.push({ lecturerId: id, position: "Thành viên hội đồng" });
        });

        councilData.reviewerIds.forEach(function (id) {
            membersToCreate.push({ lecturerId: id, position: "Giảng viên phản biện" });
        });

        membersToCreate.forEach(function (m) {
            db_insert(CONFIG.TABLES.COUNCIL_MEMBER, {
                id: "CM_" + new Date().getTime() + Math.random(),
                councilId: councilId,
                lecturerId: m.lecturerId,
                position: m.position
            });
        });

        return JSON.stringify({ success: true, message: "Cập nhật hội đồng thành công" });
    } catch (error) {
        Logger.log("ERROR [api_hod_updateCouncil]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Xóa hội đồng (xóa tất cả thành viên trước)
 * @param {string} councilId - Mã hội đồng
 * @returns {string} JSON. {success: true, message}
 */
function api_hod_deleteCouncil(councilId) {
    try {
        var council = db_findRecordByColumn(CONFIG.TABLES.COUNCIL, "id", councilId);
        if (!council) {
            throw new Error("Hội đồng không tồn tại");
        }

        // Delete all members of this council
        var allMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER);
        allMembers.forEach(function (m) {
            if (m.councilId === councilId) {
                db_delete(CONFIG.TABLES.COUNCIL_MEMBER, "id", m.id);
            }
        });

        // Delete council
        db_delete(CONFIG.TABLES.COUNCIL, "id", councilId);

        return JSON.stringify({ success: true, message: "Xóa hội đồng thành công" });
    } catch (error) {
        Logger.log("ERROR [api_hod_deleteCouncil]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * @description Lưu hội đồng nháp vào database (với isGradeLocked = false)
 * @param {string} councilName - Tên hội đồng
 * @returns {string} JSON. {success: true, message, id} hoặc {success: false, error}
 */
function api_hod_saveDraftCouncil(councilName) {
    try {
        if (!councilName || councilName.trim() === "") {
            throw new Error("Tên hội đồng không được để trống");
        }

        // Generate council ID HD00x
        var councilsList = db_getAll(CONFIG.TABLES.COUNCIL);
        var maxId = 0;
        for (var k = 0; k < councilsList.length; k++) {
            var cId = councilsList[k].id ? councilsList[k].id.toString() : "";
            if (cId.startsWith("HD")) {
                var num = parseInt(cId.substring(2), 10);
                if (!isNaN(num) && num > maxId) maxId = num;
            }
        }
        var councilId = "HD" + (maxId + 1).toString().padStart(3, '0');

        var d = new Date();
        var dateStr = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();

        db_insert(CONFIG.TABLES.COUNCIL, {
            id: councilId,
            councilName: councilName.trim(),
            isGradeLocked: false,
            createdAt: dateStr
        });

        return JSON.stringify({ success: true, message: "Lưu hội đồng nháp thành công", id: councilId });
    } catch (error) {
        Logger.log("ERROR [api_hod_saveDraftCouncil]: " + error.message);
        return JSON.stringify({ success: false, error: error.message });
    }
}

/**
 * Láy danh sách phòng hội đồng
 */
function api_hod_getAllDefenseRooms() {
    try {
        var councils = db_getAll(CONFIG.TABLES.COUNCIL) || [];
        var rooms = db_getAll(CONFIG.TABLES.DEFENSE_ROOM) || [];
        var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER) || [];
        var theses = db_getAll(CONFIG.TABLES.THESIS) || [];
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT) || [];
        var lecturers = db_getAll(CONFIG.TABLES.LECTURER) || [];

        var accountMap = {};
        accounts.forEach(function(a) { accountMap[a.id] = a; });
        var lecturerMap = {};
        lecturers.forEach(function(l) { lecturerMap[l.id] = l; });

        var councilRoles = {};
        councilMembers.forEach(function(cm) {
            if (!councilRoles[cm.councilId]) councilRoles[cm.councilId] = { president: "", secretary: "" };
            var l = lecturerMap[cm.lecturerId];
            var aName = l && accountMap[l.accountId] ? accountMap[l.accountId].fullName : "";
            
            if (cm.position === "Chủ tịch hội đồng") {
                councilRoles[cm.councilId].president = aName;
            } else if (cm.position === "Thư ký hội đồng") {
                councilRoles[cm.councilId].secretary = aName;
            }
        });

        var studentCounts = {};
        theses.forEach(function(t) {
            if (t.councilId) {
                studentCounts[t.councilId] = (studentCounts[t.councilId] || 0) + 1;
            }
        });

        var roomMap = {};
        rooms.forEach(function(r) { roomMap[r.councilId] = r; });

        var result = [];
        councils.forEach(function(c) {
            var r = roomMap[c.id];
            if (r) {
                var roles = councilRoles[c.id] || { president: "", secretary: "" };
                result.push({
                    id: r.id,
                    councilId: c.id,
                    councilName: c.councilName,
                    presidentName: roles.president,
                    secretaryName: roles.secretary,
                    roomName: r.roomName,
                    scheduleTime: r.scheduleTime,
                    studentCount: studentCounts[c.id] || 0
                });
            }
        });

        return JSON.stringify({ success: true, data: result });
    } catch (e) {
        Logger.log("ERROR [api_hod_getAllDefenseRooms]: " + e.message);
        return JSON.stringify({ success: false, error: e.message });
    }
}

/**
 * Lấy sinh viên (đề tài) đủ điều kiện để nhét vào hội đồng
 */
function api_hod_getEligibleTheses(councilId) {
    try {
        var theses = db_getAll(CONFIG.TABLES.THESIS) || [];
        var students = db_getAll(CONFIG.TABLES.STUDENT) || [];
        var accounts = db_getAll(CONFIG.TABLES.ACCOUNT) || [];
        var councilMembers = db_getAll(CONFIG.TABLES.COUNCIL_MEMBER) || [];

        var accountMap = {};
        accounts.forEach(function(a) { accountMap[a.id] = a; });
        var studentMap = {};
        students.forEach(function(s) { studentMap[s.id] = s; });

        var thisCouncilLecturers = {};
        councilMembers.forEach(function(cm) {
            if (cm.councilId === councilId) {
                thisCouncilLecturers[cm.lecturerId] = true;
            }
        });

        var result = [];
        theses.forEach(function(t) {
            if (t.councilId && t.councilId !== councilId) return;
            if (t.supervisorId && thisCouncilLecturers[t.supervisorId]) return;

            var student = studentMap[t.studentId];
            var studentAccount = student ? accountMap[student.accountId] : null;

            result.push({
                thesisId: t.id,
                studentId: t.studentId,
                studentCode: student ? student.studentCode : "",
                studentName: studentAccount ? studentAccount.fullName : "",
                title: t.title,
                isSelected: t.councilId === councilId
            });
        });

        return JSON.stringify({ success: true, data: result });
    } catch (e) {
        Logger.log("ERROR [api_hod_getEligibleTheses]: " + e.message);
        return JSON.stringify({ success: false, error: e.message });
    }
}

/**
 * Tạo/Cập nhật phòng hội đồng
 */
function api_hod_saveDefenseRoom(data) {
    try {
        if (!data.councilId || !data.roomName || !data.date || !data.time) {
            throw new Error("Vui lòng điền đầy đủ thông tin phòng hội đồng");
        }

        var rooms = db_getAll(CONFIG.TABLES.DEFENSE_ROOM) || [];
        var existingRoom = rooms.find(function(r) { return r.councilId === data.councilId; });

        var scheduleStr = data.date + " " + data.time;

        if (existingRoom) {
            db_update(CONFIG.TABLES.DEFENSE_ROOM, "id", existingRoom.id, {
                roomName: data.roomName.trim(),
                scheduleTime: scheduleStr
            });
        } else {
            var maxId = 0;
            for (var k = 0; k < rooms.length; k++) {
                var rId = rooms[k].id ? rooms[k].id.toString() : "";
                if (rId.startsWith("R")) {
                    var num = parseInt(rId.substring(1), 10);
                    if (!isNaN(num) && num > maxId) maxId = num;
                }
            }
            var newRoomId = "R" + (maxId + 1).toString().padStart(3, '0');

            db_insert(CONFIG.TABLES.DEFENSE_ROOM, {
                id: newRoomId,
                councilId: data.councilId,
                roomName: data.roomName.trim(),
                scheduleTime: scheduleStr
            });
        }

        var theses = db_getAll(CONFIG.TABLES.THESIS) || [];
        var selectedThesisIdsMap = {};
        (data.selectedThesisIds || []).forEach(function(tid) { selectedThesisIdsMap[tid] = true; });

        theses.forEach(function(t) {
            if (t.councilId === data.councilId) {
                if (!selectedThesisIdsMap[t.id]) {
                    db_update(CONFIG.TABLES.THESIS, "id", t.id, { councilId: "" });
                }
            } else if (selectedThesisIdsMap[t.id]) {
                db_update(CONFIG.TABLES.THESIS, "id", t.id, { councilId: data.councilId });
            }
        });

        return JSON.stringify({ success: true, message: "Cập nhật phòng hội đồng thành công" });
    } catch (e) {
        Logger.log("ERROR [api_hod_saveDefenseRoom]: " + e.message);
        return JSON.stringify({ success: false, error: e.message });
    }
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

        var result = theses.map(function (thesis) {
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
        return JSON.stringify({ success: true, data: result });
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
function api_hod_approveThesis(thesisId, newSupervisorId) {
    try {
        var existing = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!existing) throw new Error("Đề tài không tồn tại");

        var updateData = { status: "Chờ duyệt" };
        if (newSupervisorId) {
            updateData.supervisorId = newSupervisorId;
        }

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, updateData);

        return JSON.stringify({ success: true, message: "Đã duyệt đề tài thành công!" });
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

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, { status: "Từ chối" });

        // Gửi notification nếu có comment
        if (comment) {
            var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "id", thesis.studentId);
            if (student) {
                var notifId = "NOTIF_" + new Date().getTime();
                var currentUser = getCurrentUser();

                db_insert(CONFIG.TABLES.NOTIFICATION, {
                    id: notifId,
                    senderId: currentUser.id,
                    receiverId: student.accountId,
                    title: "Đề tài bị từ chối",
                    content: "Đề tài '" + thesis.title + "' của bạn đã bị từ chối với lý do: " + comment,
                    createdAt: new Date().toISOString(),
                    isRead: false
                });
            }
        }

        return JSON.stringify({ success: true, message: "Đã từ chối đề tài và gửi thông báo!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

// ==========================================
// HOD — DANH SÁCH ĐỀ TÀI (BBHĐ / BCKLTN / ĐIỂM)
// ==========================================

function _hodIsBlankCell(v) {
    return v === undefined || v === null || String(v).trim() === "";
}

function _hodSheetIsTrue(v) {
    if (v === true) return true;
    var s = String(v).trim().toUpperCase();
    return s === "TRUE" || s === "1";
}

function _hodSheetIsFalse(v) {
    if (v === false) return true;
    var s = String(v).trim().toUpperCase();
    return s === "FALSE" || s === "0";
}

/**
 * Trạng thái hiển thị cột Duyệt BBHĐ (EvaluationRecord).
 */
function _hodBbhdStatusFromEval(er) {
    if (!er || _hodIsBlankCell(er.pdfFile)) {
        return "CHƯA BẮT ĐẦU";
    }
    if (_hodSheetIsFalse(er.presidentApproved) || _hodSheetIsFalse(er.headOfDeptApproved)) {
        return "TỪ CHỐI";
    }
    if (_hodSheetIsTrue(er.presidentApproved) && _hodSheetIsTrue(er.headOfDeptApproved)) {
        return "ĐÃ DUYỆT";
    }
    if (_hodSheetIsTrue(er.presidentApproved) && _hodIsBlankCell(er.headOfDeptApproved)) {
        return "CHỜ DUYỆT";
    }
    return "CHỜ DUYỆT";
}

/**
 * Trạng thái hiển thị cột Duyệt BCKLTN (Submission cuối kỳ).
 */
function _hodBckltnStatusFromSubmission(sub) {
    if (!sub || _hodIsBlankCell(sub.pdfFile)) {
        return "CHƯA NỘP";
    }
    if (_hodSheetIsFalse(sub.presidentApproved) || _hodSheetIsFalse(sub.headOfDeptApproved)) {
        return "TỪ CHỐI";
    }
    if (_hodSheetIsTrue(sub.presidentApproved) && _hodSheetIsTrue(sub.headOfDeptApproved)) {
        return "ĐÃ DUYỆT";
    }
    if (_hodSheetIsTrue(sub.presidentApproved) && _hodIsBlankCell(sub.headOfDeptApproved)) {
        return "CHỜ DUYỆT";
    }
    return "CHỜ DUYỆT";
}

function _hodIsFinalSubmissionType(t) {
    var s = String(t || "").trim().toLowerCase();
    return s === "final" || s === "cuoiky";
}

function _hodPickFinalSubmission(rowsForThesis) {
    var list = rowsForThesis.filter(function (s) {
        return _hodIsFinalSubmissionType(s.submissionType);
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

function _hodFindEvalByThesisId(allEval, thesisId) {
    for (var i = 0; i < allEval.length; i++) {
        if (String(allEval[i].thesisId) === String(thesisId)) {
            return allEval[i];
        }
    }
    return null;
}

function _hodAvgScoreForThesis(allScores, thesisId) {
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
 * Danh sách đề tài cho màn HOD: điểm TB, trạng thái BBHĐ/BCKLTN, dữ liệu modal.
 * @returns {string} JSON
 */
function api_hod_getThesisListForReview() {
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

            var er = _hodFindEvalByThesisId(evaluations, thesis.id);
            var finalSub = _hodPickFinalSubmission(subsByThesis[tid] || []);

            var bbhd = _hodBbhdStatusFromEval(er);
            var bckltn = _hodBckltnStatusFromSubmission(finalSub);
            var avg = _hodAvgScoreForThesis(scores, thesis.id);

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
 * HOD duyệt biên bản hội đồng: set EvaluationRecord.headOfDeptApproved = TRUE.
 * @param {string} thesisId
 * @param {string} [senderAccountId]
 */
function api_hod_approveEvaluationMinutes(thesisId, senderAccountId) {
    try {
        if (!thesisId || String(thesisId).trim() === "") {
            throw new Error("Thiếu mã đề tài.");
        }
        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) {
            throw new Error("Đề tài không tồn tại.");
        }
        var evaluations = db_getAll(CONFIG.TABLES.EVALUATION_RECORD);
        var er = _hodFindEvalByThesisId(evaluations, thesisId);
        if (!er) {
            throw new Error("Chưa có biên bản hội đồng (EvaluationRecord) cho đề tài này.");
        }
        var ok = db_update(CONFIG.TABLES.EVALUATION_RECORD, "id", er.id, {
            headOfDeptApproved: true
        });
        if (!ok) {
            throw new Error("Không cập nhật được biên bản.");
        }
        return JSON.stringify({ success: true, message: "Đã duyệt biên bản hội đồng." });
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
function api_lec_approveThesis(thesisId, newTitle) {
    try {
        var thesis = db_findRecordByColumn(CONFIG.TABLES.THESIS, "id", thesisId);
        if (!thesis) throw new Error("Đề tài không tồn tại");

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, {
            status: "Đã duyệt",
            title: newTitle || thesis.title
        });

        return JSON.stringify({ success: true, message: "Đã duyệt đề tài thành công!" });
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

        db_update(CONFIG.TABLES.THESIS, "id", thesisId, { status: "Từ chối" });

        if (comment) {
            var student = db_findRecordByColumn(CONFIG.TABLES.STUDENT, "id", thesis.studentId);
            if (student) {
                var notifId = "NOTIF_" + new Date().getTime();
                var currentUser = getCurrentUser();

                db_insert(CONFIG.TABLES.NOTIFICATION, {
                    id: notifId,
                    senderId: currentUser.id,
                    receiverId: student.accountId,
                    title: "GVHD Từ chối đề tài",
                    content: "Đề tài '" + thesis.title + "' đã bị GVHD từ chối với lý do: " + comment,
                    createdAt: new Date().toISOString(),
                    isRead: false
                });
            }
        }

        return JSON.stringify({ success: true, message: "Đã từ chối đề tài!" });
    } catch (error) {
        return JSON.stringify({ success: false, error: error.message });
    }
}

