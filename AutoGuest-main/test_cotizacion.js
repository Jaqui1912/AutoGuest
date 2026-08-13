require('dotenv').config();
const db = require('./src/config/config/database');
const citaService = require('./src/services/citaService');

(async () => {
    try {
        const cotizacion = await citaService.getCotizacion('CIThkoDm');
        console.log("COTIZACION RETORNADA: ", cotizacion);
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
})();
