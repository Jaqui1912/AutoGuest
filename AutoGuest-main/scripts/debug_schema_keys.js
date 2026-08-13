const dotenv = require('dotenv');
dotenv.config();
const db = require('./config/database');

async function checkSchema() {
    try {
        console.log("Checking 'servicio' table...");
        const [servicio] = await db.query("DESCRIBE servicio");
        console.table(servicio);

    } catch (error) {
        console.error("Error inspecting schema:", error);
    }
    process.exit();
}

checkSchema();
