require('dotenv').config();
const db = require('./config/database');

async function check() {
    try {
        const [rows] = await db.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('Check failed:', e.message);
        process.exit(1);
    }
}
check();
