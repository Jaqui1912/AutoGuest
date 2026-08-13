require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function finalMigrationCorrected() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('--- SANEAMIENTO PREVIO ---');
        // Asegurar que existe un taller central para los productos migrados
        const tallerRes = await client.query("SELECT idtaller FROM taller WHERE idtaller = 'T01'");
        let mainTaller = 'T01';
        if (tallerRes.rowCount === 0) {
            console.log('Creando taller T01 como respaldo...');
            await client.query("INSERT INTO taller (idtaller, nombre, direccion) VALUES ('T01', 'Central de Soporte', 'AutoGuest HQ')");
        }

        console.log('\n--- MIGRANDO INVENTARIO ---');
        const migrationQuery = `
            INSERT INTO iteminventario (iditem, nombre, precio, stock, idtaller, imagen, esparaventa)
            SELECT 
                'MIG_' || i.id_producto, 
                i.nombre, 
                i.precio, 
                i.stock, 
                $1, 
                i.imagen, 
                false
            FROM item_inventario i
            WHERE i.nombre NOT IN (SELECT nombre FROM iteminventario)
        `;
        const migrateRes = await client.query(migrationQuery, [mainTaller]);
        console.log(`OK: ${migrateRes.rowCount} productos migrados a iteminventario.`);

        console.log('\n--- ELIMINANDO TABLAS REDUNDANTES ---');
        await client.query('DROP TABLE IF EXISTS item_inventario CASCADE');
        await client.query('DROP TABLE IF EXISTS coches CASCADE');
        await client.query('DROP TABLE IF EXISTS pedidos_catalogo CASCADE');
        console.log('OK: Tablas antiguas eliminadas.');

        console.log('\n--- LIMPIEZA DE DATOS HUÉRFANOS ANTES DE FK ---');
        // Eliminar citas que no tienen un taller válido para que la FK no falle
        const orphanCitas = await client.query("DELETE FROM cita WHERE idtaller NOT IN (SELECT idtaller FROM taller)");
        if (orphanCitas.rowCount > 0) console.log(`Removidas ${orphanCitas.rowCount} citas con taller inexistente.`);

        // Eliminar líneas de pedido sin pedido válido
        const orphanLines = await client.query("DELETE FROM lineapedido WHERE idpedido NOT IN (SELECT idpedido FROM pedido)");
        if (orphanLines.rowCount > 0) console.log(`Removidas ${orphanLines.rowCount} líneas de pedido huérfanas.`);

        await client.query('COMMIT'); 
        // Cerramos transacción para ejecutar los ALTER TABLE (algunos DBs no permiten ALTER TABLE en transacciones fallidas)
        
        console.log('\n--- ESTABLECIENDO FOREIGN KEYS ---');
        const constraints = [
            ["cita", "fk_cita_taller", "ALTER TABLE cita ADD CONSTRAINT fk_cita_taller FOREIGN KEY (idtaller) REFERENCES taller(idtaller) ON DELETE CASCADE"],
            ["cita", "fk_cita_cliente", "ALTER TABLE cita ADD CONSTRAINT fk_cita_cliente FOREIGN KEY (idcliente) REFERENCES usuario(idusuario) ON DELETE CASCADE"],
            ["iteminventario", "fk_inventario_taller", "ALTER TABLE iteminventario ADD CONSTRAINT fk_inventario_taller FOREIGN KEY (idtaller) REFERENCES taller(idtaller) ON DELETE CASCADE"],
            ["lineapedido", "fk_linea_pedido", "ALTER TABLE lineapedido ADD CONSTRAINT fk_linea_pedido FOREIGN KEY (idpedido) REFERENCES pedido(idpedido) ON DELETE CASCADE"],
            ["lineapedido", "fk_linea_item", "ALTER TABLE lineapedido ADD CONSTRAINT fk_linea_item FOREIGN KEY (iditeminventario) REFERENCES iteminventario(iditem) ON DELETE SET NULL"]
        ];

        for (const [table, name, sql] of constraints) {
            console.log(`Verificando constraint ${name} en ${table}...`);
            try {
                // Primero intentamos borrar la FK si existe para evitar conflictos
                await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`);
                await client.query(sql);
                console.log(' -> OK');
            } catch (e) {
                console.log(` -> ERROR: ${e.message}`);
            }
        }

        console.log('\n=== TODO TERMINADO CON ÉXITO ===');

    } catch (e) {
        if (client) await client.query('ROLLBACK');
        console.error('ERROR CRÍTICO:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

finalMigrationCorrected().catch(console.error);
