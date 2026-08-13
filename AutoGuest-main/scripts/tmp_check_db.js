require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const r = await p.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name IN ('idusuario', 'idtaller') ORDER BY table_name");
        let out = 'Table, Column, Type\n';
        r.rows.forEach(row => {
            out += `${row.table_name}, ${row.column_name}, ${row.data_type}\n`;
        });
        fs.writeFileSync('tmp_results.txt', out);
        console.log('Results written to tmp_results.txt');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await p.end();
    }
})();
