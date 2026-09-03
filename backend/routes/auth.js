const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
    createUser,
    findUserByEmail
} = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
}

function createToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });
        }

        const cleanName = String(name).trim();
        const cleanEmail = String(email).trim().toLowerCase();

        if (cleanName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Name must contain at least 2 characters."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const existingUser = await findUserByEmail(cleanEmail);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await createUser(
            cleanName,
            cleanEmail,
            passwordHash
        );

        const token = createToken(user);

        return res.status(201).json({
            success: true,
            message: "PostX account created successfully.",
            user,
            token
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create account."
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        const user = await findUserByEmail(cleanEmail);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = createToken(user);

        return res.json({
            success: true,
            message: "Login successful.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            token
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to login."
        });
    }
});

module.exports = router;
