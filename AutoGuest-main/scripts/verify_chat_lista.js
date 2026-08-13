require('dotenv').config();
const db = require('./config/database');

async function verifyChatLista() {
    try {
        console.log('--- Verifying chat_lista Synchronization ---');
        
        // 1. Ensure table exists (it should have been created by initChatTable if the server ran, 
        // but let's make sure for this test)
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_lista (
                id_chat VARCHAR(50) PRIMARY KEY,
                id_cita VARCHAR(50) NOT NULL,
                ultimo_mensaje TEXT NULL,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const idCita = 'CIT_LISTA_TEST';
        const msg = 'Test message for list';

        console.log('Inserting/Updating chat_lista...');
        await db.query(`
            INSERT INTO chat_lista (id_chat, id_cita, ultimo_mensaje, fecha_actualizacion)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (id_chat) DO UPDATE SET 
            ultimo_mensaje = EXCLUDED.ultimo_mensaje,
            fecha_actualizacion = CURRENT_TIMESTAMP
        `, [idCita, idCita, msg]);

        console.log('✅ Upsert successful');

        const [rows] = await db.query('SELECT * FROM chat_lista WHERE id_chat = ?', [idCita]);
        if (rows.length > 0) {
            console.log('✅ Record found:', rows[0]);
            if (rows[0].ultimoMensaje === msg) {
                console.log('✅ Content verification: SUCCESS');
            } else {
                console.log('❌ Content verification: FAILED', rows[0].ultimoMensaje);
            }
        } else {
            console.log('❌ Record not found');
        }

        // Cleanup
        await db.query('DELETE FROM chat_lista WHERE id_chat = ?', [idCita]);
        console.log('✅ Cleanup successful');

    } catch (error) {
        console.error('❌ Verification FAILED:', error);
    } finally {
        process.exit();
    }
}

verifyChatLista();
