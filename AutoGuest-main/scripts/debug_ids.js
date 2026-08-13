require('dotenv').config();
const db = require('./config/database');

async function debug() {
    try {
        const [rows] = await db.query('SELECT idItem FROM iteminventario');
        console.log('ID Items in DB:');
        rows.forEach(r => console.log(`"${r.idItem}"`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
debug();
