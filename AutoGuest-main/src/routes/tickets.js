/**
 * Rutas de Tickets/Soporte
 * Define los endpoints para gestión de tickets de soporte
 */

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);
router.use(apiRateLimit);

// Crear ticket
router.post('/', ticketController.crearTicket);

// Agregar respuesta a un ticket
router.post('/:idTicket/respuesta', ticketController.agregarRespuesta);

// Obtener tickets del usuario actual
router.get('/', ticketController.getTicketsUsuario);

// Obtener detalles extendidos de un ticket/comprobante específico
router.get('/detalle/:idTicket', ticketController.getTicketDetalle);

// Obtener detalles básicos de un ticket de soporte
router.get('/:idTicket', ticketController.getTicketById);

// Obtener tickets para staff (requiere permisos)
router.get('/staff/tickets', ticketController.getTicketsStaff);

// Actualizar estado de un ticket (solo staff)
router.put('/:idTicket/estado', ticketController.actualizarEstadoTicket);

// Cerrar ticket (solo el creador)
router.put('/:idTicket/cerrar', ticketController.cerrarTicket);

// Obtener estadísticas de tickets (solo staff)
router.get('/staff/estadisticas', ticketController.getEstadisticasTickets);

// Obtener categorías disponibles
router.get('/categorias', ticketController.getCategoriasTickets);

module.exports = router;
