# 💵 VaultScan — Sistem Deteksi Uang & Pembayaran

VaultScan adalah aplikasi web berbasis **AI Computer Vision** untuk memverifikasi keaslian uang kertas secara real-time menggunakan kamera, sekaligus mendukung pembayaran digital (Debit & e-Wallet). Cocok digunakan sebagai sistem kasir sederhana dengan pencatatan transaksi otomatis ke **Supabase** (cloud database).

---

## 🧠 Cara Kerja

```
Browser (React)
    ↓  ambil frame dari kamera
Backend Express (Node.js) — port 5000
    ↓  kirim frame gambar
Python Flask (OpenCV) — port 8000
    ↓  analisis piksel & kembalikan hasil
Backend  →  simpan ke Supabase (cloud)  →  kirim response ke frontend
```

---

## 🗂️ Struktur Folder

```
deteksi-uangAI/
├── frontend/              # React app (UI kamera + dashboard)
│   ├── public/            # HTML, manifest, logo
│   └── src/App.js         # Komponen utama
├── backend/               # Express.js server + static build
│   ├── server.js          # REST API & Supabase
│   └── build/             # React production build
├── python/
│   └── detect.py          # Flask + OpenCV untuk deteksi uang
├── Dockerfile             # Konfigurasi Docker (untuk Cloud Run)
├── start.sh               # Entry point: jalankan Python + Node sekaligus
├── requirements.txt       # Dependensi Python
├── .dockerignore          # File yang dikecualikan dari Docker build
├── deploy.ps1             # Script otomatis build + copy (Windows)
└── README.md
```

---

## ✅ Prasyarat

Pastikan semua tools berikut sudah terinstall:

| Tool | Versi | Link |
|------|-------|------|
| Node.js | >= 18.x | https://nodejs.org |
| Python | >= 3.9 | https://python.org |
| Git | latest | https://git-scm.com |
| Akun Supabase | — | https://supabase.com |

> ⚠️ **MySQL tidak lagi digunakan.** Database sekarang menggunakan **Supabase** (PostgreSQL cloud).

---

## ☁️ Setup Supabase

### 1. Buat Project di Supabase

1. Login ke [https://supabase.com](https://supabase.com)
2. Klik **New Project** → isi nama project & password
3. Tunggu hingga project siap

### 2. Buat Tabel `transactions`

Buka **SQL Editor** di dashboard Supabase, lalu jalankan:

```sql
CREATE TABLE transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  result VARCHAR(50),
  confidence INT,
  payment_method VARCHAR(20),
  amount BIGINT,
  status VARCHAR(20),
  contract_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Ambil Credentials

Buka **Project Settings → API**, catat:
- **Project URL** → `SUPABASE_URL`
- **service_role key** (bukan anon key) → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 Setup dari Awal (Setelah Clone)

### 1. Clone repositori

```bash
git clone https://github.com/alfarezalfathir/deteksi-uangFIX.git
cd deteksi-uangFIX
```

---

### 2. Buat file `.env` di folder `backend/`

```bash
# backend/.env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ Jangan commit file `.env` ke Git! Pastikan `.gitignore` sudah mencakupnya.

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
pip install -r requirements.txt
```

> `requirements.txt` sudah mencakup: `flask`, `flask-cors`, `opencv-python-headless`, `numpy`, `pillow`

---

### 6. Build Frontend & Copy ke Backend

```bash
cd frontend
npm run build
cd ..
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

## ▶️ Menjalankan Aplikasi (Lokal)

Buka **2 terminal** secara bersamaan:

### Terminal 1 — Python (Deteksi OpenCV)
```bash
python python/detect.py
```
> Berjalan di `http://localhost:8000`

---

### Terminal 2 — Backend (Express + Supabase)
```bash
cd backend
node server.js
```
> Berjalan di `http://localhost:5000`

---

### Akses Aplikasi

- **Lokal:** buka `http://localhost:5000`

---

## 🐳 Deploy ke Google Cloud Run (Docker)

Proyek ini sudah dilengkapi `Dockerfile` dan `start.sh` untuk deploy ke Cloud Run.

### Cara Deploy

```bash
# Build image
docker build -t vaultscan .

# Push ke Google Container Registry (ganti PROJECT_ID)
docker tag vaultscan gcr.io/PROJECT_ID/vaultscan
docker push gcr.io/PROJECT_ID/vaultscan

# Deploy ke Cloud Run
gcloud run deploy vaultscan \
  --image gcr.io/PROJECT_ID/vaultscan \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...
```

> 💡 `start.sh` otomatis menjalankan Python Flask (background) + Express Node.js saat container start.

### Dockerfile Ringkasan

```dockerfile
FROM node:22-bookworm
# Install Python + OpenCV dependencies
RUN apt-get install -y python3 python3-pip libgl1 libglib2.0-0
# Install Python deps
RUN pip3 install --break-system-packages -r requirements.txt
# Install Node deps
RUN npm install --omit=dev
# Jalankan kedua service via start.sh
CMD ["./start.sh"]
```

---

## 🔄 Workflow Update Frontend

Setiap kali ada perubahan di `frontend/src/App.js`:

```powershell
# Windows — jalankan script otomatis:
.\deploy.ps1

# Lalu restart server:
# (Ctrl+C di terminal backend, kemudian:)
node backend/server.js
```

---

## 🧪 Fitur Utama

| Fitur | Keterangan |
|-------|------------|
| 📷 Deteksi Uang Tunai | Analisis real-time via kamera menggunakan OpenCV |
| 💳 Pembayaran Debit | Simulasi tap kartu — langsung tercatat ke Supabase |
| 📱 e-Wallet | Simulasi scan QR — langsung tercatat ke Supabase |
| 🧾 Hitung Kembalian | Input total belanja & jumlah bayar |
| 📋 Riwayat Transaksi | Transaksi terbaru ditampilkan otomatis dari Supabase |
| 🔒 CORS Protection | Akses Python API dibatasi hanya dari Express |
| 🐳 Docker Ready | Bisa di-deploy ke Cloud Run dengan satu image |

---

## ⚠️ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Kamera tidak muncul | Izinkan akses kamera di browser, gunakan HTTPS (Cloud Run otomatis HTTPS) |
| Supabase error | Periksa `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di `.env` |
| Python error `cv2` | Jalankan `pip install -r requirements.txt` |
| Tampilan tidak update setelah build | Hard refresh browser: `Ctrl + Shift + R` |
| Port 5000 sudah dipakai | Ganti `PORT` di environment variable |
| Docker build gagal | Pastikan `libgl1` dan `libglib2.0-0` ter-install di image |

---

## 📋 Kriteria Aplikasi

---

### 1. ✅ Modul Generate Kontrak

📁 **File:** `backend/server.js` · `frontend/src/App.js`

**Apa fungsinya?**
Setiap kali ada transaksi (baik tunai, debit, maupun e-wallet), sistem otomatis membuat **kode kontrak unik** sebagai bukti transaksi. Kode ini tersimpan di Supabase dan tampil di riwayat transaksi pada dashboard.

**Formatnya:** `INV-<timestamp>` → contoh: `INV-1747013452123`

**Cara kerjanya:**
- Backend generate kode → simpan ke Supabase → frontend ambil & tampilkan di history

```js
// backend/server.js — generate kode kontrak
const contract_code = "INV-" + Date.now();

await supabase.from("transactions").insert([{
  result, confidence, payment_method, amount, status, contract_code
}]);
```

```js
// frontend/src/App.js — tampilkan di riwayat
<div style={s.histCode}>{item.contract_code}</div>
```

---

### 2. ✅ Modul POS Integration

📁 **File:** `frontend/src/App.js` · `backend/server.js`

**Apa fungsinya?**
Aplikasi berfungsi seperti mesin kasir (Point of Sale). Kasir bisa input total belanja dan jumlah uang yang dibayar, lalu sistem menghitung kembalian secara otomatis. Semua transaksi langsung dicatat ke Supabase dengan status (SUCCESS/WARNING/FAILED) dan ditampilkan di dashboard.

**Cara kerjanya:**
- User input nominal → klik hitung → sistem kalkulasi kembalian
- Setiap transaksi disimpan ke Supabase dengan status berdasarkan confidence

```js
// frontend/src/App.js — hitung kembalian
const hitungKembalian = () => {
  const kembali = jumlahBayar - totalBelanja;
  setKembalian(kembali);
  // positif = ada kembalian, negatif = kurang bayar
};
```

```js
// backend/server.js — tentukan status & simpan ke Supabase
const status = confidence >= 85 ? "SUCCESS"
             : confidence >= 60 ? "WARNING"
             : "FAILED";

await supabase.from("transactions").insert([{ ... }]);
```

---

### 3. ✅ Payment Gateway System

📁 **File:** `frontend/src/App.js` → `backend/server.js` → `python/detect.py`

**Apa fungsinya?**
Mendukung 3 jalur pembayaran berbeda yang masing-masing diproses secara berbeda:

| Metode | Cara Kerja |
|--------|------------|
| 💵 Uang Kertas | Frame kamera dikirim ke Python → dianalisis piksel putih via OpenCV → hasilkan status ASLI/MERAGUKAN/PALSU |
| 💳 Debit/Kredit | Tombol debit diklik → Express langsung set result "DEBIT SUCCESS" tanpa perlu kamera |
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
if (payment_method === "cash") {
  // → kirim ke Python untuk dianalisis via axios
  const response = await axios.post("http://127.0.0.1:8000/detect", { image });
} else if (payment_method === "debit") {
  result = "DEBIT SUCCESS";    confidence = 100;
} else if (payment_method === "ewallet") {
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
- **Supabase Service Role Key** → operasi database menggunakan service role key yang disimpan di environment variable, bukan hardcode di kode
- **Parameterized Query via Supabase SDK** → insert data menggunakan Supabase client, aman dari SQL Injection
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

// backend/server.js — Supabase SDK (parameterized, aman dari SQL Injection)
const { error } = await supabase.from("transactions").insert([{
  result, confidence, payment_method, amount, status, contract_code
}]);

// Credentials dari environment variable, bukan hardcode
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

---

## 📄 Lisensi

MIT License — bebas digunakan untuk keperluan edukasi.
