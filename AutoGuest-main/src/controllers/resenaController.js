/**
 * Controlador de Reseñas
 * Maneja endpoints relacionados con reseñas y calificaciones
 */

const resenaService = require('../services/resenaService');
const { validateResena } = require('../middleware/validation');
const { logger, logRequest, logError } = require('../middleware/logger');
const { apiRateLimit } = require('../middleware/rateLimit');

class ResenaController {
    constructor() {
        this.createResena = this.createResena.bind(this);
        this.getResenasTaller = this.getResenasTaller.bind(this);
        this.getResenasUsuario = this.getResenasUsuario.bind(this);
        this.getEstadisticasTaller = this.getEstadisticasTaller.bind(this);
        this.deleteResena = this.deleteResena.bind(this);
    }

    /**
     * Crear una nueva reseña
     */
    async createResena(req, res) {
        try {
            logRequest(req);

            const { idTaller, calificacion, comentario, idCita } = req.body;
            const idUsuario = req.session.userId;

            // Validar datos de entrada
            const validation = validateResena({ idTaller, calificacion, comentario, idCita });
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Datos de reseña inválidos',
                    details: validation.errors
                });
            }

            // Verificar si puede reseñar
            const puedeResenar = await resenaService.puedeResenarCita(idCita, idUsuario);
            if (!puedeResenar.puede) {
                return res.status(400).json({
                    error: puedeResenar.razon
                });
            }

            // Crear reseña
            const result = await resenaService.createResena({
                idUsuario,
                idTaller,
                calificacion,
                comentario,
                idCita
            });

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.status(201).json({
                message: 'Reseña creada exitosamente',
                resena: result.resena
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener reseñas de un taller
     */
    async getResenasTaller(req, res) {
        try {
            logRequest(req);

            const { idTaller } = req.params;
            const { limit = 20, offset = 0 } = req.query;

            const resenas = await resenaService.getResenasTaller(
                idTaller,
                parseInt(limit),
                parseInt(offset)
            );

            res.json({
                resenas,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: resenas.length === parseInt(limit)
                }
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener reseñas de un usuario
     */
    async getResenasUsuario(req, res) {
        try {
            logRequest(req);

            const idUsuario = req.session.userId;

            const resenas = await resenaService.getResenasUsuario(idUsuario);

            res.json({ resenas });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener estadísticas de reseñas de un taller
     */
    async getEstadisticasTaller(req, res) {
        try {
            logRequest(req);

            const { idTaller } = req.params;

            const [promedio, distribucion] = await Promise.all([
                resenaService.getPromedioCalificaciones(idTaller),
                resenaService.getDistribucionCalificaciones(idTaller)
            ]);

            res.json({
                estadisticas: {
                    ...promedio,
                    distribucionCalificaciones: distribucion
                }
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Eliminar una reseña
     */
    async deleteResena(req, res) {
        try {
            logRequest(req);

            const { idResena } = req.params;
            const idUsuario = req.session.userId;

            const deleted = await resenaService.deleteResena(idResena, idUsuario);

            if (!deleted) {
                return res.status(404).json({
                    error: 'Reseña no encontrada o no autorizada'
                });
            }

            res.json({
                message: 'Reseña eliminada exitosamente'
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
}

module.exports = new ResenaController();