require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const tables = ['usuario', 'resenas', 'taller'];
        for (const table of tables) {
            console.log(`--- Schema for ${table} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            console.log(res.rows);
        }
    } catch (e) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
})();
