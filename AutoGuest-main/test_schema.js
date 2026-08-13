require('dotenv').config();
const db = require('./src/config/config/database');
(async () => {
    try {
        const [citaSchema] = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'cita'`);
        console.log('cita:', citaSchema.map(x => x.column_name).join(', '));
        const [cotizacionSchema] = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'cotizacion'`);
        console.log('cotizacion:', cotizacionSchema.map(x => x.column_name).join(', '));
        const [pagoSchema] = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'pago'`);
        console.log('pago:', pagoSchema.map(x => x.column_name).join(', '));
    } catch(e) {
        console.error(e);
    }
    process.exit();
})();
