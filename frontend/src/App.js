import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle2,
  WalletCards,
} from "lucide-react";

import "./App.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replaceAll(" ", "_");
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("vaultscan_token") || ""
  );

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("vaultscan_user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activePage, setActivePage] = useState("dashboard");
  const [contracts, setContracts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState("");
  const [globalError, setGlobalError] = useState("");

  function saveSession(newToken, user) {
    localStorage.setItem("vaultscan_token", newToken);
    localStorage.setItem(
      "vaultscan_user",
      JSON.stringify(user)
    );

    setToken(newToken);
    setCurrentUser(user);
  }

  function clearSession() {
    localStorage.removeItem("vaultscan_token");
    localStorage.removeItem("vaultscan_user");

    setToken("");
    setCurrentUser(null);
    setContracts([]);
    setTransactions([]);
    setActivePage("dashboard");
  }

  async function apiRequest(endpoint, options = {}) {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers: {
          ...(options.body instanceof FormData
            ? {}
            : {
                "Content-Type": "application/json",
              }),
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
          ...(options.headers || {}),
        },
      }
    );

    const contentType =
      response.headers.get("content-type") || "";

    const responseBody = contentType.includes(
      "application/json"
    )
      ? await response.json()
      : await response.blob();

    if (!response.ok) {
      if (response.status === 401 && token) {
        clearSession();
      }

      throw new Error(
        responseBody?.error ||
          responseBody?.message ||
          "Terjadi kesalahan pada server."
      );
    }

    return responseBody;
  }

  async function loadContracts() {
    try {
      const data = await apiRequest("/contracts");

      setContracts(Array.isArray(data) ? data : []);
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  async function loadTransactions() {
    try {
      const data = await apiRequest("/transactions");

      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  async function loadInitialData() {
    setLoading(true);
    setGlobalError("");
    setGlobalMessage("");

    await Promise.all([
      loadContracts(),
      loadTransactions(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    if (token) {
      loadInitialData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleLogout() {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.log("Logout server error:", error);
    }

    clearSession();
  }

  if (!token || !currentUser) {
    return <LoginPage onLogin={saveSession} />;
  }

  return (
    <div className="vault-app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-shell">
        <Topbar
          activePage={activePage}
          currentUser={currentUser}
          onRefresh={loadInitialData}
        />

        <section className="content">
          {globalError && (
            <div className="message-box message-error">
              {globalError}
            </div>
          )}

          {globalMessage && (
            <div className="message-box message-success">
              {globalMessage}
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              Memuat data VaultScan...
            </div>
          ) : (
            <div
              key={activePage}
              className="page-enter"
            >
              {activePage === "dashboard" && (
                <DashboardPage
                  contracts={contracts}
                  transactions={transactions}
                  currentUser={currentUser}
                  setActivePage={setActivePage}
                />
              )}

              {activePage === "contracts" && (
                <ContractsPage
                  contracts={contracts}
                  token={token}
                  reloadContracts={loadContracts}
                  setGlobalMessage={setGlobalMessage}
                  setGlobalError={setGlobalError}
                />
              )}

              {activePage === "scanner" && (
                <ScannerPage
                  contracts={contracts}
                  token={token}
                  reloadTransactions={loadTransactions}
                  reloadContracts={loadContracts}
                />
              )}

              {activePage === "transactions" && (
                <TransactionsPage
                  transactions={transactions}
                />
              )}

              {activePage === "profile" && (
                <ProfilePage
                  currentUser={currentUser}
                />
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] =
    useState("supplier01");

  const [password, setPassword] =
    useState("vaultscan123");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitLogin(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Username atau password salah."
        );
      }

      onLogin(data.token, data.user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-banner">
          <div className="brand">
            <div className="brand-mark">
              <ShieldCheck size={22} />
            </div>

            <div>
              <p className="brand-title">
                VaultScan
              </p>

              <p className="brand-subtitle">
                Electronic Contract Security
              </p>
            </div>
          </div>

          <h1>
            Kontrak elektronik
            <br />
            lebih aman.
          </h1>

          <p>
            Sistem verifikasi transaksi,
            pengamanan kontrak, dan pendeteksian
            uang tunai berbasis AI.
          </p>

          <div className="login-feature">
            <ShieldCheck size={17} />
            Autentikasi JWT dan pembatasan role
          </div>

          <div className="login-feature">
            <FileText size={17} />
            Dokumen kontrak tersimpan secara private
          </div>

          <div className="login-feature">
            <ScanLine size={17} />
            Verifikasi pembayaran dan uang tunai
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={submitLogin}
        >
          <h2>Masuk ke VaultScan</h2>

          <p>
            Gunakan akun admin, supplier, atau
            distributor untuk mengakses data kontrak.
          </p>

          <div className="field-group">
            <label className="field-label">
              Username
            </label>

            <input
              className="field-control"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Contoh: supplier01"
              required
            />
          </div>

          <div
            className="field-group"
            style={{ marginTop: 13 }}
          >
            <label className="field-label">
              Password
            </label>

            <input
              className="field-control"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Masukkan password"
              required
            />
          </div>

          {error && (
            <div className="message-box message-error">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
            style={{ marginTop: 17 }}
          >
            <ShieldCheck size={16} />

            {loading
              ? "Memeriksa akun..."
              : "Masuk"}
          </button>

          <div className="login-help">
            Akun demo: <b>supplier01</b>,{" "}
            <b>distributor01</b>, atau <b>admin</b>.
            <br />
            Password demo: <b>vaultscan123</b>
          </div>
        </form>
      </section>
    </main>
  );
}

function Sidebar({
  activePage,
  setActivePage,
  currentUser,
  onLogout,
}) {
  const menus = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      key: "contracts",
      label: "Kontrak Saya",
      icon: ClipboardList,
    },
    {
      key: "scanner",
      label: "Verifikasi Uang",
      icon: Camera,
    },
    {
      key: "transactions",
      label: "Transaksi",
      icon: WalletCards,
    },
    {
      key: "profile",
      label: "Profil",
      icon: UserCircle2,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <ShieldCheck size={22} />
        </div>

        <div>
          <p className="brand-title">
            VaultScan
          </p>

          <p className="brand-subtitle">
            Contract Security
          </p>
        </div>
      </div>

      <p className="sidebar-label">
        Menu utama
      </p>

      <nav className="nav-list">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <button
              key={menu.key}
              className={`nav-button ${
                activePage === menu.key
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActivePage(menu.key)
              }
            >
              <Icon size={17} />

              <span className="nav-text">
                {menu.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <p className="sidebar-user-name">
            {currentUser.full_name}
          </p>

          <p className="sidebar-user-role">
            {currentUser.role}
          </p>
        </div>

        <button
          className="nav-button"
          onClick={onLogout}
          style={{ marginTop: 8 }}
        >
          <LogOut size={17} />

          <span className="nav-text">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}

function Topbar({
  activePage,
  currentUser,
  onRefresh,
}) {
  const titleMap = {
    dashboard: "Dashboard",
    contracts: "Kontrak Elektronik",
    scanner: "Verifikasi Uang",
    transactions: "Riwayat Transaksi",
    profile: "Profil Pengguna",
  };

  return (
    <header className="topbar">
      <div>
        <h1 className="page-title">
          {titleMap[activePage]}
        </h1>

        <p className="page-subtitle">
          Selamat datang, {currentUser.full_name}.
        </p>
      </div>

      <div className="topbar-actions">
        <div className="status-chip">
          <span className="status-dot" />
          Backend aktif
        </div>

        <button
          className="ghost-button"
          onClick={onRefresh}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
    </header>
  );
}

function DashboardPage({
  contracts,
  transactions,
  currentUser,
  setActivePage,
}) {
  const approvedCount = contracts.filter(
    (contract) =>
      contract.contract_status === "APPROVED"
  ).length;

  const paidCount = contracts.filter(
    (contract) =>
      contract.contract_status === "PAID"
  ).length;

  return (
    <>
      <DashboardHero
        currentUser={currentUser}
        contracts={contracts}
        setActivePage={setActivePage}
      />

      <section className="grid-cards">
        <SummaryCard
          label="Total Kontrak"
          value={contracts.length}
          icon={ClipboardList}
          delay={0}
        />

        <SummaryCard
          label="Approved"
          value={approvedCount}
          icon={CheckCircle2}
          delay={90}
        />

        <SummaryCard
          label="Sudah Dibayar"
          value={paidCount}
          icon={WalletCards}
          delay={180}
        />

        <SummaryCard
          label="Total Transaksi"
          value={transactions.length}
          icon={Activity}
          delay={270}
        />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                Kontrak terbaru
              </h2>

              <p className="panel-description">
                Data kontrak sesuai hak akses akun.
              </p>
            </div>
          </div>

          <ContractTable
            contracts={contracts.slice(0, 6)}
            compact
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                Informasi akses
              </h2>

              <p className="panel-description">
                Hak akses ditentukan oleh backend.
              </p>
            </div>
          </div>

          <div className="panel-body profile-list">
            <ProfileRow
              label="Nama pengguna"
              value={currentUser.full_name}
            />

            <ProfileRow
              label="Username"
              value={currentUser.username}
            />

            <ProfileRow
              label="Role"
              value={currentUser.role}
            />

            <ProfileRow
              label="Keamanan"
              value="JWT + ownership validation"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function DashboardHero({
  currentUser,
  contracts,
  setActivePage,
}) {
  return (
    <section className="dashboard-hero">
      <div className="hero-glow hero-glow-one" />
      <div className="hero-glow hero-glow-two" />

      <div className="hero-content">
        <div className="hero-badge">
          <Sparkles size={14} />
          Secure Contract Workspace
        </div>

        <h2>
          Selamat datang kembali,
          <br />
          <span>{currentUser.full_name}</span>
        </h2>

        <p>
          Pantau kontrak elektronik, verifikasi
          transaksi, dan kelola dokumen dengan sistem
          keamanan berlapis.
        </p>

        <div className="hero-actions">
          <button
            className="hero-button-primary"
            onClick={() =>
              setActivePage("contracts")
            }
          >
            Lihat kontrak
            <ArrowRight size={16} />
          </button>

          <button
            className="hero-button-secondary"
            onClick={() =>
              setActivePage("scanner")
            }
          >
            <ScanLine size={16} />
            Mulai verifikasi
          </button>
        </div>
      </div>

      <div className="hero-security-card">
        <div className="hero-security-icon">
          <LockKeyhole size={28} />
        </div>

        <p className="hero-security-label">
          Security Status
        </p>

        <p className="hero-security-value">
          Protected
        </p>

        <div className="hero-security-list">
          <span>
            <ShieldCheck size={14} />
            JWT Authentication
          </span>

          <span>
            <Database size={14} />
            Ownership Validation
          </span>

          <span>
            <FileText size={14} />
            Private Document Storage
          </span>
        </div>

        <div className="hero-contract-count">
          {contracts.length} kontrak dapat diakses
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  delay = 0,
}) {
  return (
    <article
      className="summary-card summary-card-animated"
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="summary-top">
        <div className="summary-icon">
          <Icon size={18} />
        </div>

        <Gauge size={17} color="#94a3b8" />
      </div>

      <p className="summary-label">
        {label}
      </p>

      <p className="summary-value">
        <AnimatedNumber value={value} />
      </p>
    </article>
  );
}

function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] =
    useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const duration = 550;
    const startTime = performance.now();

    function updateNumber(currentTime) {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1
      );

      const easedProgress =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        Math.round(target * easedProgress)
      );

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    }

    const animationFrame =
      requestAnimationFrame(updateNumber);

    return () =>
      cancelAnimationFrame(animationFrame);
  }, [value]);

  return displayValue;
}

function ContractsPage({
  contracts,
  token,
  reloadContracts,
  setGlobalMessage,
  setGlobalError,
}) {
  const [uploadingId, setUploadingId] =
    useState(null);

  async function uploadDocument(
    contractId,
    file
  ) {
    if (!file) return;

    setUploadingId(contractId);
    setGlobalError("");
    setGlobalMessage("");

    try {
      const formData = new FormData();

      formData.append("document", file);

      const response = await fetch(
        `${API_BASE_URL}/contracts/${contractId}/document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Upload dokumen gagal."
        );
      }

      setGlobalMessage(data.message);

      await reloadContracts();
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setUploadingId(null);
    }
  }

  async function downloadDocument(
    contractId
  ) {
    setGlobalError("");
    setGlobalMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/contracts/${contractId}/document`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.error ||
            "Download dokumen gagal."
        );
      }

      const blob = await response.blob();

      const temporaryUrl =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = temporaryUrl;
      anchor.download =
        `VaultScan-DK${contractId}.pdf`;

      document.body.appendChild(anchor);

      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(temporaryUrl);

      setGlobalMessage(
        "Dokumen kontrak berhasil di-download."
      );
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            Daftar kontrak elektronik
          </h2>

          <p className="panel-description">
            Supplier dan distributor hanya melihat
            kontrak miliknya sendiri.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama kontrak</th>
              <th>Produk</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Dokumen</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="empty-state">
                    Belum ada kontrak yang dapat
                    ditampilkan.
                  </div>
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr key={contract.id}>
                  <td>
                    <b>
                      {contract.contract_code}
                    </b>
                  </td>

                  <td>
                    {contract.contract_name}
                  </td>

                  <td>
                    {contract.product_name}
                  </td>

                  <td>
                    {formatRupiah(
                      contract.contract_amount
                    )}
                  </td>

                  <td>
                    <span
                      className={`badge badge-${statusClass(
                        contract.contract_status
                      )}`}
                    >
                      {contract.contract_status}
                    </span>
                  </td>

                  <td>
                    {contract.document_original_name ||
                      contract.document_name ||
                      "-"}
                  </td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                      }}
                    >
                      <label className="secondary-button">
                        <Upload size={14} />

                        {uploadingId === contract.id
                          ? "Uploading..."
                          : "Upload"}

                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          hidden
                          disabled={
                            uploadingId ===
                            contract.id
                          }
                          onChange={(event) => {
                            const file =
                              event.target.files?.[0];

                            uploadDocument(
                              contract.id,
                              file
                            );

                            event.target.value = "";
                          }}
                        />
                      </label>

                      <button
                        className="ghost-button"
                        onClick={() =>
                          downloadDocument(
                            contract.id
                          )
                        }
                      >
                        <FileText size={14} />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ContractTable({
  contracts,
  compact = false,
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Status</th>

            {!compact && <th>Nominal</th>}
          </tr>
        </thead>

        <tbody>
          {contracts.length === 0 ? (
            <tr>
              <td colSpan="3">
                <div className="empty-state">
                  Belum ada data kontrak.
                </div>
              </td>
            </tr>
          ) : (
            contracts.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <b>
                    {contract.contract_code}
                  </b>
                </td>

                <td>
                  <span
                    className={`badge badge-${statusClass(
                      contract.contract_status
                    )}`}
                  >
                    {contract.contract_status}
                  </span>
                </td>

                {!compact && (
                  <td>
                    {formatRupiah(
                      contract.contract_amount
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScannerPage({
  contracts,
  token,
  reloadTransactions,
  reloadContracts,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [
    selectedContractId,
    setSelectedContractId,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("ewallet");

  const [cameraActive, setCameraActive] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const approvedContracts = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          contract.contract_status ===
          "APPROVED"
      ),
    [contracts]
  );

  const selectedContract =
    approvedContracts.find(
      (contract) =>
        String(contract.id) ===
        String(selectedContractId)
    );

  async function startCamera() {
    setError("");

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "environment",
            },
            audio: false,
          }
        );

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (cameraError) {
      setError(
        "Kamera tidak dapat diakses. Periksa permission browser."
      );
    }
  }

  function stopCamera() {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function captureImageBase64() {
    if (
      !videoRef.current ||
      !canvasRef.current
    ) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width =
      video.videoWidth || 1280;

    canvas.height =
      video.videoHeight || 720;

    const context =
      canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL(
      "image/jpeg",
      0.86
    );
  }

  async function submitVerification() {
    if (!selectedContractId) {
      setError(
        "Pilih kontrak terlebih dahulu."
      );

      return;
    }

    if (
      paymentMethod === "cash" &&
      !cameraActive
    ) {
      setError(
        "Aktifkan kamera sebelum melakukan verifikasi uang tunai."
      );

      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);

    try {
      const image =
        paymentMethod === "cash"
          ? captureImageBase64()
          : null;

      const response = await fetch(
        `${API_BASE_URL}/detect`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            contract_id:
              Number(selectedContractId),

            payment_method:
              paymentMethod,

            image,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Verifikasi transaksi gagal."
        );
      }

      setResult(data);

      await Promise.all([
        reloadTransactions(),
        reloadContracts(),
      ]);
    } catch (verificationError) {
      setError(
        verificationError.message
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="scan-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Kamera verifikasi uang
            </h2>

            <p className="panel-description">
              Kamera digunakan jika metode
              pembayaran tunai dipilih.
            </p>
          </div>
        </div>

        <div className="panel-body">
          <div className="camera-wrap">
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                display: cameraActive
                  ? "block"
                  : "none",
              }}
            />

            {!cameraActive && (
              <div className="camera-placeholder">
                Kamera belum diaktifkan
              </div>
            )}

            {cameraActive && (
              <>
                <div className="guide-frame">
                  <span className="guide-label">
                    Arahkan uang ke area
                    pemindaian
                  </span>
                </div>

                <div className="scan-line" />
              </>
            )}
          </div>

          <canvas
            ref={canvasRef}
            style={{
              display: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 13,
            }}
          >
            {!cameraActive ? (
              <button
                className="primary-button"
                onClick={startCamera}
              >
                <Camera size={15} />
                Aktifkan kamera
              </button>
            ) : (
              <button
                className="danger-button"
                onClick={stopCamera}
              >
                <Camera size={15} />
                Matikan kamera
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Proses transaksi
            </h2>

            <p className="panel-description">
              Harga final diambil langsung
              dari database.
            </p>
          </div>
        </div>

        <div className="panel-body">
          <div className="field-group">
            <label className="field-label">
              Kontrak approved
            </label>

            <select
              className="field-control"
              value={selectedContractId}
              onChange={(event) =>
                setSelectedContractId(
                  event.target.value
                )
              }
            >
              <option value="">
                Pilih kontrak
              </option>

              {approvedContracts.map(
                (contract) => (
                  <option
                    key={contract.id}
                    value={contract.id}
                  >
                    {contract.contract_code} —{" "}
                    {formatRupiah(
                      contract.contract_amount
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div
            className="field-group"
            style={{
              marginTop: 12,
            }}
          >
            <label className="field-label">
              Metode pembayaran
            </label>

            <select
              className="field-control"
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value
                )
              }
            >
              <option value="cash">
                Tunai
              </option>

              <option value="debit">
                Debit
              </option>

              <option value="ewallet">
                E-Wallet
              </option>
            </select>
          </div>

          {selectedContract && (
            <div
              className="result-card"
              style={{
                marginTop: 14,
              }}
            >
              <div className="field-label">
                Nilai kontrak resmi
              </div>

              <p className="result-nominal">
                {formatRupiah(
                  selectedContract.contract_amount
                )}
              </p>

              <span className="badge badge-approved">
                {
                  selectedContract.contract_status
                }
              </span>
            </div>
          )}

          {error && (
            <div className="message-box message-error">
              {error}
            </div>
          )}

          {result && (
            <div className="message-box message-success">
              <b>{result.message}</b>
              <br />
              Kontrak: {result.contract_code}
              <br />
              Nominal:{" "}
              {formatRupiah(result.amount)}
              <br />
              Hasil: {result.result}
              <br />
              Confidence: {result.confidence}%
            </div>
          )}

          <button
            className="primary-button"
            onClick={submitVerification}
            disabled={processing}
            style={{
              marginTop: 14,
              width: "100%",
            }}
          >
            <ScanLine size={16} />

            {processing
              ? "Memproses..."
              : "Proses verifikasi"}
          </button>
        </div>
      </div>
    </section>
  );
}

function TransactionsPage({
  transactions,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            Riwayat transaksi
          </h2>

          <p className="panel-description">
            Data transaksi ditampilkan
            berdasarkan role dan kepemilikan
            kontrak.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Kode kontrak</th>
              <th>Metode</th>
              <th>Nominal</th>
              <th>Hasil</th>
              <th>Status</th>
              <th>Nominal terdeteksi</th>
              <th>Waktu</th>
            </tr>
          </thead>

          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="empty-state">
                    Belum ada transaksi yang
                    dapat ditampilkan.
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map(
                (transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      {transaction.id}
                    </td>

                    <td>
                      <b>
                        {transaction.contract_code ||
                          "-"}
                      </b>
                    </td>

                    <td>
                      {
                        transaction.payment_method
                      }
                    </td>

                    <td>
                      {formatRupiah(
                        transaction.amount
                      )}
                    </td>

                    <td>
                      {transaction.result}
                    </td>

                    <td>
                      <span
                        className={`badge badge-${statusClass(
                          transaction.status
                        )}`}
                      >
                        {transaction.status}
                      </span>
                    </td>

                    <td>
                      {transaction.detected_nominal
                        ? formatRupiah(
                            transaction.detected_nominal
                          )
                        : "-"}
                    </td>

                    <td>
                      {formatDate(
                        transaction.created_at
                      )}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfilePage({ currentUser }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            Profil pengguna
          </h2>

          <p className="panel-description">
            Informasi akun dibaca dari token JWT.
          </p>
        </div>
      </div>

      <div className="panel-body profile-list">
        <ProfileRow
          label="Nama lengkap"
          value={currentUser.full_name}
        />

        <ProfileRow
          label="Username"
          value={currentUser.username}
        />

        <ProfileRow
          label="Role"
          value={currentUser.role}
        />

        <ProfileRow
          label="User ID"
          value={currentUser.id}
        />

        <ProfileRow
          label="Proteksi akses"
          value="JWT + validasi ownership"
        />
      </div>
    </section>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="profile-row">
      <span className="profile-label">
        {label}
      </span>

      <span className="profile-value">
        {value}
      </span>
    </div>
  );
}

export default App;