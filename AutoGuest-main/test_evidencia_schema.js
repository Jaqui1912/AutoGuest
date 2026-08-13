require('dotenv').config();
const db = require('./src/config/config/database');
(async () => {
    try {
        const [r] = await db.query(`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='evidencia'`);
        console.log("EVIDENCIA COLS: ", r);
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
})();
