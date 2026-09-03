require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { testDatabase } = require("./config/database");

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

app.get("/api/health", async (req, res) => {
    try {
        const database = await testDatabase();

        res.json({
            success: true,
            service: "PostX API",
            status: "healthy",
            database: "connected",
            server_time: database.current_time
        });
    } catch (error) {
        console.error("Database health check failed:", error);

        res.status(500).json({
            success: false,
            service: "PostX API",
            status: "unhealthy",
            database: "disconnected"
        });
    }
});

app.listen(PORT, () => {
    console.log(`PostX API running on port ${PORT}`);
});
