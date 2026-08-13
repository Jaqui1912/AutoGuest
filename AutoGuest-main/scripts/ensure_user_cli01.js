require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const id = 'CLI01';
        console.log(`--- Checking User ${id} ---`);

        const resUser = await pool.query('SELECT * FROM usuario WHERE idusuario = $1', [id]);
        console.log('Usuario table:', resUser.rows);

        const resClient = await pool.query('SELECT * FROM cliente WHERE idusuario = $1', [id]);
        console.log('Cliente table:', resClient.rows);

        if (resUser.rows.length === 0) {
            console.log('User CLI01 does NOT exist. Creating it...');
            await pool.query('INSERT INTO usuario (idusuario, nombre, email, password) VALUES ($1, $2, $3, $4)',
                ['CLI01', 'Cliente de Prueba', 'prueba@test.com', '123456']);
            console.log('User created in usuario.');
        }

        if (resClient.rows.length === 0) {
            console.log('User CLI01 is NOT in cliente table. Adding it...');
            await pool.query('INSERT INTO cliente (idusuario) VALUES ($1)', ['CLI01']);
            console.log('User added to cliente.');
        }

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
})();
