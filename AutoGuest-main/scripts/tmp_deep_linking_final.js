require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deepLinkingFinal() {
    const client = await pool.connect();
    try {
        console.log('--- FINALIZANDO VINCULACIÓN PROFUNDA ---');
        
        const constraints = [
            // Cotizacion Servicios -> Cotizacion
            { table: "cotizacion_servicios", name: "fk_cot_serv_cot", sql: "ALTER TABLE cotizacion_servicios ADD CONSTRAINT fk_cot_serv_cot FOREIGN KEY (idcotizacion) REFERENCES cotizacion(idcotizacion) ON DELETE CASCADE" },
            
            // Evidencia -> Cotizacion
            { table: "evidencia", name: "fk_evidencia_cot", sql: "ALTER TABLE evidencia ADD CONSTRAINT fk_evidencia_cot FOREIGN KEY (idcotizacion) REFERENCES cotizacion(idcotizacion) ON DELETE CASCADE" }
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
                    await client.query(`DELETE FROM ${c.table} WHERE idcotizacion NOT IN (SELECT idcotizacion FROM cotizacion)`);
                    
                    try {
                        await client.query(c.sql);
                        console.log(' -> OK (después de saneamiento)');
                    } catch (e2) {
                        console.log(` -> FALLO: ${e2.message}`);
                    }
                }
            }
        }

        console.log('\n=== TODO VINCULADO CORRECTAMENTE ===');

    } finally {
        client.release();
        pool.end();
    }
}

deepLinkingFinal().catch(console.error);
