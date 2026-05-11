from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64

app = Flask(__name__)

# CORS SECURITY
CORS(app, origins=["http://localhost:3000"])

@app.route('/detect', methods=['POST'])
def detect():

    try:

        print("Frame masuk ke Python")
        
        # VALIDASI REQUEST
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No data received"
            }), 400

        payment_method = data.get("payment_method")
        image = data.get("image")

        # VALIDASI IMAGE UNTUK CASH
        if payment_method == "cash" and not image:
            return jsonify({
                "error": "No image provided"
            }), 400

        # PAYMENT SIMULATION
        if payment_method == "debit":

            return jsonify({
                "result": "DEBIT SUCCESS",
                "color": "#3b82f6",
                "confidence": 100
            })

        if payment_method == "ewallet":

            return jsonify({
                "result": "E-WALLET SUCCESS",
                "color": "#10b981",
                "confidence": 100
            })

        # HAPUS HEADER BASE64
        encoded_data = image.split(',')[1]

        # DECODE BASE64
        nparr = np.frombuffer(
            base64.b64decode(encoded_data),
            np.uint8
        )

        # CONVERT KE IMAGE
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # VALIDASI IMAGE
        if img is None:
            return jsonify({
                "error": "Invalid image"
            }), 400

        # GRAYSCALE
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # ROI TENGAH
        h, w = gray.shape

        gray = gray[
            int(h * 0.35):int(h * 0.65),
            int(w * 0.35):int(w * 0.65)
        ]

        # BLUR
        blur = cv2.GaussianBlur(gray, (5, 5), 0)

        # THRESHOLD
        thresh = cv2.threshold(
            blur,
            180,
            255,
            cv2.THRESH_BINARY
        )[1]

        # HITUNG PIXEL PUTIH
        white_pixels = cv2.countNonZero(thresh)

        """
        ========================
        DETECTION LOGIC
        ========================
        """

        if white_pixels > 15000:

            result = "ASLI"
            color = "green"
            confidence = 90

        elif white_pixels > 7000:

            result = "MERAGUKAN"
            color = "yellow"
            confidence = 55

        else:

            result = "PALSU"
            color = "red"
            confidence = 20

        return jsonify({
            "result": result,
            "color": color,
            "confidence": confidence
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == '__main__':
    app.run(port=8000)