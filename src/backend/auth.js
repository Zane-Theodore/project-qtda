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
            return {
                success: true,
                userData: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role // "LECTURER", "HOD", "SECRETARY", "CHAIRMAN"
            }
        };
    }
        else {
            return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." };
        }
        
    } catch (error) {
        return { success: false, message: "Lỗi hệ thống: " + error.message };
    }
}