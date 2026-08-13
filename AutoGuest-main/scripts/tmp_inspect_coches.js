require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectCoches() {
    const client = await pool.connect();
    try {
        console.log('--- Estructura de coches ---');
        const schema = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'coches'
        `);
        schema.rows.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

        const res = await client.query('SELECT COUNT(*) FROM coches');
        console.log(`Filas: ${res.rows[0].count}`);
        
        if (parseInt(res.rows[0].count) > 0) {
            const sample = await client.query('SELECT * FROM coches LIMIT 5');
            console.log('Muestra:', JSON.stringify(sample.rows));
        }
    } catch (e) {
        console.log('ERROR:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

inspectCoches().catch(console.error);
