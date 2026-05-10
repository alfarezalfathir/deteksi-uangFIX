import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [result, setResult] = useState("");
  const [color, setColor] = useState("#94a3b8");
  const [confidence, setConfidence] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const intervalRef = useRef(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    startCamera();
  }, []);

  useEffect(() => {
    if (isScanning) {
      const t = setInterval(() => setPulse((p) => !p), 900);
      return () => clearInterval(t);
    }
  }, [isScanning]);

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

  const startScan = () => {
    if (intervalRef.current) return;
    setIsScanning(true);
    intervalRef.current = setInterval(() => {
      captureFrame();
    }, 1500);
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
      const response = await axios.post("/detect", { image });
      setResult(response.data.result);
      setColor(response.data.color);
      setConfidence(response.data.confidence);
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
      {/* Subtle grid overlay */}
      <div style={styles.gridOverlay} />

      {/* Header */}
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

      {/* Divider */}
      <div style={styles.divider} />

      {/* Main content */}
      <main style={styles.main}>
        {/* Camera card */}
        <div style={styles.cameraCard}>
          <div style={styles.cameraLabel}>LIVE FEED</div>
          <div style={styles.cameraViewport}>
            <video ref={videoRef} autoPlay playsInline style={styles.video} />

            {/* Corner decorators */}
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

            {/* Guide box */}
            <div
              style={{
                ...styles.guideBox,
                borderColor: isScanning ? "#c9a84c" : "#475569",
                boxShadow: isScanning
                  ? `0 0 0 1px rgba(201,168,76,0.15), inset 0 0 30px rgba(201,168,76,0.04)`
                  : "none",
              }}
            >
              <div style={styles.guideLabel}>Align banknote here</div>
            </div>

            {/* Scan line */}
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

        {/* Controls */}
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ marginRight: 6 }}
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ marginRight: 6 }}
            >
              <rect x="4" y="4" width="16" height="16" />
            </svg>
            STOP
          </button>
        </div>

        {/* Result panel */}
        <div style={styles.resultPanel}>
          {/* Result header */}
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

          {/* Main result */}
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
              <div style={styles.resultSubtext}>Detected denomination</div>
            )}
          </div>

          <div style={styles.resultDivider} />

          {/* Metrics row */}
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
              <div style={{ ...styles.metricValue, color: confidenceColor }}>
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

        {/* Footer note */}
        <div style={styles.footer}>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: 5, opacity: 0.4 }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          For verification purposes only. Always confirm with official
          equipment.
        </div>
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
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
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
    pointerEvents: "none",
  },
  header: {
    width: "100%",
    maxWidth: 420,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "22px 20px 16px",
    zIndex: 1,
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    background: "linear-gradient(135deg, #c9a84c 0%, #e8cc7e 100%)",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#1a0f00",
    flexShrink: 0,
  },
  logoName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#f1f5f9",
    letterSpacing: "0.04em",
  },
  logoSub: {
    fontSize: 10,
    color: "#64748b",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  headerBadge: {
    fontSize: 10,
    letterSpacing: "0.12em",
    color: "#64748b",
    border: "1px solid #1e293b",
    borderRadius: 20,
    padding: "4px 10px",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontWeight: 600,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    display: "inline-block",
    transition: "background 0.3s",
  },
  divider: {
    width: "calc(100% - 40px)",
    maxWidth: 420,
    height: 1,
    background:
      "linear-gradient(90deg, transparent, #1e293b 30%, #c9a84c33 60%, #1e293b 80%, transparent)",
  },
  main: {
    width: "100%",
    maxWidth: 420,
    padding: "20px 20px 32px",
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
    letterSpacing: "0.18em",
    color: "#475569",
    fontWeight: 700,
    padding: "8px 14px 6px",
    borderBottom: "1px solid #111d2e",
  },
  cameraViewport: {
    position: "relative",
    width: "100%",
    aspectRatio: "4/3",
    overflow: "hidden",
    background: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  corner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderWidth: 2,
    borderStyle: "solid",
    transition: "border-color 0.4s",
  },
  corner_tl: {
    top: 12,
    left: 12,
    borderRight: "none",
    borderBottom: "none",
    borderRadius: "3px 0 0 0",
  },
  corner_tr: {
    top: 12,
    right: 12,
    borderLeft: "none",
    borderBottom: "none",
    borderRadius: "0 3px 0 0",
  },
  corner_bl: {
    bottom: 12,
    left: 12,
    borderRight: "none",
    borderTop: "none",
    borderRadius: "0 0 0 3px",
  },
  corner_br: {
    bottom: 12,
    right: 12,
    borderLeft: "none",
    borderTop: "none",
    borderRadius: "0 0 3px 0",
  },
  guideBox: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "62%",
    height: "44%",
    border: "1.5px dashed",
    borderRadius: 6,
    transition: "border-color 0.4s, box-shadow 0.4s",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: 6,
  },
  guideLabel: {
    fontSize: 9,
    letterSpacing: "0.1em",
    color: "rgba(201,168,76,0.5)",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    background:
      "linear-gradient(90deg, transparent, #c9a84c80 20%, #c9a84c 50%, #c9a84c80 80%, transparent)",
    pointerEvents: "none",
  },
  controls: {
    display: "flex",
    gap: 10,
  },
  btn: {
    flex: 1,
    padding: "12px 0",
    border: "none",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s, transform 0.1s",
  },
  btnStart: {
    background:
      "linear-gradient(135deg, #b8902e 0%, #e8cc7e 50%, #b8902e 100%)",
    color: "#1a0f00",
  },
  btnStop: {
    background: "#0d1829",
    color: "#94a3b8",
    border: "1px solid #1e293b",
  },
  resultPanel: {
    background: "#0d1829",
    border: "1px solid #1e2d45",
    borderRadius: 16,
    overflow: "hidden",
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
  },
  resultHeaderLabel: {
    fontSize: 9,
    letterSpacing: "0.18em",
    color: "#475569",
    fontWeight: 700,
  },
  resultStatus: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.1em",
    padding: "3px 8px",
    borderRadius: 20,
    transition: "all 0.3s",
  },
  resultDivider: {
    height: 1,
    background: "#111d2e",
  },
  resultMain: {
    padding: "18px 14px 16px",
    textAlign: "center",
  },
  resultValue: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "0.02em",
    transition: "color 0.3s",
    minHeight: 36,
  },
  resultSubtext: {
    fontSize: 10,
    color: "#475569",
    letterSpacing: "0.1em",
    marginTop: 4,
    textTransform: "uppercase",
  },
  metricsRow: {
    display: "flex",
    alignItems: "center",
    padding: "12px 14px",
    gap: 0,
  },
  metric: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 8,
    letterSpacing: "0.15em",
    color: "#334155",
    fontWeight: 700,
  },
  metricBar: {
    width: "100%",
    height: 3,
    background: "#1e293b",
    borderRadius: 2,
    overflow: "hidden",
    maxWidth: 70,
  },
  metricFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.4s ease, background 0.4s",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.05em",
  },
  certBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    padding: "3px 10px",
    borderRadius: 4,
    transition: "all 0.3s",
  },
  metricSep: {
    width: 1,
    height: 28,
    background: "#1e293b",
    flexShrink: 0,
  },
  footer: {
    fontSize: 10,
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "0.02em",
    paddingTop: 4,
  },
};

export default App;
