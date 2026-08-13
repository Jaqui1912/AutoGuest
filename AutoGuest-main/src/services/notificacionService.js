/**
 * Servicio de Notificaciones
 * Maneja el envío y gestión de notificaciones
 */

const db = require('../config/config/database');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class NotificacionService {
    /**
     * Crear una nueva notificación
     */
    async createNotificacion(idUsuario, titulo, mensaje, tipo = 'general') {
        try {
            const [result] = await db.query(
                'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo, fechaCreacion) VALUES (?, ?, ?, ?, NOW())',
                [idUsuario, titulo, mensaje, tipo]
            );

            logBusinessOperation('Notificación creada', { idUsuario, tipo, titulo });

            return {
                success: true,
                idNotificacion: result.insertId
            };
        } catch (error) {
            logger.error('Error al crear notificación', error, { idUsuario, titulo, tipo });
            throw error;
        }
    }

    /**
     * Obtener notificaciones de un usuario
     */
    async getNotificacionesUsuario(idUsuario, limit = 50) {
        try {
            const [notificaciones] = await db.query(
                'SELECT * FROM notificacion WHERE idUsuario = ? ORDER BY fechaCreacion DESC LIMIT ?',
                [idUsuario, limit]
            );

            logDatabaseOperation('SELECT', 'notificacion', { idUsuario, count: notificaciones.length });

            return notificaciones;
        } catch (error) {
            logger.error('Error al obtener notificaciones', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Marcar notificación como leída
     */
    async marcarComoLeida(idNotificacion, idUsuario) {
        try {
            const [result] = await db.query(
                'UPDATE notificacion SET leida = true WHERE idNotificacion = ? AND idUsuario = ?',
                [idNotificacion, idUsuario]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Notificación marcada como leída', { idNotificacion, idUsuario });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al marcar notificación como leída', error, { idNotificacion, idUsuario });
            throw error;
        }
    }

    /**
     * Marcar todas las notificaciones como leídas
     */
    async marcarTodasComoLeidas(idUsuario) {
        try {
            const [result] = await db.query(
                'UPDATE notificacion SET leida = true WHERE idUsuario = ? AND leida = false',
                [idUsuario]
            );

            logBusinessOperation('Todas las notificaciones marcadas como leídas', {
                idUsuario,
                count: result.affectedRows
            });

            return result.affectedRows;
        } catch (error) {
            logger.error('Error al marcar todas las notificaciones como leídas', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Obtener conteo de notificaciones no leídas
     */
    async getConteoNoLeidas(idUsuario) {
        try {
            const [result] = await db.query(
                'SELECT COUNT(*) as noLeidas FROM notificacion WHERE idUsuario = ? AND leida = false',
                [idUsuario]
            );

            return result[0].noLeidas;
        } catch (error) {
            logger.error('Error al obtener conteo de notificaciones no leídas', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Notificar nueva cita a taller
     */
    async notificarNuevaCita(idTaller, idCliente, fecha, hora) {
        try {
            // Obtener admin del taller
            const [adminRows] = await db.query('SELECT idUsuario FROM administrador WHERE idTaller = ? LIMIT 1', [idTaller]);
            if (adminRows.length === 0) return;

            // Obtener nombre del cliente
            const [clienteRows] = await db.query('SELECT nombre FROM usuario WHERE idUsuario = ?', [idCliente]);
            const nombreCliente = clienteRows.length > 0 ? clienteRows[0].nombre : 'Un cliente';

            await this.createNotificacion(
                adminRows[0].idUsuario,
                'Nueva Cita Agendada',
                `${nombreCliente} ha agendado una cita para el ${fecha} a las ${hora}.`,
                'cita'
            );
        } catch (error) {
            logger.error('Error al notificar nueva cita', error, { idTaller, idCliente });
        }
    }

    /**
     * Notificar cambio de estado de cita
     */
    async notificarCambioEstadoCita(idCita, nuevoEstado, idUsuarioDestino) {
        try {
            const estadosLegibles = {
                'Pendiente': 'pendiente',
                'En Proceso': 'en proceso',
                'Completado': 'completada',
                'Cancelado': 'cancelada'
            };

            const estadoLegible = estadosLegibles[nuevoEstado] || nuevoEstado.toLowerCase();

            await this.createNotificacion(
                idUsuarioDestino,
                'Actualización de Cita',
                `El estado de tu cita ha cambiado a: ${estadoLegible}`,
                'cita'
            );
        } catch (error) {
            logger.error('Error al notificar cambio de estado', error, { idCita, nuevoEstado });
        }
    }

    /**
     * Limpiar notificaciones antiguas (más de 30 días)
     */
    async limpiarNotificacionesAntiguas() {
        try {
            const [result] = await db.query(
                'DELETE FROM notificacion WHERE fechaCreacion < DATE_SUB(NOW(), INTERVAL 30 DAY)'
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Notificaciones antiguas limpiadas', { count: result.affectedRows });
            }

            return result.affectedRows;
        } catch (error) {
            logger.error('Error al limpiar notificaciones antiguas', error);
            throw error;
        }
    }
}

module.exports = new NotificacionService();