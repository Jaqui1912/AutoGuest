require('dotenv').config();
const db = require('./config/database');

async function migrate() {
    let connection;
    try {
        connection = await db.getConnection();

        // 1. Check if column exists
        const [columns] = await connection.query("SHOW COLUMNS FROM iteminventario LIKE 'imagen'");
        if (columns.length === 0) {
            console.log("Adding 'imagen' column to iteminventario...");
            await connection.query("ALTER TABLE iteminventario ADD COLUMN imagen VARCHAR(255)");
        } else {
            console.log("'imagen' column already exists.");
        }

        // 2. Fetch data from old table
        const [oldItems] = await connection.query("SELECT nombre, imagen FROM item_inventario WHERE imagen IS NOT NULL");

        console.log(`Migrating ${oldItems.length} images...`);

        for (const item of oldItems) {
            await connection.query(
                "UPDATE iteminventario SET imagen = ? WHERE nombre = ?",
                [item.imagen, item.nombre]
            );
        }

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

migrate();
