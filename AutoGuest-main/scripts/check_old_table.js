require('dotenv').config();
const db = require('./config/database');

async function inspect() {
    try {
        const [rows] = await db.query('SHOW COLUMNS FROM item_inventario');
        console.log('Columns in item_inventario:');
        rows.forEach(row => console.log(`- ${row.Field}`));
        process.exit(0);
    } catch (e) {
        console.log('Table item_inventario likely does not exist or error:', e.message);
        process.exit(0);
    }
}
inspect();
