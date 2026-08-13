require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('--- Checking for CLI01 (Case Insensitive) ---');
        const r1 = await p.query("SELECT idusuario FROM usuario WHERE LOWER(idusuario) = 'cli01'");
        console.log('Matches for cli01:', r1.rows);

        console.log('\n--- Checking for Triggers on resenas table ---');
        const r2 = await p.query(`
            SELECT trigger_name, event_manipulation, action_statement 
            FROM information_schema.triggers 
            WHERE event_object_table = 'resenas'
        `);
        console.log('Triggers on resenas:', r2.rows);

        console.log('\n--- Checking for all triggers in the database (may reveal CURDATE) ---');
        const r3 = await p.query(`
            SELECT trigger_name, event_object_table, action_statement 
            FROM information_schema.triggers 
            WHERE action_statement LIKE '%CURDATE%' OR action_statement LIKE '%DATE_FORMAT%'
        `);
        console.log('Triggers with MySQL functions:', r3.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await p.end();
    }
})();
