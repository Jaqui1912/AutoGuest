/**
 * Rutas de Pagos
 * Define los endpoints para gestión de pagos y transacciones
 */

const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const { authenticate } = require('../middleware/auth');
const { createResourceRateLimit } = require('../middleware/rateLimit');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// Crear pago
router.post('/', createResourceRateLimit, pagoController.createPago);

// Procesar pago
router.post('/:idPago/procesar', pagoController.procesarPago);

// Obtener pagos del usuario actual
router.get('/', pagoController.getPagosUsuario);

// Obtener detalles de un pago específico
router.get('/:idPago', pagoController.getPagoById);

// Reembolsar pago
router.post('/:idPago/reembolsar', pagoController.reembolsarPago);

// Obtener ingresos de un taller (solo administradores)
router.get('/taller/:idTaller/ingresos', pagoController.getIngresosTaller);

module.exports = router;