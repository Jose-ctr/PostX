const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});

async function query(text, params) {
    return pool.query(text, params);
}

async function testDatabase() {
    const result = await pool.query("SELECT NOW() AS current_time");
    return result.rows[0];
}

module.exports = {
    pool,
    query,
    testDatabase
};
