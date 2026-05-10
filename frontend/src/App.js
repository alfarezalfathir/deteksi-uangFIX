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

  // FIX CAMERA
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      videoRef.current.srcObject = stream;
    } catch (error) {
      console.log(error);
    }
  };

  const startScan = async () => {
    // CASH METHOD
    if (paymentMethod === "cash") {
      if (intervalRef.current) return;

      setIsScanning(true);

      intervalRef.current = setInterval(() => {
        captureFrame();
      }, 1500);
    }

    // DEBIT METHOD
    else if (paymentMethod === "debit") {
      try {
        const response = await axios.post("/detect", {
          image: null,
          payment_method: "debit",
        });

        setResult("DEBIT SUCCESS");
        setColor("#3b82f6");
        setConfidence(100);

        fetchTransactions();
      } catch (error) {
        console.log(error);
      }
    }

    // EWALLET METHOD
    else if (paymentMethod === "ewallet") {
      try {
        const response = await axios.post("/detect", {
          image: null,
          payment_method: "ewallet",
        });

        setResult("E-WALLET SUCCESS");
        setColor("#10b981");
        setConfidence(100);

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

    const context = canvas.getContext("2d");

    canvas.width = 640;
    canvas.height = 480;

    context.drawImage(video, 0, 0);

    const image = canvas.toDataURL("image/jpeg", 0.6);

    try {
      const response = await axios.post("/detect", {
        image,
        payment_method: paymentMethod,
      });

      setResult(response.data.result);
      setColor(response.data.color);
      setConfidence(response.data.confidence);

      fetchTransactions();
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
      ? "#10b981"
      : confidence >= 60
        ? "#f59e0b"
        : confidence > 0
          ? "#ef4444"
          : "#64748b";

  return (
    <div style={styles.root}>
      <div style={styles.gridOverlay} />

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="3" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </div>

          <div>
            <div style={styles.logoName}>VaultScan</div>
            <div style={styles.logoSub}>Banknote Authentication</div>
          </div>
        </div>

        <div style={styles.headerBadge}>
          <span
            style={{
              ...styles.dot,
              background: isScanning ? "#10b981" : "#64748b",
            }}
          />

          {isScanning ? "ACTIVE" : "STANDBY"}
        </div>
      </header>

      <div style={styles.divider} />

      {/* MAIN */}
      <main style={styles.main}>
        {/* CAMERA */}
        <div style={styles.cameraCard}>
          <div style={styles.cameraLabel}>LIVE FEED</div>

          <div style={styles.cameraViewport}>
            <video ref={videoRef} autoPlay playsInline style={styles.video} />

            {["tl", "tr", "bl", "br"].map((pos) => (
              <div
                key={pos}
                style={{
                  ...styles.corner,
                  ...styles[`corner_${pos}`],
                  borderColor: isScanning ? "#c9a84c" : "#334155",
                }}
              />
            ))}

            <div
              style={{
                ...styles.guideBox,
                borderColor: isScanning ? "#c9a84c" : "#475569",
              }}
            >
              <div style={styles.guideLabel}>Align watermark here</div>
            </div>

            {isScanning && (
              <div
                style={{
                  ...styles.scanLine,
                  top: pulse ? "30%" : "70%",
                  transition: "top 0.9s ease-in-out",
                }}
              />
            )}
          </div>
        </div>

        {/* PAYMENT METHOD */}
        <div style={styles.paymentPanel}>
          <div style={styles.paymentTitle}>PAYMENT METHOD</div>

          <div style={styles.paymentButtons}>
            <button
              onClick={() => setPaymentMethod("cash")}
              style={{
                ...styles.payBtn,
                background: paymentMethod === "cash" ? "#c9a84c" : "#0d1829",
                color: paymentMethod === "cash" ? "#1a0f00" : "#94a3b8",
              }}
            >
              CASH
            </button>

            <button
              onClick={() => setPaymentMethod("debit")}
              style={{
                ...styles.payBtn,
                background: paymentMethod === "debit" ? "#3b82f6" : "#0d1829",
                color: paymentMethod === "debit" ? "#ffffff" : "#94a3b8",
              }}
            >
              DEBIT
            </button>

            <button
              onClick={() => setPaymentMethod("ewallet")}
              style={{
                ...styles.payBtn,
                background: paymentMethod === "ewallet" ? "#10b981" : "#0d1829",
                color: paymentMethod === "ewallet" ? "#ffffff" : "#94a3b8",
              }}
            >
              E-WALLET
            </button>
          </div>
        </div>

        {/* BUTTONS */}
        <div style={styles.controls}>
          <button
            onClick={startScan}
            disabled={isScanning}
            style={{
              ...styles.btn,
              ...styles.btnStart,
              opacity: isScanning ? 0.45 : 1,
            }}
          >
            START SCAN
          </button>

          <button
            onClick={stopScan}
            disabled={!isScanning}
            style={{
              ...styles.btn,
              ...styles.btnStop,
              opacity: !isScanning ? 0.45 : 1,
            }}
          >
            STOP
          </button>
        </div>

        {/* RESULT */}
        <div style={styles.resultPanel}>
          <div style={styles.resultHeader}>
            <span style={styles.resultHeaderLabel}>SCAN RESULT</span>

            <span
              style={{
                ...styles.resultStatus,
                background: isScanning
                  ? "rgba(16,185,129,0.12)"
                  : "rgba(100,116,139,0.12)",
                color: isScanning ? "#10b981" : "#64748b",
              }}
            >
              {isScanning ? "● SCANNING" : "○ IDLE"}
            </span>
          </div>

          <div style={styles.resultDivider} />

          <div style={styles.resultMain}>
            <div
              style={{
                ...styles.resultValue,
                color: result ? color : "#475569",
              }}
            >
              {result || "—"}
            </div>

            {result && (
              <div style={styles.resultSubtext}>Currency verification</div>
            )}
          </div>

          <div style={styles.resultDivider} />

          <div style={styles.metricsRow}>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>CONFIDENCE</div>

              <div style={styles.metricBar}>
                <div
                  style={{
                    ...styles.metricFill,
                    width: `${confidence}%`,
                    background: confidenceColor,
                  }}
                />
              </div>

              <div
                style={{
                  ...styles.metricValue,
                  color: confidenceColor,
                }}
              >
                {confidence > 0 ? `${confidence}%` : "—"}
              </div>
            </div>

            <div style={styles.metricSep} />

            <div style={styles.metric}>
              <div style={styles.metricLabel}>CERTAINTY</div>

              <div
                style={{
                  ...styles.certBadge,
                  background: `${confidenceColor}18`,
                  color: confidenceColor,
                }}
              >
                {confidenceLevel}
              </div>
            </div>

            <div style={styles.metricSep} />

            <div style={styles.metric}>
              <div style={styles.metricLabel}>STATUS</div>

              <div style={styles.metricValue}>
                {isScanning ? "ACTIVE" : "IDLE"}
              </div>
            </div>
          </div>
        </div>

        {/* HISTORY */}
        <div style={styles.historyPanel}>
          <div style={styles.historyHeader}>RECENT TRANSACTIONS</div>

          {transactions.length === 0 ? (
            <div style={styles.emptyHistory}>No transactions yet</div>
          ) : (
            transactions.slice(0, 5).map((item) => (
              <div key={item.id} style={styles.historyItem}>
                <div>
                  <div
                    style={{
                      ...styles.historyResult,
                      color:
                        item.result === "ASLI"
                          ? "#10b981"
                          : item.result === "MERAGUKAN"
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {item.result}
                  </div>

                  <div style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>

                  <div style={styles.historyMethod}>{item.payment_method}</div>
                </div>

                <div style={styles.historyConfidence}>{item.confidence}%</div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div style={styles.footer}>For verification purposes only</div>
      </main>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#080e1a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
  },

  header: {
    width: "100%",
    maxWidth: 420,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 20px 16px",
    zIndex: 1,
  },

  logoArea: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "linear-gradient(135deg,#c9a84c,#e8cc7e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#1a0f00",
  },

  logoName: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
  },

  logoSub: {
    color: "#64748b",
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  headerBadge: {
    fontSize: 10,
    color: "#94a3b8",
    border: "1px solid #1e293b",
    borderRadius: 20,
    padding: "4px 10px",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },

  divider: {
    width: "calc(100% - 40px)",
    maxWidth: 420,
    height: 1,
    background:
      "linear-gradient(90deg,transparent,#1e293b,#c9a84c33,#1e293b,transparent)",
  },

  main: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    zIndex: 1,
  },

  cameraCard: {
    background: "#0d1829",
    border: "1px solid #1e2d45",
    borderRadius: 16,
    overflow: "hidden",
  },

  cameraLabel: {
    fontSize: 9,
    color: "#64748b",
    padding: "10px 14px",
    letterSpacing: "0.18em",
  },

  cameraViewport: {
    position: "relative",
    aspectRatio: "4/3",
    background: "#000",
    overflow: "hidden",
  },

  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  guideBox: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "60%",
    height: "42%",
    border: "1.5px dashed",
    borderRadius: 8,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingBottom: 6,
  },

  guideLabel: {
    fontSize: 9,
    color: "#c9a84c",
    letterSpacing: "0.08em",
  },

  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    background:
      "linear-gradient(90deg,transparent,#c9a84c,#fff,#c9a84c,transparent)",
  },

  corner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderWidth: 2,
    borderStyle: "solid",
  },

  corner_tl: {
    top: 12,
    left: 12,
    borderRight: "none",
    borderBottom: "none",
  },

  corner_tr: {
    top: 12,
    right: 12,
    borderLeft: "none",
    borderBottom: "none",
  },

  corner_bl: {
    bottom: 12,
    left: 12,
    borderRight: "none",
    borderTop: "none",
  },

  corner_br: {
    bottom: 12,
    right: 12,
    borderLeft: "none",
    borderTop: "none",
  },

  controls: {
    display: "flex",
    gap: 10,
  },

  btn: {
    flex: 1,
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontWeight: 700,
    cursor: "pointer",
  },

  btnStart: {
    background: "linear-gradient(135deg,#b8902e,#e8cc7e,#b8902e)",
    color: "#1a0f00",
  },

  btnStop: {
    background: "#0d1829",
    border: "1px solid #1e293b",
    color: "#94a3b8",
  },

  resultPanel: {
    background: "#0d1829",
    border: "1px solid #1e2d45",
    borderRadius: 16,
    overflow: "hidden",
  },

  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 14px",
  },

  resultHeaderLabel: {
    fontSize: 10,
    color: "#64748b",
    letterSpacing: "0.15em",
  },

  resultStatus: {
    padding: "3px 8px",
    borderRadius: 20,
    fontSize: 9,
    fontWeight: 700,
  },

  resultDivider: {
    height: 1,
    background: "#111d2e",
  },

  resultMain: {
    padding: 20,
    textAlign: "center",
  },

  resultValue: {
    fontSize: 28,
    fontWeight: 700,
  },

  resultSubtext: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 4,
  },

  metricsRow: {
    display: "flex",
    alignItems: "center",
    padding: 14,
  },

  metric: {
    flex: 1,
    textAlign: "center",
  },

  metricLabel: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 6,
  },

  metricBar: {
    height: 3,
    background: "#1e293b",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },

  metricFill: {
    height: "100%",
  },

  metricValue: {
    color: "#fff",
    fontWeight: 700,
  },

  metricSep: {
    width: 1,
    height: 28,
    background: "#1e293b",
    margin: "0 10px",
  },

  certBadge: {
    padding: "4px 8px",
    borderRadius: 4,
    fontWeight: 700,
    fontSize: 10,
  },

  paymentPanel: {
    background: "#0d1829",
    border: "1px solid #1e2d45",
    borderRadius: 16,
    padding: 14,
  },

  paymentTitle: {
    fontSize: 10,
    color: "#64748b",
    letterSpacing: "0.18em",
    marginBottom: 12,
    fontWeight: 700,
  },

  paymentButtons: {
    display: "flex",
    gap: 10,
  },

  payBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 10,
    border: "1px solid #1e293b",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 11,
    transition: "all 0.3s",
  },

  historyPanel: {
    background: "#0d1829",
    border: "1px solid #1e2d45",
    borderRadius: 16,
    overflow: "hidden",
  },

  historyHeader: {
    padding: "12px 14px",
    fontSize: 10,
    letterSpacing: "0.18em",
    color: "#64748b",
    fontWeight: 700,
    borderBottom: "1px solid #111d2e",
  },

  emptyHistory: {
    padding: 20,
    textAlign: "center",
    color: "#475569",
    fontSize: 12,
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    borderBottom: "1px solid #111d2e",
  },

  historyResult: {
    fontSize: 13,
    fontWeight: 700,
  },

  historyDate: {
    fontSize: 10,
    color: "#475569",
    marginTop: 3,
  },

  historyMethod: {
    fontSize: 10,
    color: "#c9a84c",
    marginTop: 2,
    textTransform: "uppercase",
  },

  historyConfidence: {
    fontSize: 14,
    fontWeight: 700,
    color: "#e2e8f0",
  },

  footer: {
    fontSize: 10,
    color: "#334155",
    textAlign: "center",
    paddingTop: 4,
  },
};

export default App;
