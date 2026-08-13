require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findCoches() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name ILIKE '%coche%'
        `);
        console.log('COCHES SEARCH:', JSON.stringify(res.rows));
    } finally {
        client.release();
        pool.end();
    }
}

findCoches().catch(console.error);
