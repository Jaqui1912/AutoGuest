require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function mainMigration() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('--- MIGRANDO INVENTARIO ---');
        // Insertar productos de item_inventario en iteminventario que no tengan el mismo nombre
        const migrationQuery = `
            INSERT INTO iteminventario (iditem, nombre, precio, stock, idtaller, imagen, esparaventa)
            SELECT 
                'MIG_' || id_producto, 
                nombre, 
                precio, 
                stock, 
                'SISTEMA', 
                imagen, 
                false
            FROM item_inventario
            WHERE nombre NOT IN (SELECT nombre FROM iteminventario)
        `;
        const migrateRes = await client.query(migrationQuery);
        console.log(`OK: ${migrateRes.rowCount} productos migrados a iteminventario.`);

        console.log('\n--- ELIMINANDO TABLAS REDUNDANTES ---');
        await client.query('DROP TABLE IF EXISTS item_inventario CASCADE');
        await client.query('DROP TABLE IF EXISTS coches CASCADE');
        await client.query('DROP TABLE IF EXISTS pedidos_catalogo CASCADE');
        console.log('OK: Tablas antiguas eliminadas.');

        console.log('\n--- ESTABLECIENDO FOREIGN KEYS ---');
        const constraints = [
            // Cita -> Taller
            "ALTER TABLE cita ADD CONSTRAINT fk_cita_taller FOREIGN KEY (idtaller) REFERENCES taller(idtaller) ON DELETE CASCADE",
            // Cita -> Cliente
            "ALTER TABLE cita ADD CONSTRAINT fk_cita_cliente FOREIGN KEY (idcliente) REFERENCES usuario(idusuario) ON DELETE CASCADE",
            // Cita -> Vehiculo
            "ALTER TABLE cita ADD CONSTRAINT fk_cita_vehiculo FOREIGN KEY (idvehiculo) REFERENCES vehiculo(idvehiculo) ON DELETE SET NULL",
            // ItemInventario -> Taller
            "ALTER TABLE iteminventario ADD CONSTRAINT fk_inventario_taller FOREIGN KEY (idtaller) REFERENCES taller(idtaller) ON DELETE CASCADE",
            // LineaPedido -> Pedido
            "ALTER TABLE lineapedido ADD CONSTRAINT fk_linea_pedido FOREIGN KEY (idpedido) REFERENCES pedido(idpedido) ON DELETE CASCADE",
            // LineaPedido -> ItemInventario
            "ALTER TABLE lineapedido ADD CONSTRAINT fk_linea_item FOREIGN KEY (iditeminventario) REFERENCES iteminventario(iditem) ON DELETE SET NULL"
        ];

        for (const sql of constraints) {
            console.log(`Ejecutando: ${sql.substring(0, 50)}...`);
            try {
                await client.query(sql);
                console.log(' -> OK');
            } catch (e) {
                console.log(` -> ERROR/SALTADO: ${e.message}`);
                // No abortamos si falla un FK (puede haber datos huérfanos preexistentes que lo impidan)
            }
        }

        await client.query('COMMIT');
        console.log('\n=== TODO TERMINADO CON ÉXITO ===');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('ERROR CRÍTICO:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

mainMigration().catch(console.error);
