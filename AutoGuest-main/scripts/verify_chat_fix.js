require('dotenv').config();
const db = require('./config/database');
const { nanoid } = require('nanoid');

async function verifyChatFix() {
    const idCita = 'CIT0Exvk';
    const userId = 'CLIENTE_TEST_ID'; // We just need something that exists in usuario for the join
    const idMensaje = 'MSG_TEST_' + nanoid(7);

    try {
        console.log('--- Verifying Chat Fix ---');
        
        // 1. Try to fetch a known valid user for the test
        const [users] = await db.query('SELECT idUsuario FROM usuario LIMIT 1');
        if (users.length === 0) {
            console.log('No users found to test with.');
            return;
        }
        const testUserId = users[0].idUsuario;

        // 2. Test Insert
        console.log(`Inserting test message ${idMensaje} with userId ${testUserId}...`);
        await db.query(
            `INSERT INTO chat_mensaje 
                (id_mensaje, id_cita, remitente_id, remitente_tipo, tipo_contenido, contenido)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [idMensaje, idCita, testUserId, 'cliente', 'texto', 'Verification test message']
        );
        console.log('✅ Insert successful');

        // 3. Test Select (Join)
        console.log('Fetching back the message with join...');
        const [mensajes] = await db.query(`
            SELECT 
                m.*,
                u.nombre AS remitenteNombre
            FROM chat_mensaje m
            JOIN usuario u ON m.remitente_id = u.idUsuario
            WHERE m.id_mensaje = ?
        `, [idMensaje]);

        if (mensajes.length > 0) {
            console.log('✅ Select successful');
            console.log('Message Data:', mensajes[0]);
        } else {
            console.log('❌ Message not found after insert');
        }

        // 4. Cleanup
        await db.query('DELETE FROM chat_mensaje WHERE id_mensaje = ?', [idMensaje]);
        console.log('✅ Cleanup successful');

    } catch (error) {
        console.error('❌ Verification FAILED:', error);
    } finally {
        process.exit();
    }
}

verifyChatFix();
