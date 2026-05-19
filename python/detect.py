from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import cv2
import numpy as np
import base64
import os
import requests
import tempfile

load_dotenv()

app = Flask(__name__)
CORS(app)

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "rupiah-emisi-2022/3")

NOMINAL_MAP = {
    "001_banknote": 1000,
    "002_banknote": 2000,
    "005_banknote": 5000,
    "010_banknote": 10000,
    "020_banknote": 20000,
    "050_banknote": 50000,
    "100_banknote": 100000,

    "001_nominal": 1000,
    "002_nominal": 2000,
    "005_nominal": 5000,
    "010_nominal": 10000,
    "020_nominal": 20000,
    "050_nominal": 50000,
    "100_nominal": 100000,
}


def decode_base64_image(image_data):
    if "," in image_data:
        image_data = image_data.split(",")[1]

    image_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    return img


def detect_nominal_with_roboflow(img):
    if not ROBOFLOW_API_KEY:
        print("ROBOFLOW_API_KEY belum diisi di .env")
        return None, None, 0

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            temp_path = temp_file.name
            cv2.imwrite(temp_path, img)

        url = f"https://serverless.roboflow.com/{ROBOFLOW_MODEL_ID}"

        params = {
            "api_key": ROBOFLOW_API_KEY,
            "confidence": 30,
            "overlap": 30
        }

        with open(temp_path, "rb") as image_file:
            response = requests.post(
                url,
                params=params,
                files={"file": image_file},
                timeout=20
            )

        data = response.json()
        print("Roboflow response:", data)

        predictions = data.get("predictions", [])

        valid_predictions = [
            p for p in predictions
            if p.get("class") in NOMINAL_MAP
        ]

        if not valid_predictions:
            return None, None, 0

        best = max(valid_predictions, key=lambda p: p.get("confidence", 0))

        class_name = best.get("class")
        nominal = NOMINAL_MAP.get(class_name)
        confidence = round(best.get("confidence", 0) * 100)

        return nominal, class_name, confidence

    except Exception as e:
        print("Roboflow error:", e)
        return None, None, 0

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def check_authenticity_opencv(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    h, w = gray.shape

    roi = gray[
        int(h * 0.35):int(h * 0.65),
        int(w * 0.35):int(w * 0.65)
    ]

    blur = cv2.GaussianBlur(roi, (5, 5), 0)
    thresh = cv2.threshold(blur, 180, 255, cv2.THRESH_BINARY)[1]

    white_pixels = cv2.countNonZero(thresh)

    print("White pixels:", white_pixels)

    if white_pixels > 15000:
        return "ASLI", "#10b981", 90
    elif white_pixels > 7000:
        return "MERAGUKAN", "#f59e0b", 65
    else:
        return "PALSU", "#ef4444", 40


@app.route("/detect", methods=["POST"])
def detect():
    try:
        print("Frame masuk ke Python")

        data = request.get_json()

        if not data:
            return jsonify({"error": "No data received"}), 400

        image = data.get("image")

        if not image:
            return jsonify({"error": "No image provided"}), 400

        img = decode_base64_image(image)

        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        nominal, detected_class, nominal_confidence = detect_nominal_with_roboflow(img)

        result, color, authenticity_confidence = check_authenticity_opencv(img)

        final_confidence = nominal_confidence if nominal_confidence > 0 else authenticity_confidence

        print("Nominal:", nominal)
        print("Class:", detected_class)
        print("Result:", result)
        print("Confidence:", final_confidence)

        return jsonify({
            "nominal": nominal,
            "detected_class": detected_class,
            "result": result,
            "color": color,
            "confidence": final_confidence,
            "nominal_confidence": nominal_confidence,
            "authenticity_confidence": authenticity_confidence
        })

    except Exception as e:
        print("Python error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=8000, debug=True)