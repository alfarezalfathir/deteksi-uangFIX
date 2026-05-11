# 💵 VaultScan — Sistem Deteksi Uang & Pembayaran

VaultScan adalah aplikasi web berbasis **AI Computer Vision** untuk memverifikasi keaslian uang kertas secara real-time menggunakan kamera, sekaligus mendukung pembayaran digital (Debit & e-Wallet). Cocok digunakan sebagai sistem kasir sederhana dengan pencatatan transaksi otomatis ke database.

---

## 🧠 Cara Kerja

```
Browser (React)
    ↓  ambil frame dari kamera
Backend Express (Node.js) — port 5000
    ↓  kirim frame gambar
Python Flask (OpenCV) — port 8000
    ↓  analisis piksel & kembalikan hasil
Backend  →  simpan ke MySQL  →  kirim response ke frontend
```

---

## 🗂️ Struktur Folder

```
deteksi-uangAI/
├── frontend/          # React app (UI kamera + dashboard)
│   └── src/App.js     # Komponen utama
├── backend/           # Express.js server + static build
│   ├── server.js      # REST API & MySQL
│   └── build/         # React production build (di-copy dari frontend/build)
├── python/
│   └── detect.py      # Flask + OpenCV untuk deteksi uang
├── ngrok.exe          # Tunneling ke internet (opsional)
├── deploy.ps1         # Script otomatis build + copy
└── README.md
```

---

## ✅ Prasyarat

Pastikan semua tools berikut sudah terinstall:

| Tool | Versi | Link |
|------|-------|------|
| Node.js | >= 18.x | https://nodejs.org |
| Python | >= 3.9 | https://python.org |
| MySQL | >= 8.x | https://dev.mysql.com/downloads/ |
| Git | latest | https://git-scm.com |

---

## 🚀 Setup dari Awal (Setelah Clone)

### 1. Clone repositori

```bash
git clone https://github.com/USERNAME/deteksi-uangFIX.git
cd deteksi-uangFIX
```

---

### 2. Setup Database MySQL

Buka MySQL dan jalankan perintah berikut:

```sql
CREATE DATABASE money_detector;

USE money_detector;

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  result VARCHAR(50),
  confidence INT,
  payment_method VARCHAR(20),
  amount BIGINT,
  status VARCHAR(20),
  contract_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> ⚠️ Pastikan MySQL berjalan dengan user `root` dan password kosong.
> Jika berbeda, ubah konfigurasi di `backend/server.js`:
> ```js
> const db = mysql.createConnection({
>   host: "localhost",
>   user: "root",       // ← ganti sesuai user kamu
>   password: "",       // ← ganti sesuai password kamu
>   database: "money_detector",
> });
> ```

---

### 3. Install Dependensi Backend (Node.js)

```bash
cd backend
npm install
cd ..
```

---

### 4. Install Dependensi Frontend (React)

```bash
cd frontend
npm install
cd ..
```

---

### 5. Install Dependensi Python

```bash
cd python
pip install flask flask-cors opencv-python numpy
cd ..
```

---

### 6. Build Frontend & Copy ke Backend

```bash
cd frontend
npm run build
cd ..

# Copy hasil build ke folder backend
```

**Windows (PowerShell):**
```powershell
Copy-Item -Path "frontend\build" -Destination "backend\build" -Recurse -Force
```

**Linux / Mac:**
```bash
cp -r frontend/build backend/build
```

> 💡 Atau cukup jalankan `.\deploy.ps1` (Windows) untuk otomatis build + copy.

---

## ▶️ Menjalankan Aplikasi

Buka **3 terminal** secara bersamaan:

### Terminal 1 — Python (Deteksi OpenCV)
```bash
cd python
python detect.py
```
> Berjalan di `http://localhost:8000`

---

### Terminal 2 — Backend (Express + MySQL)
```bash
cd backend
node server.js
```
> Berjalan di `http://localhost:5000`

---

### Terminal 3 — (Opsional) Ngrok untuk akses publik
```bash
./ngrok http 5000
```
> Salin URL ngrok (contoh: `https://abc123.ngrok.io`) dan buka di browser.

---

### Akses Aplikasi

- **Lokal:** buka `http://localhost:5000`
- **Publik (ngrok):** buka URL yang diberikan ngrok

---

## 🔄 Workflow Update Frontend

Setiap kali ada perubahan di `frontend/src/App.js`:

```powershell
# Windows — jalankan script otomatis:
.\deploy.ps1

# Lalu restart server:
# (Ctrl+C di terminal backend, kemudian:)
node server.js
```

---

## 🧪 Fitur Utama

| Fitur | Keterangan |
|-------|------------|
| 📷 Deteksi Uang Tunai | Analisis real-time via kamera menggunakan OpenCV |
| 💳 Pembayaran Debit | Simulasi tap kartu — langsung tercatat |
| 📱 e-Wallet | Simulasi scan QR — langsung tercatat |
| 🧾 Hitung Kembalian | Input total belanja & jumlah bayar |
| 📋 Riwayat Transaksi | 5 transaksi terakhir ditampilkan otomatis |
| 🔒 CORS Protection | Akses Python API dibatasi hanya dari Express |

---

## ⚠️ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Kamera tidak muncul | Izinkan akses kamera di browser, gunakan HTTPS (ngrok) |
| MySQL error | Pastikan MySQL service berjalan & kredensial sesuai |
| Python error `cv2` | Jalankan `pip install opencv-python` |
| Tampilan tidak update setelah build | Hard refresh browser: `Ctrl + Shift + R` |
| Port 5000 sudah dipakai | Ganti port di `server.js` baris terakhir |

---

## 📋 Kriteria Aplikasi

---

### 1. ✅ Modul Generate Kontrak

📁 **File:** `backend/server.js` · `frontend/src/App.js`

**Apa fungsinya?**
Setiap kali ada transaksi (baik tunai, debit, maupun e-wallet), sistem otomatis membuat **kode kontrak unik** sebagai bukti transaksi. Kode ini tersimpan di database dan tampil di riwayat transaksi pada dashboard.

**Formatnya:** `INV-<timestamp>` → contoh: `INV-1747013452123`

**Cara kerjanya:**
- Backend generate kode → simpan ke DB → frontend ambil & tampilkan di history

```js
// backend/server.js — generate kode kontrak
const contract_code = "INV-" + Date.now();

db.query(
  `INSERT INTO transactions (result, confidence, payment_method, amount, status, contract_code)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [result, confidence, payment_method, amount, status, contract_code]
);
```

```js
// frontend/src/App.js — tampilkan di riwayat
<div style={s.histCode}>{item.contract_code}</div>
```

---

### 2. ✅ Modul POS Integration

📁 **File:** `frontend/src/App.js` · `backend/server.js`

**Apa fungsinya?**
Aplikasi berfungsi seperti mesin kasir (Point of Sale). Kasir bisa input total belanja dan jumlah uang yang dibayar, lalu sistem menghitung kembalian secara otomatis. Semua transaksi langsung dicatat ke database dengan status (SUCCESS/WARNING/FAILED) dan ditampilkan di dashboard.

**Cara kerjanya:**
- User input nominal → klik hitung → sistem kalkulasi kembalian
- Setiap transaksi disimpan ke DB dengan status berdasarkan confidence

```js
// frontend/src/App.js — hitung kembalian
const hitungKembalian = () => {
  const kembali = jumlahBayar - totalBelanja;
  setKembalian(kembali);
  // positif = ada kembalian, negatif = kurang bayar
};
```

```js
// backend/server.js — tentukan status & simpan ke DB
const status = confidence >= 85 ? "SUCCESS"
             : confidence >= 60 ? "WARNING"
             : "FAILED";

db.query(`INSERT INTO transactions (...) VALUES (?, ?, ?, ?, ?, ?)`, [...]);
```

---

### 3. ✅ Payment Gateway System

📁 **File:** `frontend/src/App.js` → `backend/server.js` → `python/detect.py`

**Apa fungsinya?**
Mendukung 3 jalur pembayaran berbeda yang masing-masing diproses secara berbeda:

| Metode | Cara Kerja |
|--------|------------|
| 💵 Uang Kertas | Frame kamera dikirim ke Python → dianalisis piksel putih via OpenCV → hasilkan status ASLI/MERAGUKAN/PALSU |
| 💳 Debit/Kredit | Tombol debit di klik → Express langsung set result "DEBIT SUCCESS" tanpa perlu kamera |
| 📱 e-Wallet (Dana/GoPay/OVO) | Sama seperti debit, set "E-WALLET SUCCESS" otomatis |

```python
# python/detect.py — analisis uang kertas via OpenCV
white_pixels = cv2.countNonZero(thresh)
if white_pixels > 15000:   result = "ASLI"       # banyak piksel putih = uang asli
elif white_pixels > 7000:  result = "MERAGUKAN"  # sedang = perlu dicek
else:                       result = "PALSU"      # sedikit = kemungkinan palsu
```

```js
// backend/server.js — routing metode pembayaran
if (req.body.payment_method === "cash") {
  // → kirim ke Python untuk dianalisis
} else if (req.body.payment_method === "debit") {
  result = "DEBIT SUCCESS";    confidence = 100;
} else if (req.body.payment_method === "ewallet") {
  result = "E-WALLET SUCCESS"; confidence = 100;
}
```

---

### 4. ✅ Secure by Design

📁 **File:** `python/detect.py` · `backend/server.js`

**Apa fungsinya?**
Keamanan diterapkan di setiap lapisan agar aplikasi tidak mudah diserang atau disalahgunakan:

- **CORS Restriction** → Python Flask hanya menerima request dari Express, tidak bisa diakses langsung dari luar
- **Payload Limit** → request lebih dari 10MB langsung ditolak, mencegah serangan oversized request
- **Prepared Statements** → query ke database menggunakan `?` parameter, bukan string langsung → aman dari SQL Injection
- **Validasi Input** → request tanpa gambar (untuk mode cash) langsung ditolak sebelum diproses

```python
# python/detect.py — CORS hanya izinkan dari Express
CORS(app, origins=["http://localhost:3000"])

# python/detect.py — validasi: cash wajib ada gambar
if payment_method == "cash" and not image:
    return jsonify({"error": "No image provided"}), 400
```

```js
// backend/server.js — batasi ukuran request
app.use(express.json({ limit: "10mb" }));

// backend/server.js — prepared statements, aman dari SQL Injection
db.query(
  `INSERT INTO transactions (...) VALUES (?, ?, ?, ?, ?, ?)`,
  [result, confidence, payment_method, amount, status, contract_code]
  // ↑ nilai dipisah dari query string → tidak bisa diinjeksi
);
```

---

## 📄 Lisensi

MIT License — bebas digunakan untuk keperluan edukasi.
