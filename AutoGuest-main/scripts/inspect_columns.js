require('dotenv').config();
const db = require('./config/database');

async function inspect() {
    try {
        const [rows] = await db.query('SHOW COLUMNS FROM iteminventario');
        console.log('Columns in iteminventario:');
        rows.forEach(row => console.log(`- ${row.Field}`));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
inspect();
