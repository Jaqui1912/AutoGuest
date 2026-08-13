require('dotenv').config();
const db = require('./src/config/config/database');
(async () => {
    try {
        const [reparaciones] = await db.query(
            `SELECT c.idCita, u.nombre as clienteNombre, COALESCE(NULLIF(c.monto, 0), cot.totalaprobado) as monto, c.metodo_pago, c.fechaHora
             FROM cita c 
             JOIN usuario u ON c.idCliente = u.idUsuario
             LEFT JOIN cotizacion cot ON c.idCita = cot.idCita
             LIMIT 1`
        );
        console.log('Query Ok:', reparaciones);
    } catch(e) {
        console.error('Err:', e);
    }
    process.exit();
})();
