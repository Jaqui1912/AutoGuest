/**
 * Rutas de Chat por Cita
 * Endpoints usados por el portal_mecanico.html y portal_cliente.html
 * GET  /api/chat/:idCita        -> cargar mensajes de la cita
 * POST /api/chat/:idCita        -> enviar mensaje en la cita
 * GET  /api/chat/:idCita/no-leidos -> contar mensajes no leídos
 */

const express = require('express');
const router = express.Router();
const db = require('../config/config/database');

// Ensure chat_cita table exists (auto-create on first use)
async function ensureChatCitaTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_cita (
            "idMensaje"   SERIAL PRIMARY KEY,
            "idCita"      VARCHAR(50) NOT NULL,
            "idRemitente" VARCHAR(50) NOT NULL,
            contenido   TEXT NOT NULL,
            "tipoContenido" VARCHAR(20) DEFAULT 'texto',
            "nombreArchivo" VARCHAR(255) DEFAULT NULL,
            "fechaEnvio"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            leido       BOOLEAN DEFAULT FALSE
        )
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_chat_cita_cita ON chat_cita ("idCita")');
    await db.query('CREATE INDEX IF NOT EXISTS idx_chat_cita_remitente ON chat_cita ("idRemitente")');
}

// ─── GET /api/chat/:idCita ────────────────────────────────────────────────────
// Obtiene los mensajes de una cita. Accesible por mecánico o cliente de la cita.
router.get('/:idCita', async (req, res) => {
    const { idCita } = req.params;

    // Identificar al usuario — acepta sesión de mecánico o de cliente
    const idUsuario = req.session && req.session.userId;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        await ensureChatCitaTable();

        // Verificar que la cita existe y el usuario tiene acceso
        const [citas] = await db.query(
            'SELECT idCliente, idMecanico, idTaller FROM cita WHERE idCita = ?',
            [idCita]
        );

        if (citas.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        const cita = citas[0];
        const participantes = [cita.idCliente, cita.idMecanico].filter(Boolean);

        let tieneAcceso = participantes.includes(idUsuario);
        if (!tieneAcceso) {
            // Verificar si es el administrador del taller
            const [adminCheck] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ? AND idTaller = ?', [idUsuario, cita.idTaller]);
            if (adminCheck.length > 0) {
                tieneAcceso = true;
            }
        }

        if (!tieneAcceso) {
            return res.status(403).json({ error: 'Sin acceso a este chat' });
        }

        // Obtener mensajes con nombre del remitente
        const [mensajes] = await db.query(`
            SELECT cc."idMensaje",
                   cc."idCita",
                   cc."idRemitente" AS "remitenteId",
                   u.nombre         AS "remitenteNombre",
                   cc.contenido,
                   cc."tipoContenido",
                   cc."nombreArchivo",
                   cc."fechaEnvio" AT TIME ZONE 'UTC' AS "fechaEnvio",
                   cc.leido
            FROM chat_cita cc
            JOIN usuario u ON cc."idRemitente" = cast(u.idUsuario as varchar)
            WHERE cc."idCita" = ?
            ORDER BY cc."fechaEnvio" ASC
        `, [idCita]);

        // Marcar como leídos los mensajes que NO son del usuario actual
        await db.query(
            'UPDATE chat_cita SET leido = true WHERE "idCita" = ? AND "idRemitente" != ? AND leido = false',
            [idCita, String(idUsuario)]
        );

        res.json(mensajes);

    } catch (error) {
        console.error('Error al cargar mensajes del chat:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ─── POST /api/chat/:idCita ───────────────────────────────────────────────────
// Envía un mensaje en el chat de una cita.
router.post('/:idCita', async (req, res) => {
    const { idCita } = req.params;
    const { contenido, tipoContenido = 'texto', nombreArchivo = null } = req.body;

    const idUsuario = req.session && req.session.userId;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    if (!contenido || !contenido.trim()) {
        return res.status(400).json({ error: 'El contenido no puede estar vacío' });
    }

    try {
        await ensureChatCitaTable();

        // Verificar que el usuario es participante de la cita o admin del taller
        const [citas] = await db.query(
            'SELECT idCliente, idMecanico, idTaller FROM cita WHERE idCita = ?',
            [idCita]
        );

        if (citas.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        const cita = citas[0];
        const participantes = [cita.idCliente, cita.idMecanico].filter(Boolean);

        let tieneAcceso = participantes.includes(idUsuario);
        if (!tieneAcceso) {
            // Verificar si es el administrador del taller
            const [adminCheck] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ? AND idTaller = ?', [idUsuario, cita.idTaller]);
            if (adminCheck.length > 0) {
                tieneAcceso = true;
            }
        }

        if (!tieneAcceso) {
            return res.status(403).json({ error: 'Sin acceso a este chat' });
        }

        // Insertar mensaje
        await db.query(
            'INSERT INTO chat_cita ("idCita", "idRemitente", contenido, "tipoContenido", "nombreArchivo") VALUES (?, ?, ?, ?, ?)',
            [idCita, String(idUsuario), contenido, tipoContenido, nombreArchivo]
        );

        // Notificar al otro participante (o al cliente si responde el taller)
        let idDestinatario = participantes.find(p => p !== idUsuario);
        if (!idDestinatario && participantes.length > 0) {
            // Si el admin del taller envió el mensaje, notificamos al cliente por defecto
            idDestinatario = cita.idCliente;
        }

        if (idDestinatario) {
            db.query(
                'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
                [idDestinatario, 'Nuevo mensaje en tu cita', `Tienes un nuevo mensaje en la cita ${idCita}.`, 'chat']
            ).catch((err) => { console.error('Error insertando notificacion:', err.message); });
        }

        res.status(201).json({ success: true });

    } catch (error) {
        console.error('Error al enviar mensaje de chat:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ─── GET /api/chat/:idCita/no-leidos ─────────────────────────────────────────
// Devuelve el número de mensajes no leídos para el usuario actual en esa cita.
router.get('/:idCita/no-leidos', async (req, res) => {
    const { idCita } = req.params;

    const idUsuario = req.session && req.session.userId;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        await ensureChatCitaTable();

        const [citas] = await db.query('SELECT idCliente, idMecanico, idTaller FROM cita WHERE idCita = ?', [idCita]);
        if (citas.length === 0) return res.json({ noLeidos: 0 });

        const cita = citas[0];
        let idValidoParaMios = idUsuario;

        // Si es el admin del taller leyendo, cuenta como si fuera el mecánico
        // para efectos de no leer los del cliente. Para ser más precisos, si es admin,
        // consideramos leídos los que no sean del idUsuario.
        let esAdmin = false;
        if (![cita.idCliente, cita.idMecanico].includes(idUsuario)) {
             const [adminCheck] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ? AND idTaller = ?', [idUsuario, cita.idTaller]);
             if (adminCheck.length > 0) esAdmin = true;
        }

        if (![cita.idCliente, cita.idMecanico].includes(idUsuario) && !esAdmin) {
            return res.status(403).json({ error: 'Sin acceso' });
        }

        const [rows] = await db.query(
            'SELECT COUNT(*) AS "noLeidos" FROM chat_cita WHERE "idCita" = ? AND "idRemitente" != ? AND leido = false',
            [idCita, String(idUsuario)]
        );

        res.json({ noLeidos: rows[0].noLeidos || 0 });

    } catch (error) {
        console.error('Error al contar no leídos:', error);
        res.status(500).json({ noLeidos: 0 });
    }
});

module.exports = router;
