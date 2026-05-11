const express = require("express");
const cors = require("cors");
const path = require("path");
const mysql = require("mysql2");

const app = express();
const axios = require("axios");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "money_detector",
});

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("MySQL Connected");
  }
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/*
========================
API DETECT
========================
*/

app.post("/detect", async (req, res) => {
  console.log("Frame masuk ke Express");

  try {
    let result = "SUCCESS";
    let confidence = 100;

    // CASH DETECTION
    if (req.body.payment_method === "cash") {
      const response = await axios.post("http://127.0.0.1:8000/detect", {
        image: req.body.image,
      });
      result = response.data.result;
      confidence = response.data.confidence;
    } else if (req.body.payment_method === "debit") {
      result = "DEBIT SUCCESS";
      confidence = 100;
    } else if (req.body.payment_method === "ewallet") {
      result = "E-WALLET SUCCESS";
      confidence = 100;
    }

    const payment_method = req.body.payment_method || "cash";
    const amount = req.body.amount || 50000;

    const status =
      confidence >= 85 ? "SUCCESS" : confidence >= 60 ? "WARNING" : "FAILED";

    const contract_code = "INV-" + Date.now();

    db.query(
      `
      INSERT INTO transactions
      (result, confidence, payment_method, amount, status, contract_code)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [result, confidence, payment_method, amount, status, contract_code],
      (err, data) => {
        if (err) {
          console.log(err);
        }
      },
    );

    res.json({
      result,
      confidence,
      color:
        confidence >= 85 ? "#10b981" : confidence >= 60 ? "#f59e0b" : "#ef4444",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Python detection error",
    });
  }
});

app.get("/transactions", (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY id DESC", (err, result) => {
    if (err) {
      console.log(err);

      res.status(500).json({
        error: "Database error",
      });
    } else {
      res.json(result);
    }
  });
});

/*
========================
REACT BUILD
========================
*/

app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

/*
========================
SERVER
========================
*/

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
