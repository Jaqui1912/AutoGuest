require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- MECANICOS ---');
        // Join with usuario to get name
        const [mecanicos] = await connection.query(`
            SELECT m.idUsuario, u.nombre, m.idTaller 
            FROM mecanico m
            JOIN usuario u ON m.idUsuario = u.idUsuario
        `);
        mecanicos.forEach(m => console.log(`Mecánico: ${m.nombre} (${m.idUsuario}) - Taller: ${m.idTaller}`));

        console.log('\n--- SERVICIOS ---');
        const [servicios] = await connection.query('SELECT idServicio, nombre, idTaller FROM servicio');
        servicios.forEach(s => console.log(`Servicio: ${s.nombre} (${s.idServicio}) - Taller: ${s.idTaller}`));

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkData();
