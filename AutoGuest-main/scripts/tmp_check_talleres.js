require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTalleres() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT idtaller, nombre FROM taller LIMIT 1');
        console.log('Talleres disponibles:', JSON.stringify(res.rows));
    } finally {
        client.release();
        pool.end();
    }
}

checkTalleres().catch(console.error);
