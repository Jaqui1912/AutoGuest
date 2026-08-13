require('dotenv').config();
const db = require('./src/config/config/database');
(async () => {
    try {
        const [r] = await db.query(`SELECT setval('evidencia_idevidencia_seq', COALESCE((SELECT MAX(idevidencia) + 1 FROM evidencia), 1), false)`);
        console.log("Sequence reset successfully: ", r);
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
})();
