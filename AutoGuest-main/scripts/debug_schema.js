require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('\n--- COLUMNS FOR servicio ---');
    const [colsServicio] = await connection.query('SHOW COLUMNS FROM servicio');
    colsServicio.forEach(col => console.log(col.Field));

    console.log('\n--- COLUMNS FOR mecanico ---');
    const [colsMecanico] = await connection.query('SHOW COLUMNS FROM mecanico');
    colsMecanico.forEach(col => console.log(col.Field));

    await connection.end();
}

checkSchema().catch(console.error);
