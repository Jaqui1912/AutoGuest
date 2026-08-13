require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkServices() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const targetTaller = 'T02WDr';
        console.log(`Checking services for Taller: ${targetTaller}`);

        const [servicios] = await connection.query('SELECT * FROM servicio WHERE idTaller = ?', [targetTaller]);
        console.log(`Found ${servicios.length} services.`);
        servicios.forEach(s => console.log(`- ${s.nombre} ($${s.precio})`));

    } catch (e) { console.error(e); }
    finally { await connection.end(); }
}

checkServices();
