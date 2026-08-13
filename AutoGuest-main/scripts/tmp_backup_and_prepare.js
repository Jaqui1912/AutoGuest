require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function backupAndCreate() {
    const client = await pool.connect();
    try {
        const backupDir = path.join(__dirname, 'backups_db');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

        const tablesToBackup = ['item_inventario', 'coches', 'pedidos_catalogo'];
        
        for (const table of tablesToBackup) {
            console.log(`Respaldando tabla: ${table}...`);
            try {
                const res = await client.query(`SELECT * FROM "${table}"`);
                const filePath = path.join(backupDir, `${table}_backup.json`);
                fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2));
                console.log(`OK: ${res.rows.length} filas guardadas en ${filePath}`);
            } catch (e) {
                console.log(`AVISO: No se pudo respaldar ${table} - ${e.message}`);
            }
        }

        console.log('\n--- CREANDO TABLA venta_fisica ---');
        await client.query(`
            CREATE TABLE IF NOT EXISTS venta_fisica (
                id SERIAL PRIMARY KEY,
                idTaller TEXT NOT NULL,
                idItem TEXT NOT NULL,
                nombreProducto TEXT,
                cantidad INT,
                precioUnitario NUMERIC,
                total NUMERIC,
                metodo_pago TEXT,
                fecha_venta TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('OK: Tabla venta_fisica creada/verificada.');

    } finally {
        client.release();
        pool.end();
    }
}

backupAndCreate().catch(console.error);
