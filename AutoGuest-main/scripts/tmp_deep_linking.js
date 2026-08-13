require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deepLinking() {
    const client = await pool.connect();
    try {
        console.log('--- AGREGANDO MÁS RELACIONES ---');
        
        const constraints = [
            // Configuracion Taller -> Taller
            { table: "configuracion_taller", name: "fk_config_taller", sql: "ALTER TABLE configuracion_taller ADD CONSTRAINT fk_config_taller FOREIGN KEY (idtaller) REFERENCES taller(idtaller) ON DELETE CASCADE" },
            
            // Historial Estados Cita -> Cita
            { table: "historial_estados_cita", name: "fk_historial_cita", sql: "ALTER TABLE historial_estados_cita ADD CONSTRAINT fk_historial_cita FOREIGN KEY (idcita) REFERENCES cita(idcita) ON DELETE CASCADE" },
            
            // Cotizacion Servicios -> Cotizacion
            { table: "cotizacion_servicios", name: "fk_cot_serv_cot", sql: "ALTER TABLE cotizacion_servicios ADD CONSTRAINT fk_cot_serv_cot FOREIGN KEY (idcotizacion) REFERENCES cotizacion(id_cotizacion) ON DELETE CASCADE" },
            
            // Evidencia -> Cotizacion
            { table: "evidencia", name: "fk_evidencia_cot", sql: "ALTER TABLE evidencia ADD CONSTRAINT fk_evidencia_cot FOREIGN KEY (idcotizacion) REFERENCES cotizacion(id_cotizacion) ON DELETE CASCADE" }
        ];

        for (const c of constraints) {
            console.log(`Vinculando ${c.table} (${c.name})...`);
            try {
                await client.query(`ALTER TABLE ${c.table} DROP CONSTRAINT IF EXISTS ${c.name}`);
                await client.query(c.sql);
                console.log(' -> OK');
            } catch (e) {
                console.log(` -> AVISO: ${e.message}`);
                
                // Si falla por datos huérfanos, limpiar y reintentar
                if (e.message.includes('violates foreign key constraint')) {
                    console.log(`    (Saneando datos en ${c.table}...)`);
                    if (c.table === 'configuracion_taller') await client.query("DELETE FROM configuracion_taller WHERE idtaller NOT IN (SELECT idtaller FROM taller)");
                    if (c.table === 'historial_estados_cita') await client.query("DELETE FROM historial_estados_cita WHERE idcita NOT IN (SELECT idcita FROM cita)");
                    if (c.table === 'cotizacion_servicios') await client.query("DELETE FROM cotizacion_servicios WHERE idcotizacion NOT IN (SELECT id_cotizacion FROM cotizacion)");
                    if (c.table === 'evidencia') await client.query("DELETE FROM evidencia WHERE idcotizacion NOT IN (SELECT id_cotizacion FROM cotizacion)");
                    
                    try {
                        await client.query(c.sql);
                        console.log(' -> OK (después de saneamiento)');
                    } catch (e2) {
                        console.log(` -> FALLO FINAL: ${e2.message}`);
                    }
                }
            }
        }

        console.log('\n=== VINCULACIÓN PROFUNDA COMPLETADA ===');

    } finally {
        client.release();
        pool.end();
    }
}

deepLinking().catch(console.error);
