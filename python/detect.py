from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64

app = Flask(__name__)

@app.route('/detect', methods=['POST'])
def detect():

    print("Frame masuk ke Python")
    
    data = request.json['image']

    # hapus header base64
    encoded_data = data.split(',')[1]

    # decode base64
    nparr = np.frombuffer(
        base64.b64decode(encoded_data),
        np.uint8
    )

    # convert ke image OpenCV
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 🔥 ROI (FOCUS TENGAH LAYAR)
    h, w = gray.shape

    gray = gray[
        int(h*0.35):int(h*0.65),
        int(w*0.35):int(w*0.65)
    ]

    # blur
    blur = cv2.GaussianBlur(gray, (5,5), 0)

    # threshold area terang
    thresh = cv2.threshold(
        blur,
        180,
        255,
        cv2.THRESH_BINARY
    )[1]

    # hitung pixel putih
    white_pixels = cv2.countNonZero(thresh)

    """
    ========================
    LOGIC SEMENTARA
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

if __name__ == '__main__':
    app.run(port=8000)