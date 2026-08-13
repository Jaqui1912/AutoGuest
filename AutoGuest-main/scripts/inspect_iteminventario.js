require('dotenv').config();
const db = require('./config/database');

async function inspect() {
    try {
        console.log('--- Columns of iteminventario ---');
        const [cols] = await db.query("SHOW COLUMNS FROM iteminventario LIKE 'imagen'");
        if (cols.length > 0) {
            console.log('COLUMN_TYPE:', cols[0].Type);
        } else {
            console.log('COLUMN NOT FOUND');
        }
        process.exit(0);
    } catch (e) {
        console.log('Error:', e.message);
        process.exit(1);
    }
}
inspect();
