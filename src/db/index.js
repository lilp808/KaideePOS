const { Pool } = require('pg');

// Serverless-optimized PostgreSQL pool configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5, // Increase pool size for better concurrency
    min: 0, // Allow pool to be empty when not needed
    idleTimeoutMillis: 10000, // Reduce idle timeout for serverless
    connectionTimeoutMillis: 30000, // Increase connection timeout
    maxUses: 10, // Limit uses per connection for serverless
});

pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('[DB] PostgreSQL connection error:', err);
    // Don't exit process in serverless - let it retry
});

// Retry wrapper for database queries
async function queryWithRetry(text, params, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await pool.query(text, params);
        } catch (error) {
            console.error(`[DB] Query attempt ${i + 1} failed:`, error.message);
            
            // Don't retry on client errors (4xx)
            if (error.code && error.code.startsWith('4')) {
                throw error;
            }
            
            // If this is the last attempt, throw the error
            if (i === retries - 1) {
                throw error;
            }
            
            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, i), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

module.exports = {
    query: queryWithRetry,
    pool
};
