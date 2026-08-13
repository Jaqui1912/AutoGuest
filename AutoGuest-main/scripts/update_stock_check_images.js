require('dotenv').config();
const db = require('./config/database');

async function updateStock() {
    try {
        console.log("Updating stock for all items to 15...");
        await db.query("UPDATE iteminventario SET stock = 15");
        console.log("Stock updated successfully.");

        // Also check for missing images
        const [missingImg] = await db.query("SELECT idItem, nombre FROM iteminventario WHERE imagen IS NULL OR imagen = ''");
        console.log(`\nItems with missing images (${missingImg.length}):`);
        missingImg.forEach(i => console.log(`- ${i.nombre}`));

        // Check some existing images
        const [existing] = await db.query("SELECT nombre, imagen FROM iteminventario WHERE imagen IS NOT NULL LIMIT 5");
        console.log("\nSample of existing image paths:");
        existing.forEach(i => console.log(`- ${i.nombre}: ${i.imagen}`));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
updateStock();
