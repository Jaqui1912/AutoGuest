require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const r = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'resenas' ORDER BY ordinal_position");
        console.log('=== SCHEMA: resenas ===');
        r.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await p.end();
    }
})();
