import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const [result, setResult] = useState("");
  const [color, setColor] = useState("#94a3b8");
  const [confidence, setConfidence] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const [detectedNominal, setDetectedNominal] = useState(null);
  const [detectedClass, setDetectedClass] = useState("");
  const [detectedBox, setDetectedBox] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [totalBelanja, setTotalBelanja] = useState("");
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [kembalian, setKembalian] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    startCamera();
    fetchTransactions();
  }, []);

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
      alert("Kamera tidak bisa dibuka. Cek permission kamera.");
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get("/transactions");
      setTransactions(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const startScan = async () => {
    if (paymentMethod === "cash") {
      if (intervalRef.current) return;

      setIsScanning(true);

      intervalRef.current = setInterval(() => {
        captureFrame();
      }, 1800);
    } else {
      try {
        const response = await axios.post("/detect", {
          image: null,
          payment_method: paymentMethod,
          amount: totalBelanja,
        });

        setResult(response.data.result);
        setColor(response.data.color);
        setConfidence(response.data.confidence);
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

  const captureFrame = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!video || video.readyState !== 4) return;

    const ctx = canvas.getContext("2d");

    canvas.width = 640;
    canvas.height = 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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

  const hitungKembalian = () => {
    setKembalian(Number(jumlahBayar) - Number(totalBelanja));
  };

  const formatRupiah = (val) => {
    if (!val && val !== 0) return "—";
    return Number(val).toLocaleString("id-ID");
  };

  const confidenceLevel =
    confidence >= 85
      ? "HIGH"
      : confidence >= 60
        ? "MEDIUM"
        : confidence > 0
          ? "LOW"
          : "—";

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>VaultScan</h2>
          <p style={s.subtitle}>Deteksi Nominal & Keaslian Uang</p>
        </div>

        <div
          style={{
            ...s.status,
            background: isScanning ? "#dcfce7" : "#e2e8f0",
            color: isScanning ? "#16a34a" : "#64748b",
          }}
        >
          {isScanning ? "Scanning..." : "Standby"}
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Kamera Live</h3>

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
                style={{
                  ...s.detectLabel,
                  background: color || "#22c55e",
                }}
              >
                {detectedClass || "Uang"}{" "}
                {detectedNominal
                  ? `· Rp ${Number(detectedNominal).toLocaleString("id-ID")}`
                  : ""}
              </div>
            </div>
          )}

          <div style={s.guideFrame}>
            <span style={s.guideText}>Arahkan uang ke area ini</span>
          </div>

          {isScanning && <div style={s.scanLine} />}
        </div>
      </div>

      <div style={{ ...s.card, borderColor: color }}>
        <div style={s.resultHeader}>
          <div>
            <h3 style={s.cardTitle}>Hasil Deteksi</h3>
            <p style={s.smallText}>Status, nominal, dan confidence</p>
          </div>

          <div style={{ ...s.badge, color, background: color + "18" }}>
            {result || "Belum Scan"}
          </div>
        </div>

        <div style={s.nominalBox}>
          <div style={s.label}>Nominal Terdeteksi</div>
          <div style={s.nominalText}>
            {detectedNominal ? `Rp ${formatRupiah(detectedNominal)}` : "—"}
          </div>
          <div style={s.classText}>
            {detectedClass || "Belum ada class nominal"}
          </div>
        </div>

        <div style={s.metrics}>
          <div>
            <div style={s.label}>Confidence</div>
            <div style={s.metricValue}>
              {confidence > 0 ? `${confidence}%` : "—"}
            </div>
          </div>

          <div>
            <div style={s.label}>Keyakinan</div>
            <div style={s.metricValue}>{confidenceLevel}</div>
          </div>
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Detail Transaksi</h3>

        <label style={s.label}>Total Belanja</label>
        <input
          style={s.input}
          type="number"
          placeholder="Masukkan total belanja"
          value={totalBelanja}
          onChange={(e) => setTotalBelanja(e.target.value)}
        />

        <label style={s.label}>Jumlah Bayar</label>
        <input
          style={s.input}
          type="number"
          placeholder="Masukkan jumlah bayar"
          value={jumlahBayar}
          onChange={(e) => setJumlahBayar(e.target.value)}
        />

        <button style={s.blueBtn} onClick={hitungKembalian}>
          Hitung Kembalian
        </button>

        {kembalian !== 0 && (
          <div style={s.kembalianBox}>
            {kembalian >= 0 ? "Kembalian" : "Kurang Bayar"}: Rp{" "}
            {formatRupiah(Math.abs(kembalian))}
          </div>
        )}
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Metode Pembayaran</h3>

        <div style={s.payRow}>
          {[
            { id: "cash", label: "Tunai" },
            { id: "debit", label: "Debit" },
            { id: "ewallet", label: "e-Wallet" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setPaymentMethod(m.id)}
              style={{
                ...s.payBtn,
                background: paymentMethod === m.id ? "#2563eb" : "#f8fafc",
                color: paymentMethod === m.id ? "#fff" : "#334155",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.actionRow}>
        <button
          style={{ ...s.actionBtn, background: "#2563eb" }}
          onClick={startScan}
          disabled={isScanning}
        >
          Mulai Scan
        </button>

        <button
          style={{ ...s.actionBtn, background: "#64748b" }}
          onClick={stopScan}
          disabled={!isScanning}
        >
          Stop
        </button>
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Riwayat Transaksi</h3>

        {transactions.length === 0 ? (
          <p style={s.smallText}>Belum ada transaksi</p>
        ) : (
          transactions.slice(0, 5).map((item) => (
            <div key={item.id} style={s.historyItem}>
              <div>
                <b>{item.result}</b>
                <div style={s.smallText}>
                  {item.payment_method?.toUpperCase()} · Total: Rp{" "}
                  {formatRupiah(item.amount)}
                </div>
                <div style={s.smallText}>
                  Scan:{" "}
                  {item.detected_nominal
                    ? `Rp ${formatRupiah(item.detected_nominal)}`
                    : "Belum terdeteksi"}
                </div>
                <div style={s.code}>{item.contract_code}</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <b>{item.confidence}%</b>
                <div style={s.smallText}>{item.status}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    maxWidth: 430,
    margin: "0 auto",
    padding: 16,
    background: "#f0f4ff",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    background: "linear-gradient(135deg, #1d4ed8, #312e81)",
    color: "#fff",
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },

  subtitle: {
    margin: "4px 0 0",
    fontSize: 12,
    opacity: 0.8,
  },

  status: {
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  card: {
    background: "#fff",
    border: "2px solid #e2e8f0",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 2px 14px rgba(15,23,42,0.06)",
  },

  cardTitle: {
    margin: "0 0 10px",
    fontSize: 16,
    color: "#0f172a",
  },

  cameraWrap: {
    position: "relative",
    aspectRatio: "4 / 3",
    background: "#0f172a",
    borderRadius: 14,
    overflow: "hidden",
  },

  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  detectBox: {
    position: "absolute",
    border: "3px solid #22c55e",
    borderRadius: 8,
    boxShadow: "0 0 14px rgba(34,197,94,0.8)",
    pointerEvents: "none",
    zIndex: 10,
  },

  detectLabel: {
    position: "absolute",
    top: -32,
    left: 0,
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    padding: "5px 8px",
    borderRadius: 6,
    whiteSpace: "nowrap",
  },

  guideFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "72%",
    height: "44%",
    border: "2px dashed rgba(255,255,255,0.55)",
    borderRadius: 12,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: 8,
  },

  guideText: {
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    fontSize: 10,
    padding: "4px 8px",
    borderRadius: 999,
  },

  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 3,
    background: "#38bdf8",
    boxShadow: "0 0 14px #38bdf8",
  },

  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  badge: {
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 800,
  },

  nominalBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    margin: "12px 0",
  },

  nominalText: {
    fontSize: 26,
    fontWeight: 800,
    color: "#0f172a",
  },

  classText: {
    color: "#64748b",
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 4,
  },

  metrics: {
    display: "flex",
    justifyContent: "space-between",
  },

  label: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 700,
    display: "block",
    marginBottom: 6,
    marginTop: 10,
  },

  metricValue: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
  },

  input: {
    width: "100%",
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 8,
  },

  blueBtn: {
    width: "100%",
    padding: 12,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    marginTop: 6,
  },

  kembalianBox: {
    marginTop: 12,
    padding: 12,
    background: "#f8fafc",
    borderRadius: 10,
    fontWeight: 700,
  },

  payRow: {
    display: "flex",
    gap: 10,
  },

  payBtn: {
    flex: 1,
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontWeight: 700,
  },

  actionRow: {
    display: "flex",
    gap: 10,
    marginBottom: 14,
  },

  actionBtn: {
    flex: 1,
    padding: 14,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontWeight: 800,
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    background: "#f8fafc",
    borderRadius: 12,
    marginBottom: 10,
  },

  smallText: {
    fontSize: 12,
    color: "#64748b",
    margin: "3px 0",
  },

  code: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "monospace",
    marginTop: 4,
  },
};

export default App;
