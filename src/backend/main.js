// File: src/backend/main.js

function doGet(e) {
  return HtmlService.createTemplateFromFile('frontend/layout')
      .evaluate()
      .setTitle('Hệ thống Quản lý')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =========================================
// API ROUTER
// =========================================
function api_loadView(viewName) {
  try {
    return HtmlService.createTemplateFromFile(viewName).evaluate().getContent();
  } catch (error) {
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; font-family: 'Segoe UI', sans-serif;">
        
        <div style="font-size: 80px; margin-bottom: 15px; opacity: 0.9;">🚧</div>
        
        <h2 style="font-size: 36px; color: #e74c3c; margin-bottom: 15px; font-weight: bold;">
          Lỗi 404
        </h2>
        
        <p style="font-size: 16px; color: #7f8c8d; max-width: 450px; line-height: 1.6; margin-bottom: 20px;">
          Rất tiếc! Hệ thống không thể tìm thấy trang bạn yêu cầu. Có thể tính năng này đang được nâng cấp hoặc đường dẫn bị sai.
        </p>
        
        <div style="background-color: #f8f9fa; border: 1px dashed #bdc3c7; padding: 10px 20px; border-radius: 6px; color: #e17055;">
          <span style="font-size: 14px; color: #95a5a6;">File không tồn tại:</span><br>
          <code style="font-size: 16px; font-weight: bold;">${viewName}</code>
        </div>

        
      </div>
    `;
  }
}