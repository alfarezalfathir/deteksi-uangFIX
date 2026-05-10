const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const axios = require("axios");

app.use(cors());
app.use(express.json());

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

    res.json(response.data);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Python detection error",
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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
