const { query } = require("../config/database");

async function createPost(
    userId,
    content,
    mediaUrl = null,
    mediaType = null,
    location = null,
    postType = "social"
) {
    const result = await query(
        `
        INSERT INTO posts (
            user_id,
            content,
            media_url,
            media_type,
            location,
            post_type
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            user_id,
            content,
            media_url,
            media_type,
            location,
            post_type,
            is_boosted,
            views_count,
            likes_count,
            comments_count,
            shares_count,
            created_at
        `,
        [
            userId,
            content,
            mediaUrl,
            mediaType,
            location,
            postType
        ]
    );

    return result.rows[0];
}

async function getPosts() {
    const result = await query(
        `
        SELECT
            posts.id,
            posts.user_id,
            users.name AS author_name,
            posts.content,
            posts.media_url,
            posts.media_type,
            posts.location,
            posts.post_type,
            posts.is_boosted,
            posts.views_count,
            posts.likes_count,
            posts.comments_count,
            posts.shares_count,
            posts.created_at
        FROM posts
        INNER JOIN users
            ON users.id = posts.user_id
        ORDER BY posts.created_at DESC
        `
    );

    return result.rows;
}

async function getPostById(id) {
    const result = await query(
        `
        SELECT
            posts.id,
            posts.user_id,
            users.name AS author_name,
            posts.content,
            posts.media_url,
            posts.media_type,
            posts.location,
            posts.post_type,
            posts.is_boosted,
            posts.views_count,
            posts.likes_count,
            posts.comments_count,
            posts.shares_count,
            posts.created_at
        FROM posts
        INNER JOIN users
            ON users.id = posts.user_id
        WHERE posts.id = $1
        LIMIT 1
        `,
        [id]
    );

    return result.rows[0] || null;
}

module.exports = {
    createPost,
    getPosts,
    getPostById
};
