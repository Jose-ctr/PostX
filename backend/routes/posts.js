const express = require("express");

const authenticate = require("../middleware/auth");

const {
    createPost,
    getPosts,
    getPostById
} = require("../models/posts");

const router = express.Router();

/*
 * GET /api/posts
 * Get all PostX posts
 */
router.get("/", async (req, res) => {
    try {
        const posts = await getPosts();

        return res.json({
            success: true,
            posts
        });

    } catch (error) {
        console.error("Get posts error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load posts."
        });
    }
});

/*
 * GET /api/posts/:id
 * Get one post
 */
router.get("/:id", async (req, res) => {
    try {
        const post = await getPostById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found."
            });
        }

        return res.json({
            success: true,
            post
        });

    } catch (error) {
        console.error("Get post error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load post."
        });
    }
});

/*
 * POST /api/posts
 * Create a FREE PostX post
 * Protected by JWT
 */
router.post("/", authenticate, async (req, res) => {
    try {
        const {
            content,
            media_url,
            media_type,
            location,
            post_type
        } = req.body;

        if (!content || String(content).trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Post content is required."
            });
        }

        const cleanContent = String(content).trim();

        if (cleanContent.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Post content cannot exceed 5000 characters."
            });
        }

        const post = await createPost(
            req.user.userId,
            cleanContent,
            media_url || null,
            media_type || null,
            location || null,
            post_type || "social"
        );

        return res.status(201).json({
            success: true,
            message: "Post published successfully.",
            post
        });

    } catch (error) {
        console.error("Create post error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create post."
        });
    }
});

module.exports = router;
