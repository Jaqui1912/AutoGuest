/**
 * Controlador de Tickets
 * Maneja endpoints relacionados con tickets de soporte
 */

const ticketService = require('../services/ticketService');
const { validateTicket, validateRespuestaTicket } = require('../middleware/validation');
const { logger, logRequest, logError } = require('../middleware/logger');
const { apiRateLimit } = require('../middleware/rateLimit');

class TicketController {
    constructor() {
        this.crearTicket = this.crearTicket.bind(this);
        this.agregarRespuesta = this.agregarRespuesta.bind(this);
        this.getTicketsUsuario = this.getTicketsUsuario.bind(this);
        this.getTicketById = this.getTicketById.bind(this);
        this.getTicketsStaff = this.getTicketsStaff.bind(this);
        this.actualizarEstadoTicket = this.actualizarEstadoTicket.bind(this);
        this.cerrarTicket = this.cerrarTicket.bind(this);
        this.getEstadisticasTickets = this.getEstadisticasTickets.bind(this);
        this.getCategoriasTickets = this.getCategoriasTickets.bind(this);
        this.getTicketDetalle = this.getTicketDetalle.bind(this);
    }

    /**
     * Crear un nuevo ticket
     */
    async crearTicket(req, res) {
        try {
            logRequest(req);

            const ticketData = req.body;
            const idUsuario = req.session.userId;

            // Validar datos de entrada
            const validation = validateTicket(ticketData);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Datos de ticket inválidos',
                    details: validation.errors
                });
            }

            // Crear ticket
            const result = await ticketService.crearTicket({
                idUsuario,
                ...ticketData
            });

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.status(201).json({
                message: 'Ticket creado exitosamente',
                ticket: result.ticket
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Agregar respuesta a un ticket
     */
    async agregarRespuesta(req, res) {
        try {
            logRequest(req);

            const { idTicket } = req.params;
            const { contenido } = req.body;
            const idUsuario = req.session.userId;

            // Validar datos de entrada
            const validation = validateRespuestaTicket({ contenido });
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Datos de respuesta inválidos',
                    details: validation.errors
                });
            }

            // Determinar si es staff (puedes implementar lógica más compleja aquí)
            const esStaff = req.session.userType === 'admin' || req.session.isStaff;

            const result = await ticketService.agregarRespuesta(idTicket, {
                idUsuario,
                contenido,
                esStaff
            });

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.status(201).json({
                message: 'Respuesta agregada exitosamente',
                respuesta: result.respuesta
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener tickets del usuario actual
     */
    async getTicketsUsuario(req, res) {
        try {
            logRequest(req);

            const idUsuario = req.session.userId;

            const tickets = await ticketService.getTicketsUsuario(idUsuario);

            res.json({ tickets });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener detalles de un ticket específico
     */
    async getTicketById(req, res) {
        try {
            logRequest(req);

            const { idTicket } = req.params;
            const idUsuario = req.session.userId;

            const ticket = await ticketService.getTicketById(idTicket, idUsuario);

            if (!ticket) {
                return res.status(404).json({
                    error: 'Ticket no encontrado'
                });
            }

            res.json({ ticket });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener detalles extendidos para el comprobante de pago/soporte
     */
    async getTicketDetalle(req, res) {
        try {
            logRequest(req);
            const { idTicket } = req.params;
            const idUsuario = req.session.userId;

            const responseData = await ticketService.getConsolidatedTicketDetail(idTicket, idUsuario);

            if (!responseData) {
                return res.status(404).json({
                    error: 'Detalles del comprobante no encontrados'
                });
            }

            res.json(responseData);

        } catch (error) {
            logError(error, req);
            res.status(500).json({ error: 'Error al obtener detalle del comprobante' });
        }
    }

    /**
     * Obtener tickets para staff (requiere permisos de staff)
     */
    async getTicketsStaff(req, res) {
        try {
            logRequest(req);

            // Verificar permisos de staff
            if (!req.session.isStaff && req.session.userType !== 'admin') {
                return res.status(403).json({
                    error: 'Acceso denegado. Se requieren permisos de staff.'
                });
            }

            const { estado, prioridad, categoria } = req.query;

            const filtros = {};
            if (estado) filtros.estado = estado;
            if (prioridad) filtros.prioridad = prioridad;
            if (categoria) filtros.categoria = categoria;

            const tickets = await ticketService.getTicketsStaff(filtros);

            res.json({ tickets });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Actualizar estado de un ticket (solo staff)
     */
    async actualizarEstadoTicket(req, res) {
        try {
            logRequest(req);

            // Verificar permisos de staff
            if (!req.session.isStaff && req.session.userType !== 'admin') {
                return res.status(403).json({
                    error: 'Acceso denegado. Se requieren permisos de staff.'
                });
            }

            const { idTicket } = req.params;
            const { estado } = req.body;
            const idUsuarioStaff = req.session.userId;

            if (!estado) {
                return res.status(400).json({
                    error: 'Estado es requerido'
                });
            }

            const result = await ticketService.actualizarEstadoTicket(idTicket, estado, idUsuarioStaff);

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.json({
                message: 'Estado del ticket actualizado exitosamente'
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Cerrar ticket (solo el creador)
     */
    async cerrarTicket(req, res) {
        try {
            logRequest(req);

            const { idTicket } = req.params;
            const idUsuario = req.session.userId;

            const cerrado = await ticketService.cerrarTicket(idTicket, idUsuario);

            if (!cerrado) {
                return res.status(404).json({
                    error: 'Ticket no encontrado o no autorizado'
                });
            }

            res.json({
                message: 'Ticket cerrado exitosamente'
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener estadísticas de tickets (solo staff)
     */
    async getEstadisticasTickets(req, res) {
        try {
            logRequest(req);

            // Verificar permisos de staff
            if (!req.session.isStaff && req.session.userType !== 'admin') {
                return res.status(403).json({
                    error: 'Acceso denegado. Se requieren permisos de staff.'
                });
            }

            const estadisticas = await ticketService.getEstadisticasTickets();

            res.json({ estadisticas });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener categorías disponibles para tickets
     */
    async getCategoriasTickets(req, res) {
        try {
            logRequest(req);

            const categorias = await ticketService.getCategoriasTickets();

            res.json({ categorias });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
}

module.exports = new TicketController();