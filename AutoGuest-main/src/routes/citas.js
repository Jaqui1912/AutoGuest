const express = require('express');
const citaController = require('../controllers/citaController');
const { ensureAuthenticated } = require('../middleware/auth');
const { validateAppointmentData } = require('../middleware/validation');
const router = express.Router();

// Crear nueva cita
router.post('/', ensureAuthenticated, validateAppointmentData, citaController.createCita);

// Obtener citas del cliente actual
router.get('/', ensureAuthenticated, citaController.getCitasCliente);

// Obtener detalles de una cita específica
router.get('/:idCita', ensureAuthenticated, citaController.getCitaDetalle);

// Obtener la cotización de una cita específica
router.get('/:idCita/cotizacion', ensureAuthenticated, citaController.getCotizacion);

// Actualizar estado genérico de cita
router.put('/:idCita/estado', ensureAuthenticated, citaController.updateCitaEstado);

// Aprobar cotización (Cambia estado a 'En Proceso')
router.put('/:idCita/aprobar-cotizacion', ensureAuthenticated, (req, res, next) => {
    req.body.estado = 'En Proceso';
    next();
}, citaController.updateCitaEstado);

// Rechazar cotización (Cambia estado a 'Cancelado')
router.put('/:idCita/rechazar-cotizacion', ensureAuthenticated, (req, res, next) => {
    req.body.estado = 'Cancelado';
    next();
}, citaController.updateCitaEstado);

// Cancelar cita
router.post('/:idCita/cancelar', ensureAuthenticated, citaController.cancelCita);

// Confirmar entrega de vehículo (pago en efectivo)
router.put('/:idCita/confirmar-entrega-codigo', ensureAuthenticated, citaController.confirmarEntregaCodigo);


module.exports = router;
