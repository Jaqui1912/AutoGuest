require('dotenv').config();
const db = require('./config/database');

async function migrate() {
    try {
        console.log('--- Migrating iteminventario.imagen to LONGTEXT ---');
        await db.query('ALTER TABLE iteminventario MODIFY COLUMN imagen LONGTEXT');
        console.log('Migration successful.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}
migrate();
