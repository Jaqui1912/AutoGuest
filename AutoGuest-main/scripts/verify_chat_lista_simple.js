require('dotenv').config();
const db = require('./config/database');

async function verifyChatListaSimple() {
    try {
        console.log('--- RE-INITIALIZING chat_lista ---');
        await db.query('DROP TABLE IF EXISTS chat_lista');
        await db.query(`
            CREATE TABLE chat_lista (
                id_chat VARCHAR(50) PRIMARY KEY,
                id_cita VARCHAR(50) NOT NULL,
                ultimo_mensaje TEXT NULL,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const idTest = 'TEST_CHAT_123';
        const msg = 'Mensaje de prueba simple';

        console.log('Testing simple insert...');
        // Let's use 3 columns and let fecha_actualizacion use default
        await db.query(`
            INSERT INTO chat_lista (id_chat, id_cita, ultimo_mensaje)
            VALUES (?, ?, ?)
        `, [idTest, idTest, msg]);
        console.log('✅ Simple insert successful');

        console.log('Testing upsert...');
        await db.query(`
            INSERT INTO chat_lista (id_chat, id_cita, ultimo_mensaje)
            VALUES (?, ?, ?)
            ON CONFLICT (id_chat) DO UPDATE SET 
            ultimo_mensaje = EXCLUDED.ultimo_mensaje,
            fecha_actualizacion = CURRENT_TIMESTAMP
        `, [idTest, idTest, 'Mensaje actualizado']);
        console.log('✅ Upsert successful');

        const [rows] = await db.query('SELECT * FROM chat_lista WHERE id_chat = ?', [idTest]);
        console.log('✅ Row fetched:', rows[0]);

    } catch (error) {
        console.error('❌ FAILED:', error);
    } finally {
        process.exit();
    }
}

verifyChatListaSimple();
