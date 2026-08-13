require('dotenv').config();
const db = require('./config/database');

async function checkData() {
    try {
        console.log('--- Checking Workshops ---');
        const [talleres] = await db.query('SELECT idTaller, nombre FROM taller LIMIT 1');
        if (talleres.length === 0) { console.log('No workshops found.'); }
        else { console.log('Workshop:', talleres[0]); }

        if (talleres.length > 0) {
            const idTaller = talleres[0].idTaller;
            console.log('\n--- Checking Mechanics for Taller ' + idTaller + ' ---');
            const [mecanicos] = await db.query('SELECT m.idUsuario, u.email, u.password FROM mecanico m JOIN usuario u ON m.idUsuario = u.idUsuario WHERE m.idTaller = ?', [idTaller]);
            console.log('Mechanics:', mecanicos);

            console.log('\n--- Checking Services for Taller ' + idTaller + ' ---');
            const [servicios] = await db.query('SELECT idServicio, nombre, precio FROM servicio WHERE idTaller = ?', [idTaller]);
            console.log('Services:', servicios);
        }

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}

checkData();
