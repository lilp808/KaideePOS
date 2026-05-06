const { Pool } = require('pg');

// Serverless-optimized PostgreSQL pool configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 1, // Limit connections for serverless environment
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('[DB] PostgreSQL connection error:', err);
    // Don't exit process in serverless - let it retry
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
