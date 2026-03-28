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
   - Tại thư mục gốc của dự án, vào file .clasp.json (ngang hàng với thư mục `src`).
   - Thay Script ID vừa copy vào phần `enter-your-script-id-here`:

   ```json
   {
    "scriptId": "enter-your-script-id-here",
    "rootDir": "./src",
    ... 
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
```Plaintext
├── src/                # Toàn bộ mã nguồn
│   ├── appsscript.json # File cấu hình hệ thống (Manifest)
│   ├── main.js         # File Backend (doGet, doPost...)
│   ├── index.html      # Giao diện chính
│   └── ...             # Các file logic/UI khác
├── .clasp.json         # Cấu hình kết nối Clasp (Không đẩy lên Git)
├── .gitignore          # Danh sách file Git bỏ qua
└── README.md           # Hướng dẫn này
```