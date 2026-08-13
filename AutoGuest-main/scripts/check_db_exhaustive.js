require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('--- Checking for MySQL functions in VIEWS ---');
        const r1 = await p.query(`
            SELECT table_name, view_definition 
            FROM information_schema.views 
            WHERE view_definition LIKE '%curdate%' OR view_definition LIKE '%date_format%'
        `);
        console.log('Views with MySQL functions:', r1.rows);

        console.log('\n--- Checking for MySQL functions in ALL TRIGGERS ---');
        const r2 = await p.query(`
            SELECT trigger_name, event_object_table, action_statement 
            FROM information_schema.triggers 
            WHERE action_statement LIKE '%curdate%' 
               OR action_statement LIKE '%DATE_FORMAT%'
               OR action_statement LIKE '%DATE(%'
        `);
        console.log('Triggers with MySQL functions:', r2.rows);

        console.log('\n--- Checking for MySQL functions in ROUTINES (Functions/Procedures) ---');
        const r3 = await p.query(`
            SELECT routine_name, routine_definition 
            FROM information_schema.routines 
            WHERE routine_definition LIKE '%curdate%' 
               OR routine_definition LIKE '%DATE_FORMAT%'
        `);
        console.log('Routines with MySQL functions:', r3.rows);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await p.end();
    }
})();
