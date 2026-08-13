require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findTable() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name ILIKE '%diag%'
        `);
        console.log('SEARCH RESULTS:', JSON.stringify(res.rows));
    } finally {
        client.release();
        pool.end();
    }
}

findTable().catch(console.error);
