require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function finalDeepLinking() {
    const client = await pool.connect();
    try {
        console.log('--- VINCULANDO ÚLTIMAS TABLAS ---');
        
        const constraints = [
            // Linea Cotizacion -> Cotizacion
            { table: "lineacotizacion", name: "fk_linea_cot", sql: "ALTER TABLE lineacotizacion ADD CONSTRAINT fk_linea_cot FOREIGN KEY (idcotizacion) REFERENCES cotizacion(idcotizacion) ON DELETE CASCADE" },
            
            // Diagnostico -> Cita
            { table: "diagnostico", name: "fk_diag_cita", sql: "ALTER TABLE diagnostico ADD CONSTRAINT fk_diag_cita FOREIGN KEY (idcita) REFERENCES cita(idcita) ON DELETE CASCADE" }
        ];

        for (const c of constraints) {
            console.log(`Vinculando ${c.table} (${c.name})...`);
            try {
                await client.query(`ALTER TABLE ${c.table} DROP CONSTRAINT IF EXISTS ${c.name}`);
                await client.query(c.sql);
                console.log(' -> OK');
            } catch (e) {
                console.log(` -> AVISO: ${e.message}`);
                if (e.message.includes('violates foreign key constraint')) {
                    console.log(`    (Saneando datos huérfanos en ${c.table}...)`);
                    const col = c.table === 'lineacotizacion' ? 'idcotizacion' : 'idcita';
                    const refTable = c.table === 'lineacotizacion' ? 'cotizacion' : 'cita';
                    const refCol = c.table === 'lineacotizacion' ? 'idcotizacion' : 'idcita';
                    await client.query(`DELETE FROM ${c.table} WHERE ${col} NOT IN (SELECT ${refCol} FROM ${refTable})`);
                    await client.query(c.sql);
                    console.log(' -> OK (tras saneamiento)');
                }
            }
        }

        console.log('\n=== TODO VINCULADO !!! ===');

    } finally {
        client.release();
        pool.end();
    }
}

finalDeepLinking().catch(console.error);
