require('dotenv').config();
const db = require('./config/database');

async function verifyMappingsAndDates() {
    try {
        console.log('--- Verifying Mappings ---');
        // Test a query that returns the fields we just mapped
        const [rows] = await db.query(`
            SELECT u.nombre as "clienteNombre", ii.nombre as "servicioNombre"
            FROM usuario u
            JOIN cliente cl ON u.idUsuario = cl.idUsuario
            LEFT JOIN cita c ON cl.idUsuario = c.idCliente
            LEFT JOIN iteminventario ii ON c.servicio_solicitado = ii.idItem
            LIMIT 1
        `);

        if (rows.length > 0) {
            console.log('✅ Mapping successful:', rows[0]);
            if (rows[0].clienteNombre) console.log('   - clienteNombre is defined');
            else console.log('   - clienteNombre is NOT defined (CHECK MAPPING!)');
        } else {
            console.log('⚠️ No data to test mappings with.');
        }

        console.log('\n--- Verifying Dates ---');
        const [dates] = await db.query('SELECT CURRENT_TIMESTAMP as now');
        console.log('Server UTC Time:', dates[0].now);
        console.log('JS Date Object:', new Date(dates[0].now).toISOString());

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        process.exit();
    }
}

verifyMappingsAndDates();
