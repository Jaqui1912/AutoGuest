require('dotenv').config();
const db = require('./config/database');

async function test() {
    try {
        console.log('--- Testing insertion of a 2MB string ---');
        const largeString = 'A'.repeat(2 * 1024 * 1024); // 2MB
        await db.query('UPDATE iteminventario SET imagen = ? WHERE idItem = "NONEXISTENT"', [largeString]);
        console.log('Query executed (or at least sent) successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Test failed:', e.message);
        process.exit(1);
    }
}
test();
