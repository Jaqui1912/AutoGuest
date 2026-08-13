/**
 * Servicio de Reseñas
 * Maneja operaciones relacionadas con reseñas y calificaciones
 */

const db = require('../config/config/database');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class ResenaService {
    /**
     * Crear una nueva reseña
     */
    async createResena(resenaData) {
        const { idUsuario, idTaller, calificacion, comentario, idCita } = resenaData;

        try {
            // Verificar que la cita existe y pertenece al usuario
            const [citaRows] = await db.query(
                'SELECT idCita, estado FROM cita WHERE idCita = ? AND idCliente = ? AND estado = "Completado"',
                [idCita, idUsuario]
            );

            if (citaRows.length === 0) {
                return { success: false, error: 'Cita no encontrada o no completada' };
            }

            // Verificar que no exista ya una reseña para esta cita
            const [existingResena] = await db.query(
                'SELECT idResena FROM resena WHERE idCita = ?',
                [idCita]
            );

            if (existingResena.length > 0) {
                return { success: false, error: 'Ya existe una reseña para esta cita' };
            }

            // Crear reseña
            const [result] = await db.query(
                'INSERT INTO resena (idUsuario, idTaller, calificacion, comentario, idCita, fechaCreacion) VALUES (?, ?, ?, ?, ?, NOW())',
                [idUsuario, idTaller, calificacion, comentario || null, idCita]
            );

            logBusinessOperation('Reseña creada', { idUsuario, idTaller, calificacion, idCita });

            return {
                success: true,
                resena: {
                    idResena: result.insertId,
                    idUsuario,
                    idTaller,
                    calificacion,
                    comentario,
                    idCita
                }
            };
        } catch (error) {
            logger.error('Error al crear reseña', error, resenaData);
            throw error;
        }
    }

    /**
     * Obtener reseñas de un taller
     */
    async getResenasTaller(idTaller, limit = 20, offset = 0) {
        try {
            const [resenas] = await db.query(`
                SELECT r.*, u.nombre as nombreUsuario
                FROM resena r
                JOIN usuario u ON r.idUsuario = u.idUsuario
                WHERE r.idTaller = ?
                ORDER BY r.fechaCreacion DESC
                LIMIT ? OFFSET ?
            `, [idTaller, limit, offset]);

            logDatabaseOperation('SELECT', 'resena', { idTaller, count: resenas.length });

            return resenas;
        } catch (error) {
            logger.error('Error al obtener reseñas del taller', error, { idTaller });
            throw error;
        }
    }

    /**
     * Obtener reseñas de un usuario
     */
    async getResenasUsuario(idUsuario) {
        try {
            const [resenas] = await db.query(`
                SELECT r.*, t.nombre as nombreTaller
                FROM resena r
                JOIN taller t ON r.idTaller = t.idTaller
                WHERE r.idUsuario = ?
                ORDER BY r.fechaCreacion DESC
            `, [idUsuario]);

            logDatabaseOperation('SELECT', 'resena', { idUsuario, count: resenas.length });

            return resenas;
        } catch (error) {
            logger.error('Error al obtener reseñas del usuario', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Calcular promedio de calificaciones de un taller
     */
    async getPromedioCalificaciones(idTaller) {
        try {
            const [result] = await db.query(`
                SELECT
                    COUNT(*) as totalResenas,
                    AVG(calificacion) as promedioCalificacion,
                    MIN(calificacion) as calificacionMinima,
                    MAX(calificacion) as calificacionMaxima
                FROM resena
                WHERE idTaller = ?
            `, [idTaller]);

            const stats = result[0];
            stats.promedioCalificacion = parseFloat(stats.promedioCalificacion || 0).toFixed(1);

            logDatabaseOperation('SELECT', 'estadisticas_resena', { idTaller });

            return stats;
        } catch (error) {
            logger.error('Error al calcular promedio de calificaciones', error, { idTaller });
            throw error;
        }
    }

    /**
     * Obtener distribución de calificaciones
     */
    async getDistribucionCalificaciones(idTaller) {
        try {
            const [result] = await db.query(`
                SELECT
                    calificacion,
                    COUNT(*) as cantidad
                FROM resena
                WHERE idTaller = ?
                GROUP BY calificacion
                ORDER BY calificacion DESC
            `, [idTaller]);

            // Crear distribución completa (1-5 estrellas)
            const distribucion = {};
            for (let i = 1; i <= 5; i++) {
                distribucion[i] = 0;
            }

            result.forEach(row => {
                distribucion[row.calificacion] = row.cantidad;
            });

            return distribucion;
        } catch (error) {
            logger.error('Error al obtener distribución de calificaciones', error, { idTaller });
            throw error;
        }
    }

    /**
     * Verificar si un usuario puede reseñar una cita
     */
    async puedeResenarCita(idCita, idUsuario) {
        try {
            const [citaRows] = await db.query(
                'SELECT estado FROM cita WHERE idCita = ? AND idCliente = ?',
                [idCita, idUsuario]
            );

            if (citaRows.length === 0) {
                return { puede: false, razon: 'Cita no encontrada' };
            }

            if (citaRows[0].estado !== 'Completado') {
                return { puede: false, razon: 'La cita debe estar completada para poder reseñar' };
            }

            // Verificar si ya existe reseña
            const [resenaRows] = await db.query(
                'SELECT idResena FROM resena WHERE idCita = ?',
                [idCita]
            );

            if (resenaRows.length > 0) {
                return { puede: false, razon: 'Ya existe una reseña para esta cita' };
            }

            return { puede: true };
        } catch (error) {
            logger.error('Error al verificar si puede reseñar', error, { idCita, idUsuario });
            throw error;
        }
    }

    /**
     * Eliminar reseña (solo el autor o admin)
     */
    async deleteResena(idResena, idUsuario) {
        try {
            const [result] = await db.query(
                'DELETE FROM resena WHERE idResena = ? AND idUsuario = ?',
                [idResena, idUsuario]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Reseña eliminada', { idResena, idUsuario });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al eliminar reseña', error, { idResena, idUsuario });
            throw error;
        }
    }
}

module.exports = new ResenaService();