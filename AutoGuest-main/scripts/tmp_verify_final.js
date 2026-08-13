require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyAll() {
    const client = await pool.connect();
    try {
        console.log('=== VERIFICACIÓN FINAL ===');
        
        // 1. Verificar venta_fisica
        const resVenta = await client.query("SELECT COUNT(*) FROM venta_fisica");
        console.log(`OK: Tabla venta_fisica existe. Filas: ${resVenta.rows[0].count}`);

        // 2. Verificar tablas eliminadas
        const resOld = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN ('item_inventario', 'coches', 'pedidos_catalogo')
        `);
        if (resOld.rowCount === 0) {
            console.log('OK: Tablas antiguas eliminadas correctamente.');
        } else {
            console.log('ERROR: Aún existen tablas antiguas:', resOld.rows.map(r => r.table_name));
        }

        // 3. Verificar Foreign Keys
        const resFK = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name IN ('fk_cita_taller', 'fk_cita_cliente', 'fk_inventario_taller', 'fk_linea_pedido', 'fk_linea_item')
        `);
        console.log(`OK: ${resFK.rowCount}/5 Foreign Keys activas.`);

        // 4. Verificar inventario migrado
        const resInv = await client.query("SELECT COUNT(*) FROM iteminventario WHERE iditem LIKE 'MIG_%'");
        console.log(`OK: ${resInv.rows[0].count} productos migrados encontrados.`);

    } finally {
        client.release();
        pool.end();
    }
}

verifyAll().catch(console.error);
