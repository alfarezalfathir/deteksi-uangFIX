import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [result, setResult] = useState("");
  const [color, setColor] = useState("#94a3b8");
  const [confidence, setConfidence] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [totalBelanja, setTotalBelanja] = useState("");
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [kembalian, setKembalian] = useState(0);

  const [detectedNominal, setDetectedNominal] = useState(null);
  const [detectedClass, setDetectedClass] = useState("");
  const [detectedBox, setDetectedBox] = useState(null);

  const intervalRef = useRef(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    startCamera();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (isScanning) {
      const t = setInterval(() => setPulse((p) => !p), 900);
      return () => clearInterval(t);
    }
  }, [isScanning]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get("/transactions");
      setTransactions(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      videoRef.current.srcObject = stream;
    } catch (error) {
      console.log("Camera error:", error);
    }
  };

  const startScan = async () => {
    if (paymentMethod === "cash") {
      if (intervalRef.current) return;

      setIsScanning(true);

      intervalRef.current = setInterval(() => {
        captureFrame();
      }, 1800);
    } else if (paymentMethod === "debit") {
      try {
        await axios.post("/detect", {
          image: null,
          payment_method: "debit",
          amount: totalBelanja,
        });

        setResult("DEBIT SUCCESS");
        setColor("#10b981");
        setConfidence(100);
        setDetectedNominal(null);
        setDetectedClass("");
        setDetectedBox(null);

        fetchTransactions();
      } catch (error) {
        console.log(error);
      }
    } else if (paymentMethod === "ewallet") {
      try {
        await axios.post("/detect", {
          image: null,
          payment_method: "ewallet",
          amount: totalBelanja,
        });

        setResult("E-WALLET SUCCESS");
        setColor("#10b981");
        setConfidence(100);
        setDetectedNominal(null);
        setDetectedClass("");
        setDetectedBox(null);

        fetchTransactions();
      } catch (error) {
        console.log(error);
      }
    }
  };

  const stopScan = () => {
    setIsScanning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const hitungKembalian = () => {
    const kembali = Number(jumlahBayar) - Number(totalBelanja);
    setKembalian(kembali);
  };

  const captureFrame = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!video || video.readyState !== 4) return;

    const context = canvas.getContext("2d");

    canvas.width = 640;
    canvas.height = 480;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const image = canvas.toDataURL("image/jpeg", 0.9);

    try {
      const response = await axios.post("/detect", {
        image,
        payment_method: paymentMethod,
        amount: totalBelanja,
      });

      setResult(response.data.result);
      setColor(response.data.color);
      setConfidence(response.data.confidence);
      setDetectedNominal(response.data.detected_nominal);
      setDetectedClass(response.data.detected_class);
      setDetectedBox(response.data.detected_box);

      fetchTransactions();

      if (response.data.detected_nominal && response.data.confidence >= 80) {
        stopScan();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const confidenceLevel =
    confidence >= 85
      ? "HIGH"
      : confidence >= 60
        ? "MEDIUM"
        : confidence > 0
          ? "LOW"
          : "—";

  const confidenceColor =
    confidence >= 85
      ? "#16a34a"
      : confidence >= 60
        ? "#d97706"
        : confidence > 0
          ? "#dc2626"
          : "#94a3b8";

  const formatRupiah = (val) => {
    if (!val && val !== 0) return "—";
    return Number(val).toLocaleString("id-ID");
  };

  const payMethods = [
    { id: "cash", label: "Tunai", icon: "💵", activeColor: "#1a56db" },
    { id: "debit", label: "Debit", icon: "💳", activeColor: "#7c3aed" },
    { id: "ewallet", label: "e-Wallet", icon: "📱", activeColor: "#0ea5e9" },
  ];

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #f0f4ff; }
        input::placeholder { color: #94a3b8; }
        input:focus { outline: none; border-color: #1a56db !important; box-shadow: 0 0 0 3px rgba(26,86,219,0.12); }
        @keyframes scan { 0%,100%{top:20%} 50%{top:75%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(26,86,219,0.35)} 50%{box-shadow:0 0 0 8px rgba(26,86,219,0)} }
      `}</style>

      <header style={s.header}>
        <div style={s.headerBg} />
        <div style={s.headerContent}>
          <div style={s.logoRow}>
            <div style={s.logoCircle}>
              <span style={{ fontSize: 22 }}>🏦</span>
            </div>
            <div>
              <div style={s.appName}>VaultScan</div>
              <div style={s.appSub}>Verifikasi Uang Tunai</div>
            </div>
          </div>

          <div
            style={{
              ...s.statusPill,
              background: isScanning ? "#dcfce7" : "#f1f5f9",
              color: isScanning ? "#16a34a" : "#64748b",
            }}
          >
            <span
              style={{
                ...s.statusDot,
                background: isScanning ? "#16a34a" : "#94a3b8",
                animation: isScanning ? "pulse 1.4s infinite" : "none",
              }}
            />
            {isScanning ? "Scanning..." : "Standby"}
          </div>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardIcon}>📷</div>
            <div>
              <div style={s.cardTitle}>Kamera Live</div>
              <div style={s.cardSub}>Arahkan uang ke dalam bingkai</div>
            </div>
          </div>

          <div style={s.cameraWrap}>
            <video ref={videoRef} autoPlay playsInline muted style={s.video} />

            {detectedBox && (
              <div
                style={{
                  ...s.detectBox,
                  left: `${((detectedBox.x - detectedBox.width / 2) / 640) * 100}%`,
                  top: `${((detectedBox.y - detectedBox.height / 2) / 480) * 100}%`,
                  width: `${(detectedBox.width / 640) * 100}%`,
                  height: `${(detectedBox.height / 480) * 100}%`,
                  borderColor: color || "#22c55e",
                }}
              >
                <div
                  style={{ ...s.detectLabel, background: color || "#22c55e" }}
                >
                  {detectedClass || "Uang"}{" "}
                  {detectedNominal
                    ? `· Rp ${Number(detectedNominal).toLocaleString("id-ID")}`
                    : ""}
                </div>
              </div>
            )}

            {[
              { top: 10, left: 10, borderRight: "none", borderBottom: "none" },
              { top: 10, right: 10, borderLeft: "none", borderBottom: "none" },
              { bottom: 10, left: 10, borderRight: "none", borderTop: "none" },
              { bottom: 10, right: 10, borderLeft: "none", borderTop: "none" },
            ].map((pos, i) => (
              <div
                key={i}
                style={{
                  ...s.corner,
                  ...pos,
                  borderColor: isScanning ? "#1a56db" : "#e2e8f0",
                }}
              />
            ))}

            <div
              style={{
                ...s.guideFrame,
                borderColor: isScanning ? "#1a56db" : "#cbd5e1",
              }}
            >
              <div style={s.guideText}>Uang kertas di sini</div>
            </div>

            {isScanning && (
              <div
                style={{
                  ...s.scanBeam,
                  animation: "scan 1.8s ease-in-out infinite",
                }}
              />
            )}

            {isScanning && (
              <div style={s.scanOverlay}>
                <div style={s.scanBadge}>● SCANNING</div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            ...s.card,
            ...s.resultCard,
            borderColor: result ? color + "44" : "#e2e8f0",
          }}
        >
          <div style={s.resultTop}>
            <div>
              <div style={s.cardTitle}>Hasil Deteksi</div>
              <div style={s.cardSub}>Verifikasi nominal dan keaslian uang</div>
            </div>

            <div
              style={{
                ...s.resultBigBadge,
                background: result ? color + "15" : "#f8fafc",
                color: result ? color : "#94a3b8",
                borderColor: result ? color + "33" : "#e2e8f0",
              }}
            >
              {result || "Belum Scan"}
            </div>
          </div>

          <div style={s.divider} />

          <div style={s.nominalBox}>
            <div style={s.nominalLabel}>Nominal Terdeteksi</div>
            <div style={s.nominalValue}>
              {detectedNominal
                ? `Rp ${Number(detectedNominal).toLocaleString("id-ID")}`
                : "—"}
            </div>
            <div style={s.nominalClass}>
              {detectedClass || "Belum ada class nominal"}
            </div>
          </div>

          <div style={s.divider} />

          <div style={s.metricsRow}>
            <div style={s.metricBox}>
              <div style={s.metricTitle}>Confidence</div>
              <div style={s.metricBigVal}>
                {confidence > 0 ? `${confidence}%` : "—"}
              </div>

              <div style={s.barTrack}>
                <div
                  style={{
                    ...s.barFill,
                    width: `${confidence}%`,
                    background: confidenceColor,
                  }}
                />
              </div>
            </div>

            <div style={s.metricDivider} />

            <div style={s.metricBox}>
              <div style={s.metricTitle}>Tingkat Keyakinan</div>
              <div
                style={{
                  ...s.certChip,
                  background: confidenceColor + "18",
                  color: confidenceColor,
                }}
              >
                {confidenceLevel}
              </div>
              <div style={s.metricSub}>
                {isScanning ? "Sedang proses..." : "Menunggu scan"}
              </div>
            </div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardIcon}>🧾</div>
            <div>
              <div style={s.cardTitle}>Detail Transaksi</div>
              <div style={s.cardSub}>Masukkan nominal pembayaran</div>
            </div>
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>Total Belanja</label>
            <div style={s.inputWrap}>
              <span style={s.prefix}>Rp</span>
              <input
                type="number"
                placeholder="0"
                value={totalBelanja}
                onChange={(e) => setTotalBelanja(e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>Jumlah Bayar</label>
            <div style={s.inputWrap}>
              <span style={s.prefix}>Rp</span>
              <input
                type="number"
                placeholder="0"
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          <button onClick={hitungKembalian} style={s.calcBtn}>
            Hitung Kembalian
          </button>

          {kembalian !== 0 && (
            <div
              style={{
                ...s.kembalianBox,
                background: kembalian >= 0 ? "#f0fdf4" : "#fef2f2",
                borderColor: kembalian >= 0 ? "#bbf7d0" : "#fecaca",
              }}
            >
              <div
                style={{
                  ...s.kembalianLabel,
                  color: kembalian >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {kembalian >= 0 ? "💰 Kembalian" : "⚠️ Kurang Bayar"}
              </div>

              <div
                style={{
                  ...s.kembalianVal,
                  color: kembalian >= 0 ? "#15803d" : "#b91c1c",
                }}
              >
                Rp {formatRupiah(Math.abs(kembalian))}
              </div>
            </div>
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardIcon}>💳</div>
            <div>
              <div style={s.cardTitle}>Metode Pembayaran</div>
              <div style={s.cardSub}>Pilih cara bayar</div>
            </div>
          </div>

          <div style={s.payRow}>
            {payMethods.map((m) => {
              const active = paymentMethod === m.id;

              return (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  style={{
                    ...s.payBtn,
                    background: active ? m.activeColor : "#f8fafc",
                    color: active ? "#fff" : "#475569",
                    border: active
                      ? `2px solid ${m.activeColor}`
                      : "2px solid #e2e8f0",
                    boxShadow: active
                      ? `0 4px 14px ${m.activeColor}44`
                      : "none",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={s.actionRow}>
          <button
            onClick={startScan}
            disabled={isScanning}
            style={{
              ...s.actionBtn,
              ...s.startBtn,
              opacity: isScanning ? 0.5 : 1,
              cursor: isScanning ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>🔍</span>
            Mulai Scan
          </button>

          <button
            onClick={stopScan}
            disabled={!isScanning}
            style={{
              ...s.actionBtn,
              ...s.stopBtn,
              opacity: !isScanning ? 0.4 : 1,
              cursor: !isScanning ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>⏹</span>
            Stop
          </button>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardIcon}>📋</div>
            <div>
              <div style={s.cardTitle}>Riwayat Transaksi</div>
              <div style={s.cardSub}>5 transaksi terakhir</div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>
                Belum ada transaksi
              </div>
            </div>
          ) : (
            <div style={s.historyList}>
              {transactions.slice(0, 5).map((item, i) => {
                const isSuccess =
                  item.result === "ASLI" ||
                  item.result === "DEBIT SUCCESS" ||
                  item.result === "E-WALLET SUCCESS";

                const rColor = isSuccess
                  ? "#16a34a"
                  : item.result === "MERAGUKAN"
                    ? "#d97706"
                    : "#dc2626";

                const rBg = isSuccess
                  ? "#f0fdf4"
                  : item.result === "MERAGUKAN"
                    ? "#fffbeb"
                    : "#fef2f2";

                return (
                  <div
                    key={item.id}
                    style={{ ...s.histItem, animationDelay: `${i * 60}ms` }}
                  >
                    <div
                      style={{ ...s.histBadge, background: rBg, color: rColor }}
                    >
                      {isSuccess
                        ? "✅"
                        : item.result === "MERAGUKAN"
                          ? "⚠️"
                          : "❌"}
                    </div>

                    <div style={s.histInfo}>
                      <div style={{ ...s.histResult, color: rColor }}>
                        {item.result}
                      </div>

                      <div style={s.histMeta}>
                        {item.payment_method?.toUpperCase()} · Total: Rp{" "}
                        {formatRupiah(item.amount)}
                      </div>

                      <div style={s.histMeta}>
                        Scan:{" "}
                        {item.detected_nominal
                          ? `Rp ${formatRupiah(item.detected_nominal)}`
                          : "Belum terdeteksi"}
                      </div>

                      <div style={s.histCode}>{item.contract_code}</div>
                    </div>

                    <div style={s.histRight}>
                      <div style={{ ...s.histConf, color: rColor }}>
                        {item.confidence}%
                      </div>
                      <div
                        style={{
                          ...s.histStatus,
                          color:
                            item.status === "SUCCESS"
                              ? "#16a34a"
                              : item.status === "WARNING"
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {item.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={s.footer}>
          🔒 Digunakan hanya untuk keperluan verifikasi internal
        </div>
      </main>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background: "#f0f4ff",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    maxWidth: 430,
    margin: "0 auto",
    paddingBottom: 32,
  },

  header: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "0 0 28px 28px",
    marginBottom: 20,
  },
  headerBg: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, #1a56db 0%, #1e3a8a 60%, #312e81 100%)",
  },
  headerContent: {
    position: "relative",
    zIndex: 1,
    padding: "48px 20px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 12 },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "rgba(255,255,255,0.18)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  appName: {
    color: "#fff",
    fontWeight: 800,
    fontSize: 18,
    letterSpacing: "-0.02em",
  },
  appSub: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
  },

  main: {
    padding: "0 16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  card: {
    background: "#fff",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 2px 16px rgba(26,86,219,0.07)",
    border: "1.5px solid #e8eef8",
    animation: "fadeIn 0.3s ease both",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#eff3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    flexShrink: 0,
  },
  cardTitle: { fontWeight: 700, fontSize: 14, color: "#1e293b" },
  cardSub: { fontSize: 11, color: "#94a3b8", marginTop: 1 },

  cameraWrap: {
    position: "relative",
    aspectRatio: "4/3",
    borderRadius: 14,
    overflow: "hidden",
    background: "#0f172a",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },

  detectBox: {
    position: "absolute",
    border: "3px solid #22c55e",
    borderRadius: 8,
    boxShadow: "0 0 12px rgba(34,197,94,0.7)",
    pointerEvents: "none",
    zIndex: 10,
  },

  detectLabel: {
    position: "absolute",
    top: -30,
    left: 0,
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: 6,
    whiteSpace: "nowrap",
  },

  corner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderWidth: 2.5,
    borderStyle: "solid",
    borderRadius: 2,
  },
  guideFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "62%",
    height: "44%",
    border: "1.5px dashed",
    borderRadius: 10,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingBottom: 6,
  },
  guideText: {
    fontSize: 9,
    color: "#93c5fd",
    fontWeight: 600,
    letterSpacing: "0.06em",
    background: "rgba(0,0,0,0.4)",
    padding: "2px 8px",
    borderRadius: 99,
  },
  scanBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    background:
      "linear-gradient(90deg, transparent, #3b82f6, #fff, #3b82f6, transparent)",
    boxShadow: "0 0 12px #3b82f6",
  },
  scanOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  scanBadge: {
    background: "rgba(26,86,219,0.85)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 99,
    letterSpacing: "0.08em",
    backdropFilter: "blur(4px)",
  },

  resultCard: { transition: "border-color 0.4s" },
  resultTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  resultBigBadge: {
    padding: "8px 14px",
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    border: "1.5px solid",
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  divider: { height: 1, background: "#f1f5f9", marginBottom: 14 },

  nominalBox: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    marginBottom: 14,
  },
  nominalLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 4,
  },
  nominalValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "#1e293b",
    letterSpacing: "-0.03em",
  },
  nominalClass: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    fontFamily: "monospace",
  },

  metricsRow: { display: "flex", gap: 0, alignItems: "center" },
  metricBox: { flex: 1 },
  metricDivider: {
    width: 1,
    height: 50,
    background: "#f1f5f9",
    margin: "0 16px",
  },
  metricTitle: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: 600,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  metricBigVal: {
    fontWeight: 800,
    fontSize: 24,
    color: "#1e293b",
    lineHeight: 1,
    marginBottom: 8,
  },
  barTrack: {
    height: 4,
    background: "#f1f5f9",
    borderRadius: 99,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.6s ease, background 0.4s",
  },
  certChip: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 99,
    fontWeight: 800,
    fontSize: 12,
    marginBottom: 6,
  },
  metricSub: { fontSize: 10, color: "#94a3b8" },

  inputGroup: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    display: "block",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    background: "#f8fafc",
    transition: "border 0.2s",
  },
  prefix: {
    padding: "12px 10px 12px 14px",
    fontSize: 13,
    fontWeight: 700,
    color: "#1a56db",
    background: "#eff3ff",
    borderRight: "1.5px solid #e2e8f0",
  },
  input: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "12px 14px",
    fontSize: 15,
    fontWeight: 700,
    color: "#1e293b",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: "100%",
  },
  calcBtn: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #1a56db, #2563eb)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: "0.02em",
    boxShadow: "0 4px 14px rgba(26,86,219,0.35)",
  },
  kembalianBox: {
    marginTop: 14,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1.5px solid",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kembalianLabel: { fontSize: 12, fontWeight: 700 },
  kembalianVal: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" },

  payRow: { display: "flex", gap: 10 },
  payBtn: {
    flex: 1,
    padding: "12px 8px",
    borderRadius: 14,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    transition: "all 0.25s ease",
  },

  actionRow: { display: "flex", gap: 10 },
  actionBtn: {
    flex: 1,
    padding: "14px",
    borderRadius: 14,
    border: "none",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.2s",
  },
  startBtn: {
    background: "linear-gradient(135deg, #1a56db, #2563eb)",
    color: "#fff",
    boxShadow: "0 4px 18px rgba(26,86,219,0.4)",
  },
  stopBtn: {
    background: "#fff",
    color: "#64748b",
    border: "1.5px solid #e2e8f0",
  },

  historyList: { display: "flex", flexDirection: "column", gap: 10 },
  histItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
    animation: "fadeIn 0.35s ease both",
  },
  histBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  histInfo: { flex: 1 },
  histResult: { fontWeight: 800, fontSize: 13 },
  histMeta: { fontSize: 10, color: "#94a3b8", marginTop: 2 },
  histCode: {
    fontSize: 10,
    color: "#cbd5e1",
    marginTop: 1,
    fontFamily: "monospace",
  },
  histRight: { textAlign: "right" },
  histConf: { fontWeight: 800, fontSize: 15 },
  histStatus: { fontSize: 10, fontWeight: 700, marginTop: 2 },

  emptyState: {
    textAlign: "center",
    padding: "28px 0 12px",
  },

  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
    padding: "8px 0 4px",
  },
};

export default App;
