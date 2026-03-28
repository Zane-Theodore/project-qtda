# 🎓 Hệ thống Quản lý Sinh viên & Giảng viên (Google Apps Script)


## 🛠 1. Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, mọi thành viên cần cài đặt các công cụ sau:
1. **Node.js (LTS):** [Tải tại đây](https://nodejs.org/)
2. **Git:** [Tải tại đây](https://git-scm.com/)

---

## 🚀 2. Cài đặt môi trường (Setup)

### Bước 1: Bật quyền truy cập Google API
Truy cập [Google Apps Script Settings](https://script.google.com/home/settings) và chuyển trạng thái **Google Apps Script API** sang **ON**.

### Bước 2: Cài đặt Clasp Tool
Mở Terminal (CMD/PowerShell) và chạy lệnh:
```bash
npm install -g @google/clasp
```

### Bước 3: Đăng nhập tài khoản Google
``` Bash
clasp login
```

(Trình duyệt sẽ mở ra, hãy chọn tài khoản Gmail dùng để phát triển dự án).

## 📂 3. Khởi tạo dự án (Local Setup)

### Clone mã nguồn từ GitHub:

```Bash
git clone https://github.com/Zane-Theodore/project-qtda.git
cd project-qtda
```

### Kết nối với Apps Script:

#### Các bước thực hiện:

1. **Tạo Project cá nhân:**
   - Truy cập [script.google.com](https://script.google.com).
   - Nhấn **+ New Project**. 
   - Đặt tên tùy ý (Ví dụ: `Test_Project_NguyenVanA`).
   - Vào mục **Project Settings** (biểu tượng bánh răng ⚙️ ở cột trái).
   - Tìm và Copy dòng **Script ID**.

2. **Cấu hình tại VS Code:**
   - Tại thư mục gốc của dự án, tạo một file mới tên là ".clasp.json" (có dấu . và ngang hàng với thư mục `src`).
   - Copy nội dung sau vào file vừa tạo, và thay Script ID vừa copy vào phần `enter-your-script-id-here`:

   ```json
   {
   "scriptId": "enter-your-script-id-here",
   "rootDir": "./src",
   "scriptExtensions": [
      ".js",
      ".gs"
   ],
   "htmlExtensions": [
      ".html"
   ],
   "jsonExtensions": [
      ".json"
   ],
   "filePushOrder": [],
   "skipSubdirectories": false
   }
   ```

3. **Kiểm tra kết nối:**

    - Mở Terminal trong VS Code và chạy lệnh:

    ```Bash
    clasp push
    ```
    - Nếu Terminal báo Pushed x files, thì đã kết nối thành công.

#### Cách chạy và Kiểm tra giao diện (Test)

1. **Lên trình duyệt (Trang dự án Apps Script cá nhân).**

2. **Nhấn Deploy -> Test deployments.**

3. **Chọn loại là Web app (nếu chưa có).**

4. **Copy đường link kết thúc bằng /dev và mở trên trình duyệt.**

5. **Quy trình chuẩn: Sửa code ở VS Code -> clasp push -> Quay lại trình duyệt F5.**



## 💻 4. Quy trình làm việc (Workflow)
Để tránh xung đột code, mọi thành viên **BẮT BUỘC** tuân thủ 4 bước sau:

### Cập nhật code mới nhất: 
```bash
git pull origin main
```

### Lập trình tại VS Code: Chỉnh sửa các file trong thư mục src.

### Đẩy code lên Google Cloud (Project cá nhân) để chạy thử:

``` Bash
clasp push
```

### (Sau đó F5 link Web App /dev để xem kết quả).


### Lưu code lên GitHub:

``` Bash
git add .
git commit -m "Mô tả ngắn gọn việc vừa làm"
git push origin main
```

## 🏗 5. Cấu trúc thư mục dự án
```text
├── src/                 # Thư mục chứa toàn bộ mã nguồn (được push lên Apps Script)
│   ├── backend/         # Xử lý logic máy chủ (Server-side)
│   │   ├── lecturer/    # API và logic dành riêng cho Giảng viên
│   │   ├── student/     # API và logic dành riêng cho Sinh viên
│   │   ├── auth.js      # Xử lý phân quyền, nhận diện email & Role
│   │   ├── db.js        # Các hàm giao tiếp với Database (Google Sheets)
│   │   └── main.js      # Điểm neo chính (chứa hàm doGet, điều hướng trang)
│   │
│   ├── config/          # Chứa các biến môi trường, ID Sheet, thông số cấu hình chung
│   │
│   ├── frontend/        # Giao diện người dùng (Client-side)
│   │   ├── assets/      # Chứa CSS tĩnh và JS chạy trên trình duyệt
│   │   ├── components/  # Các phần UI dùng chung (Header, Footer, Sidebar)
│   │   └── views/       # Các trang giao diện chính (Trang SV, Trang GV)
│   │
│   └── appsscript.json  # File cấu hình Manifest bắt buộc của Google Apps Script
│
├── .clasp.json          # File liên kết dự án local với Google Apps Script
├── .claspignore         # Chỉ định các file KHÔNG được push lên Google server
├── .gitignore           # Chỉ định các file KHÔNG được push lên GitHub
└── README.md            # Tài liệu hướng dẫn cài đặt và sử dụng dự án