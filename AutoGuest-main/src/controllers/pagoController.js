/**
 * Controlador de Pagos
 * Maneja endpoints relacionados con pagos y transacciones
 */

const pagoService = require('../services/pagoService');
const { validatePago } = require('../middleware/validation');
const { logger, logRequest, logError } = require('../middleware/logger');
const { createResourceRateLimit } = require('../middleware/rateLimit');

class PagoController {
    constructor() {
        this.createPago = this.createPago.bind(this);
        this.procesarPago = this.procesarPago.bind(this);
        this.getPagosUsuario = this.getPagosUsuario.bind(this);
        this.getPagoById = this.getPagoById.bind(this);
        this.reembolsarPago = this.reembolsarPago.bind(this);
        this.getIngresosTaller = this.getIngresosTaller.bind(this);
    }

    /**
     * Crear un nuevo pago
     */
    async createPago(req, res) {
        try {
            logRequest(req);

            const { idCita, monto, metodoPago, descripcion } = req.body;
            const idUsuario = req.session.userId;

            // Validar datos de entrada
            const validation = validatePago({ idCita, monto, metodoPago });
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Datos de pago inválidos',
                    details: validation.errors
                });
            }

            // Crear pago
            const result = await pagoService.createPago({
                idCita,
                monto,
                metodoPago,
                descripcion,
                idUsuario
            });

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.status(201).json({
                message: 'Pago creado exitosamente',
                pago: result.pago
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Procesar un pago
     */
    async procesarPago(req, res) {
        try {
            logRequest(req);

            const { idPago } = req.params;
            const idUsuario = req.session.userId;

            const result = await pagoService.procesarPago(idPago, idUsuario);

            if (!result.success) {
                return res.status(400).json({
                    error: result.pago.estado === 'Fallido' ? 'El pago ha fallado' : result.error
                });
            }

            res.json({
                message: 'Pago procesado exitosamente',
                pago: result.pago
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener pagos del usuario actual
     */
    async getPagosUsuario(req, res) {
        try {
            logRequest(req);

            const idUsuario = req.session.userId;

            const pagos = await pagoService.getPagosUsuario(idUsuario);

            res.json({ pagos });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener detalles de un pago específico
     */
    async getPagoById(req, res) {
        try {
            logRequest(req);

            const { idPago } = req.params;
            const idUsuario = req.session.userId;

            const pago = await pagoService.getPagoById(idPago, idUsuario);

            if (!pago) {
                return res.status(404).json({
                    error: 'Pago no encontrado'
                });
            }

            res.json({ pago });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Reembolsar un pago
     */
    async reembolsarPago(req, res) {
        try {
            logRequest(req);

            const { idPago } = req.params;
            const { razon } = req.body;
            const idUsuario = req.session.userId;

            const result = await pagoService.reembolsarPago(idPago, idUsuario, razon);

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.json({
                message: 'Reembolso procesado exitosamente',
                pago: result.pago
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener ingresos de un taller (solo para administradores del taller)
     */
    async getIngresosTaller(req, res) {
        try {
            logRequest(req);

            const { idTaller } = req.params;
            const { fechaInicio, fechaFin } = req.query;

            // Verificar que el usuario sea administrador del taller
            if (req.session.userType !== 'taller' || req.session.userId !== idTaller) {
                return res.status(403).json({
                    error: 'No autorizado para ver ingresos de este taller'
                });
            }

            const ingresos = await pagoService.getIngresosTaller(idTaller, fechaInicio, fechaFin);

            res.json({ ingresos });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
}

module.exports = new PagoController();