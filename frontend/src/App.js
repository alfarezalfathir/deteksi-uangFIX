import React, { useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [result, setResult] = React.useState("");
  const [color, setColor] = React.useState("black");
  const [confidence, setConfidence] = React.useState(0);

  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

      videoRef.current.srcObject = stream;

      // mulai capture realtime
      setInterval(captureFrame, 2000);
    } catch (error) {
      console.log(error);
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
        image: image,
      });

      setResult(response.data.result);
      setColor(response.data.color);
      setConfidence(response.data.confidence);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "20px",
      }}
    >
      <h1>Money Detector</h1>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        width="350"
        style={{
          border: "4px solid green",
          borderRadius: "10px",
        }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <h2 style={{ color: color }}>{result || "Waiting scan..."}</h2>

      <p>Confidence: {confidence}%</p>
    </div>
  );
}

export default App;
