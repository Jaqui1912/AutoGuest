require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [colsServicio] = await connection.query('SHOW COLUMNS FROM servicio');
        console.log('--- SERVICIO ---');
        for (const col of colsServicio) {
            console.log(`${col.Field}: ${col.Type}`);
        }

        const [colsCotizacion] = await connection.query('SHOW COLUMNS FROM cotizacion');
        console.log('\n--- COTIZACION ---');
        for (const col of colsCotizacion) {
            console.log(`${col.Field}: ${col.Type}`);
        }

    } catch (e) { console.error(e); }
    await connection.end();
}

checkSchema().catch(console.error);
