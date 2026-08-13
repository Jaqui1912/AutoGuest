require('dotenv').config();
const vehiculoService = require('./src/services/vehiculoService');

(async () => {
    try {
         const res = await vehiculoService.createVehiculo({
              marca: 'CHEVROLET',
              modelo: 'Mayor',
              anio: 2017,
              placa: 'XYZ-189',
              idUsuario: '7UQYO57lH3'
         });
         console.log(res);
    } catch(e) {
         console.error("ERROR: ", e.message);
    }
    process.exit();
})();
