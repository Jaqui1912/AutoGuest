require('dotenv').config();
const db = require('./config/database');

async function testCitaDetails() {
    try {
        // We'll test with a specific ID if known, or just the first one
        const [citas] = await db.query('SELECT idCita, idCliente FROM cita LIMIT 1');
        if (citas.length === 0) {
            console.log('No appointments found to test.');
            return;
        }

        const id = citas[0].idCita;
        const idCliente = citas[0].idCliente;

        console.log(`Testing details for Cita ID: ${id}, Client ID: ${idCliente}`);

        const [details] = await db.query(`
            SELECT c.*, 
                   COALESCE(t.nombre, 'Taller no disponible') as tallerNombre, 
                   t.direccion as tallerDireccion, 
                   u_admin.telefono as tallerTelefono,
                   v.marca as vehiculoMarca, v.modelo as vehiculoModelo, v.placa as vehiculoPlaca,
                   u_mec.nombre as mecanicoNombre,
                   c.servicio_solicitado as motivo
            FROM cita c
            LEFT JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
            LEFT JOIN taller t ON c.idTaller = t.idTaller
            LEFT JOIN administrador admin ON t.idTaller = admin.idTaller
            LEFT JOIN usuario u_admin ON admin.idUsuario = u_admin.idUsuario
            LEFT JOIN mecanico m ON c.idMecanico = m.idUsuario
            LEFT JOIN usuario u_mec ON m.idUsuario = u_mec.idUsuario
            WHERE c.idCita = ? AND c.idCliente = ?
        `, [id, idCliente]);

        console.log('--- API Response Simulation ---');
        console.log(details[0]);

        if (details[0].tallerTelefono) console.log('✅ Workshop phone found:', details[0].tallerTelefono);
        else console.log('❌ Workshop phone still null');

        if (details[0].motivo) console.log('✅ Motivo found:', details[0].motivo);
        else console.log('❌ Motivo still undefined/null');

        if (details[0].mecanicoNombre) console.log('✅ Mechanic name found:', details[0].mecanicoNombre);
        else console.log('ℹ️ No mechanic assigned yet (this is normal if not assigned)');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        process.exit();
    }
}

testCitaDetails();
