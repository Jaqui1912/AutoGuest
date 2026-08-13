/**
 * Servicio de Chat
 * Maneja operaciones relacionadas con mensajes de chat entre usuarios
 */

const db = require('../config/config/database');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class ChatService {
    /**
     * Enviar un mensaje
     */
    async enviarMensaje(mensajeData) {
        const { idRemitente, idDestinatario, contenido, tipo = 'texto' } = mensajeData;

        try {
            // Verificar que ambos usuarios existen
            const [usuarios] = await db.query(
                'SELECT idUsuario, tipo FROM usuario WHERE idUsuario IN (?, ?)',
                [idRemitente, idDestinatario]
            );

            if (usuarios.length !== 2) {
                return { success: false, error: 'Uno o ambos usuarios no existen' };
            }

            // Crear mensaje
            const [result] = await db.query(
                'INSERT INTO mensaje (idRemitente, idDestinatario, contenido, tipo, fechaEnvio, leido) VALUES (?, ?, ?, ?, NOW(), false)',
                [idRemitente, idDestinatario, contenido, tipo]
            );

            logBusinessOperation('Mensaje enviado', { idRemitente, idDestinatario, tipo });

            return {
                success: true,
                mensaje: {
                    idMensaje: result.insertId,
                    idRemitente,
                    idDestinatario,
                    contenido,
                    tipo,
                    fechaEnvio: new Date(),
                    leido: false
                }
            };
        } catch (error) {
            logger.error('Error al enviar mensaje', error, mensajeData);
            throw error;
        }
    }

    /**
     * Obtener conversación entre dos usuarios
     */
    async getConversacion(idUsuario1, idUsuario2, limit = 50, offset = 0) {
        try {
            const [mensajes] = await db.query(`
                SELECT m.*,
                       u1.nombre as nombreRemitente,
                       u2.nombre as nombreDestinatario
                FROM mensaje m
                JOIN usuario u1 ON m.idRemitente = u1.idUsuario
                JOIN usuario u2 ON m.idDestinatario = u2.idUsuario
                WHERE (m.idRemitente = ? AND m.idDestinatario = ?)
                   OR (m.idRemitente = ? AND m.idDestinatario = ?)
                ORDER BY m.fechaEnvio DESC
                LIMIT ? OFFSET ?
            `, [idUsuario1, idUsuario2, idUsuario2, idUsuario1, limit, offset]);

            logDatabaseOperation('SELECT', 'mensaje', {
                idUsuario1,
                idUsuario2,
                count: mensajes.length
            });

            return mensajes.reverse(); // Ordenar cronológicamente
        } catch (error) {
            logger.error('Error al obtener conversación', error, { idUsuario1, idUsuario2 });
            throw error;
        }
    }

    /**
     * Obtener conversaciones del usuario
     */
    async getConversacionesUsuario(idUsuario) {
        try {
            const [conversaciones] = await db.query(`
                SELECT
                    CASE
                        WHEN m.idRemitente = ? THEN m.idDestinatario
                        ELSE m.idRemitente
                    END as idOtroUsuario,
                    u.nombre as nombreOtroUsuario,
                    u.tipo as tipoOtroUsuario,
                    MAX(m.fechaEnvio) as ultimoMensaje,
                    COUNT(CASE WHEN m.leido = false AND m.idDestinatario = ? THEN 1 END) as mensajesNoLeidos,
                    (
                        SELECT contenido
                        FROM mensaje
                        WHERE (idRemitente = ? AND idDestinatario = CASE WHEN m.idRemitente = ? THEN m.idDestinatario ELSE m.idRemitente END)
                           OR (idRemitente = CASE WHEN m.idRemitente = ? THEN m.idDestinatario ELSE m.idRemitente END AND idDestinatario = ?)
                        ORDER BY fechaEnvio DESC
                        LIMIT 1
                    ) as ultimoMensajeContenido
                FROM mensaje m
                JOIN usuario u ON (
                    CASE
                        WHEN m.idRemitente = ? THEN m.idDestinatario
                        ELSE m.idRemitente
                    END = u.idUsuario
                )
                WHERE m.idRemitente = ? OR m.idDestinatario = ?
                GROUP BY
                    CASE
                        WHEN m.idRemitente = ? THEN m.idDestinatario
                        ELSE m.idRemitente
                    END,
                    u.nombre,
                    u.tipo
                ORDER BY ultimoMensaje DESC
            `, [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario]);

            logDatabaseOperation('SELECT', 'conversaciones', { idUsuario, count: conversaciones.length });

            return conversaciones;
        } catch (error) {
            logger.error('Error al obtener conversaciones del usuario', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Marcar mensajes como leídos
     */
    async marcarComoLeido(idUsuario, idRemitente) {
        try {
            const [result] = await db.query(
                'UPDATE mensaje SET leido = true WHERE idDestinatario = ? AND idRemitente = ? AND leido = false',
                [idUsuario, idRemitente]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Mensajes marcados como leídos', { idUsuario, idRemitente, count: result.affectedRows });
            }

            return result.affectedRows;
        } catch (error) {
            logger.error('Error al marcar mensajes como leídos', error, { idUsuario, idRemitente });
            throw error;
        }
    }

    /**
     * Obtener mensajes no leídos
     */
    async getMensajesNoLeidos(idUsuario) {
        try {
            const [mensajes] = await db.query(`
                SELECT m.*, u.nombre as nombreRemitente
                FROM mensaje m
                JOIN usuario u ON m.idRemitente = u.idUsuario
                WHERE m.idDestinatario = ? AND m.leido = false
                ORDER BY m.fechaEnvio DESC
            `, [idUsuario]);

            logDatabaseOperation('SELECT', 'mensaje_no_leido', { idUsuario, count: mensajes.length });

            return mensajes;
        } catch (error) {
            logger.error('Error al obtener mensajes no leídos', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Eliminar un mensaje (solo el remitente puede eliminar)
     */
    async eliminarMensaje(idMensaje, idUsuario) {
        try {
            const [result] = await db.query(
                'DELETE FROM mensaje WHERE idMensaje = ? AND idRemitente = ?',
                [idMensaje, idUsuario]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Mensaje eliminado', { idMensaje, idUsuario });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al eliminar mensaje', error, { idMensaje, idUsuario });
            throw error;
        }
    }

    /**
     * Verificar si existe conversación entre dos usuarios
     */
    async existeConversacion(idUsuario1, idUsuario2) {
        try {
            const [result] = await db.query(
                'SELECT COUNT(*) as count FROM mensaje WHERE (idRemitente = ? AND idDestinatario = ?) OR (idRemitente = ? AND idDestinatario = ?)',
                [idUsuario1, idUsuario2, idUsuario2, idUsuario1]
            );

            return result[0].count > 0;
        } catch (error) {
            logger.error('Error al verificar conversación', error, { idUsuario1, idUsuario2 });
            throw error;
        }
    }

    /**
     * Obtener estadísticas de chat del usuario
     */
    async getEstadisticasChat(idUsuario) {
        try {
            const [stats] = await db.query(`
                SELECT
                    COUNT(CASE WHEN idRemitente = ? THEN 1 END) as mensajesEnviados,
                    COUNT(CASE WHEN idDestinatario = ? THEN 1 END) as mensajesRecibidos,
                    COUNT(CASE WHEN idDestinatario = ? AND leido = false THEN 1 END) as mensajesNoLeidos,
                    COUNT(DISTINCT CASE WHEN idRemitente = ? THEN idDestinatario ELSE idRemitente END) as conversacionesActivas
                FROM mensaje
                WHERE idRemitente = ? OR idDestinatario = ?
            `, [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario]);

            logDatabaseOperation('SELECT', 'estadisticas_chat', { idUsuario });

            return stats[0];
        } catch (error) {
            logger.error('Error al obtener estadísticas de chat', error, { idUsuario });
            throw error;
        }
    }
}

module.exports = new ChatService();