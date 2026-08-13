require('dotenv').config();
const pool = require('./src/config/config/database');
(async () => {
    try {
        const [v] = await pool.query("SELECT * FROM venta_fisica LIMIT 1");
        console.log('venta_fisica sample:', v);
        const [p] = await pool.query("SELECT * FROM pedido LIMIT 1");
        console.log('pedido sample:', p);
    } catch(e) {
        console.error(e);
    } process.exit();
})();
