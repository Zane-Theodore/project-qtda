// File: src/backend/db.js

/**
 * @private
 * @description Hàm nội bộ hỗ trợ kết nối nhanh với một Tab (Sheet) cụ thể.
 * Không nên gọi hàm này trực tiếp từ các file API bên ngoài.
 * * @param {string} tableName - Tên của Tab trong Google Sheets (Lấy từ CONFIG.TABLES).
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Đối tượng Sheet của Google.
 * @throws {Error} Quăng lỗi nếu tên Tab không tồn tại hoặc nhập sai chính tả.
 */
function _getSheet(tableName) {
  var sheet = SpreadsheetApp.openById(CONFIG.DB_ID).getSheetByName(tableName);
  if (!sheet) {
    throw new Error("Lỗi DB: Không tìm thấy tab có tên là: " + tableName);
  }
  return sheet;
}

/**
 * @description Đọc toàn bộ dữ liệu của một bảng và trả về dưới dạng mảng các Object (JSON).
 * Lấy toàn bộ dữ liệu của một bảng và chuyển thành mảng các Object (JSON).
 * Dòng đầu tiên (Row 1) trên Sheet BẮT BUỘC phải là dòng chứa tên cột (Keys).
 * * @param {string} tableName - Tên tab cần lấy dữ liệu (VD: CONFIG.TABLES.USER).
 * @returns {Array<Object>} Mảng chứa các object. Trả về mảng rỗng [] nếu bảng chưa có dữ liệu.
 * * @example
 * // Trả về: [{AccountID: "1", Email: "a@gmail.com"}, {AccountID: "2", Email: "b@gmail.com"}]
 * var data = db_getAll(CONFIG.TABLES.USER);
 */
function db_getAll(tableName) {
  var sheet = _getSheet(tableName);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];
  
  var headers = data.shift(); 

  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * @description Trả về một Object duy nhất dựa trên ID (Giá trị của một cột cụ thể).
 * Quét toàn bộ bảng, tìm và trả về 1 Object đầu tiên có giá trị cột khớp với ID truyền vào.
 * * @param {string} tableName - Tên tab cần tìm.
 * @param {string} columnName - Tên cột dùng làm điều kiện tìm kiếm (VD: 'Email', 'MaSV').
 * @param {string|number} value - Giá trị cần tìm.
 * @returns {Object|null} Trả về Object chứa dữ liệu của dòng đó, hoặc `null` nếu không tìm thấy.
 * * @example
 * var user = db_findRecordByColumn(CONFIG.TABLES.TAI_KHOAN, "Email", "gv.a@truong.edu.vn");
 * if (user) { Logger.log("Tìm thấy: " + user.HoTen); }
 */
function db_findRecordByColumn(tableName, columnName, value) {
  var allData = db_getAll(tableName);
  
  for (var i = 0; i < allData.length; i++) {
    if (String(allData[i][columnName]) === String(value)) {
      return allData[i];
    }
  }
  return null;
}

/**
 * @description Hàm tái sử dụng lại hàm db_findRecordByColumn để tìm một User dựa trên Email.
 * * @param {string} email - Email của người dùng cần tìm.
 * @returns {Object|null} Trả về Object chứa dữ liệu của dòng đó, hoặc `null` nếu không tìm thấy.
 */
function db_getUserByEmail(email) {
  return db_findRecordByColumn(CONFIG.TABLES.ACCOUNT, "email", email);
}

/**
 * @description Tạo mới một bản ghi (Row) trong bảng dựa trên Object dữ liệu truyền vào.
 * Thêm 1 bản ghi mới vào dòng cuối cùng của bảng. 
 * Hàm tự động đối chiếu các key trong `dataObject` với dòng tiêu đề của Sheet để điền dữ liệu vào đúng cột.
 * Các cột có trên Sheet nhưng không có trong `dataObject` sẽ bị bỏ trống.
 * * @param {string} tableName - Tên tab cần thêm dữ liệu.
 * @param {Object} dataObject - Object chứa dữ liệu cần thêm mới.
 * @returns {boolean} Luôn trả về `true` nếu hàm chạy hoàn tất không sinh lỗi.
 * * @example
 * var newData = {
 * AccountID: "ACC_03",
 * Email: "sv.test@truong.edu.vn",
 * Role: "SINH_VIEN"
 * };
 * db_insert(CONFIG.TABLES.TAI_KHOAN, newData);
 */
function db_insert(tableName, dataObject) {
  var sheet = _getSheet(tableName);
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var newRow = headers.map(function(header) {
    return dataObject[header] !== undefined ? dataObject[header] : "";
  });
  
  sheet.appendRow(newRow);
  return true;
}

/**
 * @description Câp nhật một dòng dữ liệu dựa trên ID (Giá trị của một cột cụ thể).
 * Tìm một dòng theo ID và ghi đè các cột có sự thay đổi.
 * CHÚ Ý: Chỉ truyền vào `updateData` những cột CẦN SỬA. Các cột không truyền vào sẽ được giữ nguyên giá trị cũ.
 * * @param {string} tableName - Tên tab chứa dữ liệu.
 * @param {string} idColumn - Tên cột dùng để xác định đối tượng (Khóa chính).
 * @param {string|number} idValue - Giá trị của khóa chính.
 * @param {Object} updateData - Object chứa các { Tên_Cột : Giá_Trị_Mới }.
 * @returns {boolean} Trả về `true` nếu update thành công, `false` nếu không tìm thấy ID.
 * * @example
 * // Sinh viên chỉ đổi tên và Lớp, mã SV và năm sinh giữ nguyên
 * db_update(CONFIG.TABLES.SINH_VIEN, "MaSV", "SV001", {
 * HoTen: "Tên Mới",
 * LopDanhNghia: "IT-ChuyenSau"
 * });
 */
function db_update(tableName, idColumn, idValue, updateData) {
  var sheet = _getSheet(tableName);
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return false;
  
  var headers = data[0];
  var idColIndex = headers.indexOf(idColumn);
  
  if (idColIndex === -1) {
    throw new Error("Lỗi DB: Không tìm thấy cột [" + idColumn + "] để làm điều kiện update.");
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(idValue)) {
      var rowIndex = i + 1;
      var updatedRow = [];
      
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j];

        if (updateData.hasOwnProperty(headerName)) {
          updatedRow.push(updateData[headerName]);
        } else {
          updatedRow.push(data[i][j]);
        }
      }
      
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);
      return true;
    }
  }
  
  return false;
}

/**
 * @description Thực hiện xóa một dòng dữ liệu dựa trên ID (Giá trị của một cột cụ thể).
 * Tìm và xóa hẳn 1 dòng (Row) ra khỏi Sheet dựa trên ID.
 * * @param {string} tableName - Tên tab cần xóa dữ liệu.
 * @param {string} idColumn - Tên cột Khóa chính.
 * @param {string|number} idValue - Giá trị của Khóa chính.
 * @returns {boolean} Trả về `true` nếu xóa thành công, `false` nếu không tìm thấy ID để xóa.
 * * @example
 * db_delete(CONFIG.TABLES.TAI_KHOAN, "AccountID", "ACC_099");
 */
function db_delete(tableName, idColumn, idValue) {
  var sheet = _getSheet(tableName);
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return false;
  
  var headers = data[0];
  var idColIndex = headers.indexOf(idColumn);
  
  if (idColIndex === -1) throw new Error("Lỗi DB: Không tìm thấy cột [" + idColumn + "]");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(idValue)) {
      var rowIndex = i + 1;
      sheet.deleteRow(rowIndex);
      return true;
    }
  }
  
  return false;
}