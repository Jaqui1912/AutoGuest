require('dotenv').config();
const db = require('./config/database');

async function fixAndVerify() {
    try {
        console.log('--- REBUILDING CHAT TABLE ---');
        await db.query('DROP TABLE IF EXISTS chat_mensaje');
        await db.query(`
            CREATE TABLE chat_mensaje (
                id_mensaje VARCHAR(50) PRIMARY KEY,
                id_cita VARCHAR(50) NOT NULL,
                remitente_id VARCHAR(50) NOT NULL,
                remitente_tipo VARCHAR(20) NOT NULL,
                tipo_contenido VARCHAR(20) NOT NULL DEFAULT 'texto',
                contenido TEXT NOT NULL,
                nombre_archivo VARCHAR(255) NULL,
                leido BOOLEAN NOT NULL DEFAULT FALSE,
                fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Standardized table created.');

        console.log('\n--- TESTING INSERT ---');
        await db.query(
            'INSERT INTO chat_mensaje (id_mensaje, id_cita, remitente_id, remitente_tipo, contenido) VALUES (?, ?, ?, ?, ?)',
            ['TEST_ID_1', 'CITA_1', 'USER_1', 'cliente', 'Hello world']
        );
        console.log('✅ Insert successful');

        console.log('\n--- TESTING SELECT ---');
        const [rows] = await db.query('SELECT * FROM chat_mensaje WHERE id_mensaje = ?', ['TEST_ID_1']);
        console.log('✅ Select successful');
        console.log('Row Data (mapped):', rows[0]);

        if (rows[0].idMensaje === 'TEST_ID_1') {
            console.log('✅ Column mapping verification: SUCCESS (id_mensaje -> idMensaje)');
        } else {
            console.log('❌ Column mapping verification: FAILED');
        }

    } catch (error) {
        console.error('❌ FATAL ERROR:', error);
    } finally {
        process.exit();
    }
}

fixAndVerify();
