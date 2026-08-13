require('dotenv').config();
const db = require('./src/config/config/database');
(async () => {
    try {
        const [rows] = await db.query(`SELECT * FROM cita WHERE idCita = 'CIThkoDm'`);
        console.log("CITA: ", rows);
        
        try {
            const [details] = await db.query(`
                SELECT c.idCita, c.motivo FROM cita c WHERE c.idCita = 'CIThkoDm'
            `);
            console.log("DETAILS: ", details);
        } catch(ee) { console.error("QUERY ERROR: ", ee.message); }
        
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
})();
