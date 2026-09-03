-- ============================================
-- PostX Database Schema
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    media_url TEXT,
    media_type VARCHAR(30),

    location VARCHAR(150),

    post_type VARCHAR(30) NOT NULL DEFAULT 'social',

    is_boosted BOOLEAN NOT NULL DEFAULT FALSE,

    views_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id
    ON posts(user_id);

CREATE INDEX IF NOT EXISTS idx_posts_created_at
    ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_post_type
    ON posts(post_type);
