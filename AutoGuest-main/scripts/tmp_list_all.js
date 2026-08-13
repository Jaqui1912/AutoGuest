require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listAllTables() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('ALL TABLES:', res.rows.map(r => r.table_name).join(', '));
    } finally {
        client.release();
        pool.end();
    }
}

listAllTables().catch(console.error);
