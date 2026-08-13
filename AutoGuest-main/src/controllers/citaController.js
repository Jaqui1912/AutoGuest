/**
 * Controlador de Citas
 * Maneja las rutas relacionadas con citas
 */

const citaService = require('../services/citaService');
const { logger } = require('../middleware/logger');

class CitaController {
    /**
     * Crear nueva cita
     */
    async createCita(req, res) {
        try {
            const { idTaller, idVehiculo, fecha, hora, servicio } = req.body;
            const idCliente = req.session.userId;

            const result = await citaService.createCita({
                idTaller,
                idVehiculo,
                fecha,
                hora,
                servicio,
                idCliente
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error, citaActiva: result.citaActiva });
            }

            res.status(201).json({
                message: 'Cita creada exitosamente',
                cita: result.cita
            });
        } catch (error) {
            logger.error('Error en createCita controller', error, req.body);
            res.status(500).json({ error: 'Error al crear la cita' });
        }
    }

    /**
     * Obtener citas del cliente actual
     */
    async getCitasCliente(req, res) {
        try {
            const idCliente = req.session.userId;
            const citas = await citaService.getCitasCliente(idCliente);

            res.json(citas);
        } catch (error) {
            logger.error('Error en getCitasCliente controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener citas' });
        }
    }

    /**
     * Obtener citas de un taller (para administradores)
     */
    async getCitasTaller(req, res) {
        try {
            const idTaller = req.params.idTaller || req.tallerId;
            const citas = await citaService.getCitasTaller(idTaller);

            res.json(citas);
        } catch (error) {
            logger.error('Error en getCitasTaller controller', error, { tallerId: req.params.idTaller });
            res.status(500).json({ error: 'Error al obtener citas del taller' });
        }
    }

    /**
     * Actualizar estado de cita
     */
    async updateCitaEstado(req, res) {
        try {
            const { idCita } = req.params;
            const { estado } = req.body;
            const idUsuario = req.session.userId;

            const success = await citaService.updateCitaEstado(idCita, estado, idUsuario);

            if (success) {
                res.json({ message: 'Estado de cita actualizado exitosamente' });
            } else {
                res.status(404).json({ error: 'Cita no encontrada' });
            }
        } catch (error) {
            logger.error('Error en updateCitaEstado controller', error, req.params);
            res.status(500).json({ error: 'Error al actualizar estado de cita' });
        }
    }

    /**
     * Obtener detalles de una cita específica
     */
    async getCitaDetalle(req, res) {
        try {
            const { idCita } = req.params;
            const cita = await citaService.getCitaDetalle(idCita);

            if (!cita) {
                return res.status(404).json({ error: 'Cita no encontrada' });
            }

            res.json(cita);
        } catch (error) {
            logger.error('Error en getCitaDetalle controller', error, req.params);
            res.status(500).json({ error: 'Error al obtener detalle de cita' });
        }
    }

    /**
     * Obtener la cotización con evidencia de una cita
     */
    async getCotizacion(req, res) {
        try {
            const { idCita } = req.params;
            const cotizacion = await citaService.getCotizacion(idCita);

            if (!cotizacion) {
                return res.status(404).json({ error: 'Cotización no encontrada para esta cita' });
            }

            res.json(cotizacion);
        } catch (error) {
            logger.error('Error en getCotizacion controller', error, req.params);
            res.status(500).json({ error: 'Error al obtener la cotización' });
        }
    }

    /**
     * Cancelar cita
     */
    async cancelCita(req, res) {
        try {
            const { idCita } = req.params;
            const idUsuario = req.session.userId;

            const success = await citaService.updateCitaEstado(idCita, 'Cancelada', idUsuario);

            if (success) {
                res.json({ message: 'Cita cancelada exitosamente' });
            } else {
                res.status(404).json({ error: 'Cita no encontrada' });
            }
        } catch (error) {
            logger.error('Error en cancelCita controller', error, req.params);
            res.status(500).json({ error: 'Error al cancelar cita' });
        }
    }
    /**
     * Confirmar la entrega del vehículo por código (pago presencial validado por taller)
     */
    async confirmarEntregaCodigo(req, res) {
        try {
            const { idCita } = req.params;
            const { codigo } = req.body;
            
            const db = require('../config/config/database');
            const [citas] = await db.query('SELECT codigo_pago_efectivo FROM cita WHERE idCita = ?', [idCita]);
            
            if (citas.length === 0) {
                return res.status(404).json({ error: 'Cita no encontrada' });
            }
            
            const dbCode = citas[0].codigo_pago_efectivo || citas[0].codigoPagoEfectivo;
            
            if (!dbCode || String(dbCode).trim().toUpperCase() !== String(codigo).trim().toUpperCase()) {
                return res.status(400).json({ error: 'Código de liberación inválido o no generado aún.' });
            }
            
            // Si coincide, marcar cita como finalizada y la cotización como pagada
            await db.query("UPDATE cita SET estado = 'Finalizado', metodo_pago = 'EFECTIVO' WHERE idCita = ?", [idCita]);
            await db.query("UPDATE cotizacion SET estado_pago = 'PAGADO' WHERE idCita = ?", [idCita]);
            
            res.json({ success: true, message: 'Vehículo liberado exitosamente.' });
            
        } catch (error) {
            const { logger } = require('../middleware/logger');
            logger.error('Error en confirmarEntregaCodigo', error, req.params);
            res.status(500).json({ error: 'Error interno del servidor al verificar código.' });
        }
    }
}

module.exports = new CitaController();