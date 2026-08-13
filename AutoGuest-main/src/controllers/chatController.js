/**
 * Controlador de Chat
 * Maneja endpoints relacionados con mensajes y conversaciones
 */

const chatService = require('../services/chatService');
const { validateMensaje } = require('../middleware/validation');
const { logger, logRequest, logError } = require('../middleware/logger');
const { apiRateLimit } = require('../middleware/rateLimit');

class ChatController {
    constructor() {
        this.enviarMensaje = this.enviarMensaje.bind(this);
        this.getConversacion = this.getConversacion.bind(this);
        this.getConversacionesUsuario = this.getConversacionesUsuario.bind(this);
        this.marcarComoLeido = this.marcarComoLeido.bind(this);
        this.getMensajesNoLeidos = this.getMensajesNoLeidos.bind(this);
        this.eliminarMensaje = this.eliminarMensaje.bind(this);
        this.getEstadisticasChat = this.getEstadisticasChat.bind(this);
    }

    /**
     * Enviar un mensaje
     */
    async enviarMensaje(req, res) {
        try {
            logRequest(req);

            const { idDestinatario, contenido, tipo = 'texto' } = req.body;
            const idRemitente = req.session.userId;

            // Validar datos de entrada
            const validation = validateMensaje({ idDestinatario, contenido, tipo });
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Datos de mensaje inválidos',
                    details: validation.errors
                });
            }

            // Enviar mensaje
            const result = await chatService.enviarMensaje({
                idRemitente,
                idDestinatario,
                contenido,
                tipo
            });

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.status(201).json({
                message: 'Mensaje enviado exitosamente',
                mensaje: result.mensaje
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener conversación con otro usuario
     */
    async getConversacion(req, res) {
        try {
            logRequest(req);

            const { idOtroUsuario } = req.params;
            const { limit = 50, offset = 0 } = req.query;
            const idUsuario = req.session.userId;

            const mensajes = await chatService.getConversacion(
                idUsuario,
                idOtroUsuario,
                parseInt(limit),
                parseInt(offset)
            );

            res.json({
                mensajes,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset)
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
     * Obtener todas las conversaciones del usuario
     */
    async getConversacionesUsuario(req, res) {
        try {
            logRequest(req);

            const idUsuario = req.session.userId;

            const conversaciones = await chatService.getConversacionesUsuario(idUsuario);

            res.json({ conversaciones });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Marcar mensajes como leídos
     */
    async marcarComoLeido(req, res) {
        try {
            logRequest(req);

            const { idRemitente } = req.params;
            const idUsuario = req.session.userId;

            const marcados = await chatService.marcarComoLeido(idUsuario, idRemitente);

            res.json({
                message: `${marcados} mensajes marcados como leídos`
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener mensajes no leídos
     */
    async getMensajesNoLeidos(req, res) {
        try {
            logRequest(req);

            const idUsuario = req.session.userId;

            const mensajes = await chatService.getMensajesNoLeidos(idUsuario);

            res.json({ mensajes });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Eliminar un mensaje
     */
    async eliminarMensaje(req, res) {
        try {
            logRequest(req);

            const { idMensaje } = req.params;
            const idUsuario = req.session.userId;

            const eliminado = await chatService.eliminarMensaje(idMensaje, idUsuario);

            if (!eliminado) {
                return res.status(404).json({
                    error: 'Mensaje no encontrado o no autorizado'
                });
            }

            res.json({
                message: 'Mensaje eliminado exitosamente'
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener estadísticas de chat
     */
    async getEstadisticasChat(req, res) {
        try {
            logRequest(req);

            const idUsuario = req.session.userId;

            const estadisticas = await chatService.getEstadisticasChat(idUsuario);

            res.json({ estadisticas });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
}

module.exports = new ChatController();