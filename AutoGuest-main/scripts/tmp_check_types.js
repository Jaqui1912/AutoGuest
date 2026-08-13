require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const r = await p.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name = 'idusuario' OR column_name = 'idUsuario'");
        console.table(r.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await p.end();
    }
})();
