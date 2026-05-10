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
    const response = await axios.post("http://127.0.0.1:8000/detect", {
      image: req.body.image,
    });
    const result = response.data.result;
    const confidence = response.data.confidence;

    db.query(
      "INSERT INTO transactions (result, confidence) VALUES (?, ?)",
      [result, confidence],
      (err, data) => {
        if (err) {
          console.log(err);
        }
      },
    );

    res.json(response.data);
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
