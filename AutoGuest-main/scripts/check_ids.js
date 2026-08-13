require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const r = await p.query("SELECT * FROM usuario WHERE idusuario = 'CLI01'");
        console.log('Result for CLI01:', r.rows);

        const r2 = await p.query("SELECT * FROM taller WHERE idtaller = 'T03'");
        console.log('Result for T03:', r2.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await p.end();
    }
})();
