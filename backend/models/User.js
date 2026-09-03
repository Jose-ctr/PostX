const { query } = require("../config/database");

async function createUser(name, email, passwordHash) {
    const result = await query(
        `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at
        `,
        [name, email, passwordHash]
    );

    return result.rows[0];
}

async function findUserByEmail(email) {
    const result = await query(
        `
        SELECT id, name, email, password_hash, created_at
        FROM users
        WHERE email = $1
        LIMIT 1
        `,
        [email]
    );

    return result.rows[0] || null;
}

async function findUserById(id) {
    const result = await query(
        `
        SELECT id, name, email, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [id]
    );

    return result.rows[0] || null;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById
};
