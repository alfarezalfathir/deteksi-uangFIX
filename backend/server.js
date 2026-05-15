const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

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

    const payment_method = req.body.payment_method || "cash";
    const amount = req.body.amount || 50000;

    if (payment_method === "cash") {
      const response = await axios.post("http://127.0.0.1:8000/detect", {
        image: req.body.image,
      });

      result = response.data.result;
      confidence = response.data.confidence;
    } else if (payment_method === "debit") {
      result = "DEBIT SUCCESS";
      confidence = 100;
    } else if (payment_method === "ewallet") {
      result = "E-WALLET SUCCESS";
      confidence = 100;
    }

    const status =
      confidence >= 85 ? "SUCCESS" : confidence >= 60 ? "WARNING" : "FAILED";

    const contract_code = "INV-" + Date.now();

    const { error } = await supabase.from("transactions").insert([
      {
        result,
        confidence,
        payment_method,
        amount,
        status,
        contract_code,
      },
    ]);

    if (error) {
      console.log("Supabase insert error:", error);

      return res.status(500).json({
        error: "Gagal menyimpan transaksi ke Supabase",
      });
    }

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

/*
========================
API TRANSACTIONS
========================
*/

app.get("/transactions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log("Supabase select error:", error);

      return res.status(500).json({
        error: "Gagal mengambil data transaksi",
      });
    }

    res.json(data);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Server error",
    });
  }
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
