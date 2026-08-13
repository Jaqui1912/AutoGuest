require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const id = 'T03';
        console.log(`--- Running GET reviews query for ${id} ---`);
        const query = `
            SELECT r.*, u.nombre as nombreCliente 
            FROM resenas r 
            JOIN usuario u ON r.idusuario = u.idusuario 
            WHERE r.idtaller = $1 
            ORDER BY r.fecha DESC`;

        const res = await pool.query(query, [id]);
        console.log('Success!', res.rows.length, 'reviews found.');
        console.log(res.rows);
    } catch (e) {
        console.error('DATABASE ERROR:', e.message);
    } finally {
        await pool.end();
    }
})();
