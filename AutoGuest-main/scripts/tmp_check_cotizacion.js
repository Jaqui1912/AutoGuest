require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkCotizacion() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cotizacion'
        `);
        console.log('COTIZACION:', JSON.stringify(res.rows));
    } finally {
        client.release();
        pool.end();
    }
}

checkCotizacion().catch(console.error);
