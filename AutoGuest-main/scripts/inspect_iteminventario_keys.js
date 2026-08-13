require('dotenv').config();
const db = require('./config/database');

async function inspect() {
    try {
        const [rows] = await db.query('SELECT * FROM iteminventario LIMIT 1');
        if (rows.length > 0) {
            console.log('Columns:', Object.keys(rows[0]));
        } else {
            console.log('Table exists but is empty.');
            // If empty, we can't see columns via SELECT *. Fallback to DESCRIBE but just map Field names.
            const [cols] = await db.query('DESCRIBE iteminventario');
            console.log('Columns (from DESCRIBE):', cols.map(c => c.Field));
        }
        process.exit(0);
    } catch (e) {
        console.log('Error:', e.message);
        process.exit(1);
    }
}
inspect();
