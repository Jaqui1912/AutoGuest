require('dotenv').config();
const db = require('./config/database');

async function list() {
    try {
        console.log('--- Tables ---');
        const [tables] = await db.query('SHOW TABLES');
        console.log(tables.map(t => Object.values(t)[0]));

        console.log('\n--- Columns of item_inventario ---');
        try {
            const [cols] = await db.query('DESCRIBE item_inventario');
            console.table(cols);
        } catch (e) { console.log('Does not exist'); }

        console.log('\n--- Columns of iteminventario ---');
        try {
            const [cols2] = await db.query('DESCRIBE iteminventario');
            console.table(cols2);

            console.log('\n--- Content count of iteminventario ---');
            const [count] = await db.query('SELECT COUNT(*) as c FROM iteminventario');
            console.log('Count:', count[0].c);

        } catch (e) { console.log('Does not exist'); }

        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

list();
