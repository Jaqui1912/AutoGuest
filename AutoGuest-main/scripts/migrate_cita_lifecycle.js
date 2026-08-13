require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/database');

async function migrate() {
    let connection;
    try {
        console.log('--- STARTING MIGRATION ---');
        connection = await db.getConnection();

        // 1. Add idTaller column if not exists
        console.log('Checking/Adding idTaller column to cita table...');
        try {
            await connection.query('ALTER TABLE cita ADD COLUMN idTaller VARCHAR(50) AFTER idMecanico');
            console.log('Column idTaller added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column idTaller already exists.');
            } else {
                throw e;
            }
        }

        // 2. Modify idMecanico only if it's not already nullable (This varies by SQL mode, but safer to Ensure)
        console.log('Ensuring idMecanico is nullable...');
        await connection.query('ALTER TABLE cita MODIFY COLUMN idMecanico VARCHAR(50) NULL');

        // 3. Backfill idTaller from existing idMecanico connections
        console.log('Backfilling data...');
        const [result] = await connection.query(`
            UPDATE cita c 
            JOIN mecanico m ON c.idMecanico = m.idUsuario 
            SET c.idTaller = m.idTaller 
            WHERE c.idTaller IS NULL
        `);
        console.log(`Updated ${result.changedRows} rows.`);

        console.log('--- MIGRATION COMPLETE ---');
        process.exit(0);

    } catch (error) {
        console.error('MIGRATION FAILED:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

migrate();
