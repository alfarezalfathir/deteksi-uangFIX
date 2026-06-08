const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sanitizeHtml = require("sanitize-html");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;

// =========================================================
// VALIDASI ENVIRONMENT VARIABLE
// Backend berhenti apabila konfigurasi keamanan tidak lengkap.
// =========================================================
const requiredEnvironmentVariables = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(
      `Environment variable ${variableName} belum diisi.`
    );
  }
}

if (!process.env.SUPABASE_URL.startsWith("https://")) {
  throw new Error(
    "SUPABASE_URL wajib menggunakan HTTPS."
  );
}

if (JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET minimal 32 karakter."
  );
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// =========================================================
// MEMBUAT HASH TOKEN
// Token asli tidak disimpan ke database.
// =========================================================
function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

// =========================================================
// MIDDLEWARE AUTENTIKASI
//
// Memeriksa:
// 1. Apakah token tersedia
// 2. Apakah token valid
// 3. Apakah token belum expired
// 4. Apakah token belum dicabut saat logout
// =========================================================
async function authRequired(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Token tidak ditemukan. Silakan login terlebih dahulu.",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const tokenHash = hashToken(token);

    const { data: revokedToken, error } = await supabase
      .from("revoked_tokens")
      .select("id")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      console.log("Revoked token check error:", error);

      return res.status(500).json({
        error: "Gagal memeriksa status sesi.",
      });
    }

    if (revokedToken) {
      return res.status(401).json({
        error: "Sesi sudah berakhir. Silakan login kembali.",
      });
    }

    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
}

// =========================================================
// VALIDASI URL UNTUK MENCEGAH SSRF
// Server tidak boleh mengakses localhost atau jaringan private
// berdasarkan URL yang dikirim oleh user.
// =========================================================
function validateReferenceUrl(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl);

    if (parsedUrl.protocol !== "https:") {
      return {
        valid: false,
        message: "URL hanya boleh menggunakan protokol HTTPS.",
      };
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^0\./,
      /^10\./,
      /^192\.168\./,
      /^169\.254\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^::1$/,
    ];

    const isPrivateAddress = privatePatterns.some((pattern) =>
      pattern.test(hostname)
    );

    if (isPrivateAddress) {
      return {
        valid: false,
        message: "URL internal atau private tidak diizinkan.",
      };
    }

    return {
      valid: true,
      message: "URL valid.",
    };
  } catch (error) {
    return {
      valid: false,
      message: "Format URL tidak valid.",
    };
  }
}

// =========================================================
// MEMERIKSA APAKAH USER BOLEH MENGAKSES KONTRAK
// Admin boleh mengakses seluruh kontrak.
// Supplier dan distributor hanya mengakses kontraknya sendiri.
// =========================================================
function canAccessContract(user, contract) {
  const adminBolehMengakses = user.role === "admin";

  const supplierPemilik =
    user.role === "supplier" &&
    contract.supplier_id === user.id;

  const distributorPemilik =
    user.role === "distributor" &&
    contract.distributor_id === user.id;

  return (
    adminBolehMengakses ||
    supplierPemilik ||
    distributorPemilik
  );
}

// =========================================================
// KONFIGURASI UPLOAD DOKUMEN KONTRAK
//
// Keamanan:
// 1. File hanya PDF
// 2. Ukuran maksimal 2 MB
// 3. Nama file dibuat acak
// 4. File disimpan pada folder private
// =========================================================
const contractUploadDirectory = path.join(
  __dirname,
  "private_uploads",
  "contracts"
);

fs.mkdirSync(contractUploadDirectory, {
  recursive: true,
});

const contractDocumentStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, contractUploadDirectory);
  },

  filename: (req, file, callback) => {
    const randomFileName = `${crypto.randomUUID()}.pdf`;

    callback(null, randomFileName);
  },
});

const uploadContractDocument = multer({
  storage: contractDocumentStorage,

  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    const originalName = file.originalname.toLowerCase();

    const extensionValid = originalName.endsWith(".pdf");

    const mimeTypeValid =
      file.mimetype === "application/pdf";

    if (!extensionValid || !mimeTypeValid) {
      return callback(
        new Error("Hanya file PDF yang diperbolehkan.")
      );
    }

    return callback(null, true);
  },
});

// =========================================================
// LOGIN
// =========================================================
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username dan password wajib diisi.",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, full_name, password_hash, role")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.log("Login database error:", error);

      return res.status(500).json({
        error: "Gagal memeriksa akun.",
      });
    }

    if (!user) {
      return res.status(401).json({
        error: "Username atau password salah.",
      });
    }

    const passwordBenar = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordBenar) {
      return res.status(401).json({
        error: "Username atau password salah.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    return res.json({
      message: "Login berhasil.",
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("Login error:", error);

    return res.status(500).json({
      error: "Server error saat login.",
    });
  }
});

// =========================================================
// CEK USER YANG SEDANG LOGIN
// =========================================================
app.get("/auth/me", authRequired, async (req, res) => {
  return res.json({
    user: req.user,
  });
});

// =========================================================
// LOGOUT
//
// Token yang sudah logout dicabut dan tidak dapat digunakan lagi.
// =========================================================
app.post("/auth/logout", authRequired, async (req, res) => {
  try {
    const tokenHash = hashToken(req.token);

    const expiresAt = new Date(
      req.user.exp * 1000
    ).toISOString();

    const { error } = await supabase
      .from("revoked_tokens")
      .insert([
        {
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      ]);

    if (error && error.code !== "23505") {
      console.log("Logout insert error:", error);

      return res.status(500).json({
        error: "Gagal melakukan logout.",
      });
    }

    return res.json({
      message: "Logout berhasil. Token sudah dinonaktifkan.",
    });
  } catch (error) {
    console.log("Logout error:", error);

    return res.status(500).json({
      error: "Server error saat logout.",
    });
  }
});

// =========================================================
// AMBIL DAFTAR KONTRAK SESUAI ROLE
//
// Admin       → melihat semua kontrak
// Supplier    → hanya kontrak miliknya
// Distributor → hanya kontrak miliknya
// =========================================================
app.get("/contracts", authRequired, async (req, res) => {
  try {
    let query = supabase
      .from("contracts")
      .select("*")
      .order("id", { ascending: true });

    if (req.user.role === "supplier") {
      query = query.eq("supplier_id", req.user.id);
    }

    if (req.user.role === "distributor") {
      query = query.eq("distributor_id", req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Contract select error:", error);

      return res.status(500).json({
        error: "Gagal mengambil data kontrak.",
      });
    }

    return res.json(data);
  } catch (error) {
    console.log("Contract error:", error);

    return res.status(500).json({
      error: "Server error saat mengambil kontrak.",
    });
  }
});

// =========================================================
// AMBIL SATU DETAIL KONTRAK
// Terdapat validasi ownership untuk mencegah IDOR
// =========================================================
app.get("/contracts/:id", authRequired, async (req, res) => {
  try {
    const contractId = Number(req.params.id);

    if (!Number.isInteger(contractId)) {
      return res.status(400).json({
        error: "ID kontrak tidak valid.",
      });
    }

    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();

    if (error) {
      console.log("Contract detail error:", error);

      return res.status(500).json({
        error: "Gagal mengambil detail kontrak.",
      });
    }

    if (!contract) {
      return res.status(404).json({
        error: "Kontrak tidak ditemukan.",
      });
    }

    const adminBolehMelihat = req.user.role === "admin";

    const supplierPemilik =
      req.user.role === "supplier" &&
      contract.supplier_id === req.user.id;

    const distributorPemilik =
      req.user.role === "distributor" &&
      contract.distributor_id === req.user.id;

    if (
      !adminBolehMelihat &&
      !supplierPemilik &&
      !distributorPemilik
    ) {
      return res.status(403).json({
        error: "Akses ditolak. Kontrak ini bukan milik akun Anda.",
      });
    }

    return res.json(contract);
  } catch (error) {
    console.log("Contract detail server error:", error);

    return res.status(500).json({
      error: "Server error saat mengambil detail kontrak.",
    });
  }
});


// =========================================================
// GENERATE PREVIEW KONTRAK
//
// Keamanan:
// 1. Wajib login
// 2. Validasi ownership untuk mencegah IDOR
// 3. Sanitasi HTML untuk mencegah XSS dan HTML Injection
// 4. Validasi URL untuk mencegah SSRF
// =========================================================
app.post("/contracts/:id/generate", authRequired, async (req, res) => {
  try {
    const contractId = Number(req.params.id);

    if (!Number.isInteger(contractId)) {
      return res.status(400).json({
        error: "ID kontrak tidak valid.",
      });
    }

    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();

    if (error) {
      console.log("Generate contract error:", error);

      return res.status(500).json({
        error: "Gagal mengambil data kontrak.",
      });
    }

    if (!contract) {
      return res.status(404).json({
        error: "Kontrak tidak ditemukan.",
      });
    }

    const adminBolehMengakses = req.user.role === "admin";

    const supplierPemilik =
      req.user.role === "supplier" &&
      contract.supplier_id === req.user.id;

    const distributorPemilik =
      req.user.role === "distributor" &&
      contract.distributor_id === req.user.id;

    if (
      !adminBolehMengakses &&
      !supplierPemilik &&
      !distributorPemilik
    ) {
      return res.status(403).json({
        error: "Akses ditolak. Kontrak ini bukan milik akun Anda.",
      });
    }

    const rawNotes = String(req.body.notes || "");

    const cleanNotes = sanitizeHtml(rawNotes, {
      allowedTags: [],
      allowedAttributes: {},
    });

    const referenceUrl = String(
      req.body.reference_url || ""
    ).trim();

    if (referenceUrl) {
      const validation = validateReferenceUrl(referenceUrl);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.message,
        });
      }
    }

    return res.json({
      message: "Preview kontrak berhasil dibuat.",
      contract_code: contract.contract_code,
      contract_name: contract.contract_name,
      document_name: contract.document_name,
      notes: cleanNotes,
      reference_url: referenceUrl || null,
    });
  } catch (error) {
    console.log("Generate contract server error:", error);

    return res.status(500).json({
      error: "Server error saat membuat preview kontrak.",
    });
  }
});

// =========================================================
// UPLOAD DOKUMEN KONTRAK
//
// Hanya pemilik kontrak atau admin yang boleh upload.
// =========================================================
app.post(
  "/contracts/:id/document",
  authRequired,
  uploadContractDocument.single("document"),
  async (req, res) => {
    try {
      const contractId = Number(req.params.id);

      if (!Number.isInteger(contractId)) {
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(400).json({
          error: "ID kontrak tidak valid.",
        });
      }

      const { data: contract, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contractId)
        .maybeSingle();

      if (error) {
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({
          error: "Gagal mengambil data kontrak.",
        });
      }

      if (!contract) {
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(404).json({
          error: "Kontrak tidak ditemukan.",
        });
      }

      if (!canAccessContract(req.user, contract)) {
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(403).json({
          error: "Akses ditolak. Kontrak ini bukan milik akun Anda.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Dokumen PDF wajib dipilih.",
        });
      }

      // Hapus dokumen lama apabila sebelumnya sudah pernah upload.
      if (contract.document_storage_key) {
        const oldDocumentPath = path.join(
          contractUploadDirectory,
          contract.document_storage_key
        );

        if (fs.existsSync(oldDocumentPath)) {
          fs.unlinkSync(oldDocumentPath);
        }
      }

      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          document_storage_key: req.file.filename,
          document_original_name: req.file.originalname,
          document_mime_type: req.file.mimetype,
          document_size: req.file.size,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (updateError) {
        fs.unlinkSync(req.file.path);

        return res.status(500).json({
          error: "Gagal menyimpan metadata dokumen.",
        });
      }

      return res.json({
        message: "Dokumen kontrak berhasil di-upload.",
        contract_code: contract.contract_code,
        document_original_name: req.file.originalname,
        document_mime_type: req.file.mimetype,
        document_size: req.file.size,
      });
    } catch (error) {
      console.log("Upload document error:", error);

      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        error: "Server error saat upload dokumen.",
      });
    }
  }
);

// =========================================================
// DOWNLOAD DOKUMEN KONTRAK PRIVATE
//
// File tidak dapat diakses melalui URL public.
// Backend mengecek JWT dan ownership terlebih dahulu.
// =========================================================
app.get(
  "/contracts/:id/document",
  authRequired,
  async (req, res) => {
    try {
      const contractId = Number(req.params.id);

      if (!Number.isInteger(contractId)) {
        return res.status(400).json({
          error: "ID kontrak tidak valid.",
        });
      }

      const { data: contract, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contractId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          error: "Gagal mengambil data kontrak.",
        });
      }

      if (!contract) {
        return res.status(404).json({
          error: "Kontrak tidak ditemukan.",
        });
      }

      if (!canAccessContract(req.user, contract)) {
        return res.status(403).json({
          error: "Akses ditolak. Dokumen ini bukan milik akun Anda.",
        });
      }

      if (!contract.document_storage_key) {
        return res.status(404).json({
          error: "Dokumen kontrak belum tersedia.",
        });
      }

      const documentPath = path.join(
        contractUploadDirectory,
        contract.document_storage_key
      );

      if (!fs.existsSync(documentPath)) {
        return res.status(404).json({
          error: "File dokumen tidak ditemukan pada server.",
        });
      }

      return res.download(
        documentPath,
        contract.document_original_name ||
          `${contract.contract_code}.pdf`
      );
    } catch (error) {
      console.log("Download document error:", error);

      return res.status(500).json({
        error: "Server error saat mengambil dokumen.",
      });
    }
  }
);

// =========================================================
// ERROR HANDLER KHUSUS FILE UPLOAD
// =========================================================
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Ukuran file maksimal 2 MB.",
      });
    }

    return res.status(400).json({
      error: `Upload gagal: ${error.message}`,
    });
  }

  if (
    error &&
    error.message === "Hanya file PDF yang diperbolehkan."
  ) {
    return res.status(400).json({
      error: error.message,
    });
  }

  return next(error);
});

// =========================================================
// DETEKSI UANG DAN PEMBAYARAN KONTRAK
//
// Keamanan:
// 1. Wajib login memakai JWT
// 2. Kontrak divalidasi berdasarkan ownership
// 3. Hanya kontrak APPROVED yang dapat dibayar
// 4. Harga final diambil dari database, bukan dari frontend
// =========================================================
app.post("/detect", authRequired, async (req, res) => {
  console.log("Frame masuk ke Express");

  try {
    const contractId = Number(req.body.contract_id);

    if (!Number.isInteger(contractId)) {
      return res.status(400).json({
        error: "contract_id wajib diisi dengan ID yang valid.",
      });
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();

    if (contractError) {
      console.log("Contract select error:", contractError);

      return res.status(500).json({
        error: "Gagal memeriksa kontrak.",
      });
    }

    if (!contract) {
      return res.status(404).json({
        error: "Kontrak tidak ditemukan.",
      });
    }

    const adminBolehMengakses = req.user.role === "admin";

    const supplierPemilik =
      req.user.role === "supplier" &&
      contract.supplier_id === req.user.id;

    const distributorPemilik =
      req.user.role === "distributor" &&
      contract.distributor_id === req.user.id;

    if (
      !adminBolehMengakses &&
      !supplierPemilik &&
      !distributorPemilik
    ) {
      return res.status(403).json({
        error: "Akses ditolak. Kontrak ini bukan milik akun Anda.",
      });
    }

    // -----------------------------------------------------
    // MENCEGAH PEMBAYARAN GANDA
    // -----------------------------------------------------
    const {
      data: existingTransaction,
      error: existingTransactionError,
    } = await supabase
      .from("transactions")
      .select("id, status, contract_code")
      .eq("contract_id", contract.id)
      .in("status", ["SUCCESS", "WARNING"])
      .limit(1)
      .maybeSingle();

    if (existingTransactionError) {
      console.log(
        "Existing transaction error:",
        existingTransactionError
      );

      return res.status(500).json({
        error: "Gagal memeriksa riwayat pembayaran.",
      });
    }

    if (existingTransaction) {
      return res.status(409).json({
        error: "Kontrak ini sudah pernah dibayar.",
      });
    }

    if (contract.contract_status !== "APPROVED") {
      return res.status(400).json({
        error: "Kontrak belum disetujui sehingga pembayaran belum dapat dilakukan.",
      });
    }

    let result = "SUCCESS";
    let confidence = 100;
    let detected_nominal = null;
    let detected_class = null;
    let detected_box = null;

    const payment_method = req.body.payment_method || "cash";

    // Harga final selalu diambil dari database.
    // req.body.amount sengaja tidak dipercaya.
    const amount = Number(contract.contract_amount);

    if (payment_method === "cash") {
      const response = await axios.post(
        "http://127.0.0.1:8000/detect",
        {
          image: req.body.image,
        }
      );

      result = response.data.result;
      confidence = response.data.confidence;
      detected_nominal = response.data.nominal;
      detected_class = response.data.detected_class;
      detected_box = response.data.detected_box;
    } else if (payment_method === "debit") {
      result = "DEBIT SUCCESS";
      confidence = 100;
    } else if (payment_method === "ewallet") {
      result = "E-WALLET SUCCESS";
      confidence = 100;
    } else {
      return res.status(400).json({
        error: "Metode pembayaran tidak valid.",
      });
    }

    const status =
      confidence >= 85
        ? "SUCCESS"
        : confidence >= 60
          ? "WARNING"
          : "FAILED";

    const { error } = await supabase
      .from("transactions")
      .insert([
        {
          result,
          confidence,
          payment_method,
          amount,
          status,
          contract_code: contract.contract_code,
          detected_nominal,
          detected_class,
          contract_id: contract.id,
          created_by: req.user.id,
        },
      ]);

    if (error) {
      console.log("Supabase insert error:", error);

      return res.status(500).json({
        error: "Gagal menyimpan transaksi ke Supabase.",
      });
    }

    if (status === "SUCCESS") {
      const { error: updateContractError } = await supabase
        .from("contracts")
        .update({
          contract_status: "PAID",
        })
        .eq("id", contract.id);

      if (updateContractError) {
        console.log(
          "Update contract status error:",
          updateContractError
        );

        return res.status(500).json({
          error: "Transaksi tersimpan, tetapi status kontrak gagal diperbarui.",
        });
      }
    }

    return res.json({
      message: "Transaksi berhasil disimpan.",
      contract_code: contract.contract_code,
      amount,
      result,
      confidence,
      detected_nominal,
      detected_class,
      detected_box,
      color:
        confidence >= 85
          ? "#10b981"
          : confidence >= 60
            ? "#f59e0b"
            : "#ef4444",
    });
  } catch (error) {
    console.log("Detect error:", error);

    return res.status(500).json({
      error: "Server error saat memproses transaksi.",
    });
  }
});

// =========================================================
// RIWAYAT TRANSAKSI SESUAI ROLE DAN KEPEMILIKAN KONTRAK
// =========================================================
app.get("/transactions", authRequired, async (req, res) => {
  try {
    let query = supabase
      .from("transactions")
      .select("*")
      .order("id", { ascending: false });

    if (req.user.role !== "admin") {
      let contractQuery = supabase
        .from("contracts")
        .select("id");

      if (req.user.role === "supplier") {
        contractQuery = contractQuery.eq(
          "supplier_id",
          req.user.id
        );
      }

      if (req.user.role === "distributor") {
        contractQuery = contractQuery.eq(
          "distributor_id",
          req.user.id
        );
      }

      const {
        data: allowedContracts,
        error: allowedContractsError,
      } = await contractQuery;

      if (allowedContractsError) {
        console.log(
          "Allowed contracts error:",
          allowedContractsError
        );

        return res.status(500).json({
          error: "Gagal memeriksa hak akses transaksi.",
        });
      }

      const allowedContractIds = allowedContracts.map(
        (contract) => contract.id
      );

      if (allowedContractIds.length === 0) {
        return res.json([]);
      }

      query = query.in("contract_id", allowedContractIds);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Supabase select error:", error);

      return res.status(500).json({
        error: "Gagal mengambil data transaksi.",
      });
    }

    return res.json(data);
  } catch (error) {
    console.log("Transaction error:", error);

    return res.status(500).json({
      error: "Server error saat mengambil transaksi.",
    });
  }
});

app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});