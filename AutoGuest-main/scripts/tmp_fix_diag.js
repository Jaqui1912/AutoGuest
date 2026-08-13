require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDiag() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'diagnostico'
        `);
        console.log('DIAG COLUMNS:', res.rows.map(r => r.column_name).join(', '));
        
        if (res.rowCount > 0) {
            console.log('Intentando vincular diagnostico...');
            await client.query("ALTER TABLE diagnostico DROP CONSTRAINT IF EXISTS fk_diag_cita");
            await client.query("ALTER TABLE diagnostico ADD CONSTRAINT fk_diag_cita FOREIGN KEY (idcita) REFERENCES cita(idcita) ON DELETE CASCADE");
            console.log(' -> OK');
        }
    } catch (e) {
        console.log('ERROR:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkDiag().catch(console.error);
