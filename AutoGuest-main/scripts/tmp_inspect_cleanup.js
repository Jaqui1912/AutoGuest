require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectTables() {
    const client = await pool.connect();
    try {
        const tablesToInspect = [
            'item_inventario', 'iteminventario', 
            'vehiculo', 'coches', 
            'pedido', 'pedidos_catalogo',
            'venta_fisica', 'lineapedido'
        ];

        for (const table of tablesToInspect) {
            console.log(`\n=== INSPECCIÓN: ${table} ===`);
            try {
                const schema = await client.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [table]);
                
                if (schema.rows.length === 0) {
                    console.log(`No existe la tabla: ${table}`);
                    continue;
                }
                
                console.log('Columnas:');
                schema.rows.forEach(c => {
                    console.log(` - ${c.column_name} (${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''})`);
                });

                const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
                const count = parseInt(countRes.rows[0].count);
                console.log(`Filas totales: ${count}`);
                
                if (count > 0) {
                    const sample = await client.query(`SELECT * FROM "${table}" LIMIT 3`);
                    console.log('Muestra (primeras 3):');
                    sample.rows.forEach((row, i) => {
                        console.log(` [${i}] ${JSON.stringify(row)}`);
                    });
                }
            } catch (e) {
                console.log(`[!] Error en ${table}: ${e.message}`);
            }
        }
    } finally {
        client.release();
        pool.end();
    }
}

inspectTables().catch(console.error);
