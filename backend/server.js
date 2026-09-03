require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        app: "PostX",
        message: "PostX API is running",
        version: "1.0.0"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "PostX API",
        status: "healthy"
    });
});

app.listen(PORT, () => {
    console.log(`PostX API running on port ${PORT}`);
});
