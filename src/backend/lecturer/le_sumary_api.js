function doPost(e) {
    try {
      var fileBlob = e.parameter.file;  // Nhận file từ frontend
  
      // Chuyển đổi dữ liệu base64 thành file blob
      var decodedBlob = Utilities.base64Decode(fileBlob);
      var folder = DriveApp.getFolderById("1-0dwSs10b1OmjorFxWMA7qukDgp9Jm5A");  // Folder ID của bạn
  
      // Tạo file trên Google Drive
      var file = folder.createFile(decodedBlob);
      
      // Trả về link của file vừa tải lên
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        fileId: file.getId(),
        fileUrl: file.getUrl()  // Lấy URL của file trên Google Drive
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }