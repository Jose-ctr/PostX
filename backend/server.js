require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { testDatabase } = require("./config/database");
const { findUserById } = require("./models/User");
const authRoutes = require("./routes/auth");
const authenticate = require("./middleware/auth");

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

app.use("/api/auth", authRoutes);

app.get("/api/me", authenticate, async (req, res) => {
    try {
        const user = await findUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Profile error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve user."
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

app.listen(PORT, () => {
    console.log(`PostX API running on port ${PORT}`);
});
