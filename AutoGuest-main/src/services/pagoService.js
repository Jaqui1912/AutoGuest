/**
 * Servicio de Pagos
 * Maneja operaciones relacionadas con pagos y transacciones
 */

const db = require('../config/config/database');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class PagoService {
    /**
     * Crear un nuevo pago
     */
    async createPago(pagoData) {
        const { idCita, monto, metodoPago, descripcion, idUsuario } = pagoData;

        try {
            // Verificar que la cita existe y pertenece al usuario
            const [citaRows] = await db.query(
                'SELECT idCita, estado, costoEstimado FROM cita WHERE idCita = ? AND idCliente = ?',
                [idCita, idUsuario]
            );

            if (citaRows.length === 0) {
                return { success: false, error: 'Cita no encontrada' };
            }

            const cita = citaRows[0];

            // Verificar que el monto no exceda el costo estimado (con tolerancia del 10%)
            const maxMonto = cita.costoEstimado * 1.1;
            if (monto > maxMonto) {
                return { success: false, error: 'Monto excede el límite permitido para esta cita' };
            }

            // Crear pago
            const [result] = await db.query(
                'INSERT INTO pago (idCita, monto, metodoPago, descripcion, estado, fechaCreacion) VALUES (?, ?, ?, ?, "Pendiente", NOW())',
                [idCita, monto, metodoPago, descripcion || null]
            );

            logBusinessOperation('Pago creado', { idCita, monto, metodoPago });

            return {
                success: true,
                pago: {
                    idPago: result.insertId,
                    idCita,
                    monto,
                    metodoPago,
                    descripcion,
                    estado: 'Pendiente'
                }
            };
        } catch (error) {
            logger.error('Error al crear pago', error, pagoData);
            throw error;
        }
    }

    /**
     * Procesar un pago (simular procesamiento)
     */
    async procesarPago(idPago, idUsuario) {
        try {
            // Verificar que el pago existe y pertenece al usuario
            const [pagoRows] = await db.query(`
                SELECT p.*, c.idCliente
                FROM pago p
                JOIN cita c ON p.idCita = c.idCita
                WHERE p.idPago = ? AND c.idCliente = ?
            `, [idPago, idUsuario]);

            if (pagoRows.length === 0) {
                return { success: false, error: 'Pago no encontrado' };
            }

            const pago = pagoRows[0];

            if (pago.estado !== 'Pendiente') {
                return { success: false, error: 'El pago ya ha sido procesado' };
            }

            // Simular procesamiento de pago (en producción integrar con pasarela)
            const exito = Math.random() > 0.1; // 90% de éxito

            const nuevoEstado = exito ? 'Completado' : 'Fallido';
            const fechaProcesamiento = new Date();

            await db.query(
                'UPDATE pago SET estado = ?, fechaProcesamiento = ? WHERE idPago = ?',
                [nuevoEstado, fechaProcesamiento, idPago]
            );

            logBusinessOperation('Pago procesado', { idPago, estado: nuevoEstado, exito });

            return {
                success: exito,
                pago: {
                    idPago,
                    estado: nuevoEstado,
                    fechaProcesamiento
                }
            };
        } catch (error) {
            logger.error('Error al procesar pago', error, { idPago, idUsuario });
            throw error;
        }
    }

    /**
     * Obtener pagos de un usuario
     */
    async getPagosUsuario(idUsuario) {
        try {
            const [pagos] = await db.query(`
                SELECT p.*, c.fecha as fechaCita, t.nombre as nombreTaller
                FROM pago p
                JOIN cita c ON p.idCita = c.idCita
                JOIN taller t ON c.idTaller = t.idTaller
                WHERE c.idCliente = ?
                ORDER BY p.fechaCreacion DESC
            `, [idUsuario]);

            logDatabaseOperation('SELECT', 'pago', { idUsuario, count: pagos.length });

            return pagos;
        } catch (error) {
            logger.error('Error al obtener pagos del usuario', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Obtener pagos de un taller
     */
    async getPagosTaller(idTaller) {
        try {
            const [pagos] = await db.query(`
                SELECT p.*, c.fecha as fechaCita, u.nombre as nombreCliente
                FROM pago p
                JOIN cita c ON p.idCita = c.idCita
                JOIN usuario u ON c.idCliente = u.idUsuario
                WHERE c.idTaller = ?
                ORDER BY p.fechaCreacion DESC
            `, [idTaller]);

            logDatabaseOperation('SELECT', 'pago', { idTaller, count: pagos.length });

            return pagos;
        } catch (error) {
            logger.error('Error al obtener pagos del taller', error, { idTaller });
            throw error;
        }
    }

    /**
     * Obtener detalles de un pago específico
     */
    async getPagoById(idPago, idUsuario) {
        try {
            const [pagos] = await db.query(`
                SELECT p.*, c.fecha as fechaCita, c.servicio, t.nombre as nombreTaller
                FROM pago p
                JOIN cita c ON p.idCita = c.idCita
                JOIN taller t ON c.idTaller = t.idTaller
                WHERE p.idPago = ? AND c.idCliente = ?
            `, [idPago, idUsuario]);

            if (pagos.length === 0) {
                return null;
            }

            logDatabaseOperation('SELECT', 'pago', { idPago });

            return pagos[0];
        } catch (error) {
            logger.error('Error al obtener pago por ID', error, { idPago, idUsuario });
            throw error;
        }
    }

    /**
     * Calcular ingresos de un taller en un período
     */
    async getIngresosTaller(idTaller, fechaInicio, fechaFin) {
        try {
            const [result] = await db.query(`
                SELECT
                    COUNT(*) as totalPagos,
                    SUM(monto) as totalIngresos,
                    AVG(monto) as promedioPago,
                    MIN(monto) as pagoMinimo,
                    MAX(monto) as pagoMaximo
                FROM pago p
                JOIN cita c ON p.idCita = c.idCita
                WHERE c.idTaller = ? AND p.estado = 'Completado'
                    AND p.fechaProcesamiento BETWEEN ? AND ?
            `, [idTaller, fechaInicio, fechaFin]);

            const stats = result[0];
            if (stats.totalIngresos) {
                stats.totalIngresos = parseFloat(stats.totalIngresos).toFixed(2);
                stats.promedioPago = parseFloat(stats.promedioPago).toFixed(2);
            }

            logDatabaseOperation('SELECT', 'estadisticas_pago', { idTaller, fechaInicio, fechaFin });

            return stats;
        } catch (error) {
            logger.error('Error al calcular ingresos del taller', error, { idTaller, fechaInicio, fechaFin });
            throw error;
        }
    }

    /**
     * Reembolsar un pago
     */
    async reembolsarPago(idPago, idUsuario, razon) {
        try {
            // Verificar que el pago existe y pertenece al usuario
            const pago = await this.getPagoById(idPago, idUsuario);

            if (!pago) {
                return { success: false, error: 'Pago no encontrado' };
            }

            if (pago.estado !== 'Completado') {
                return { success: false, error: 'Solo se pueden reembolsar pagos completados' };
            }

            // Verificar que no haya pasado más de 30 días
            const fechaPago = new Date(pago.fechaProcesamiento);
            const ahora = new Date();
            const diasTranscurridos = (ahora - fechaPago) / (1000 * 60 * 60 * 24);

            if (diasTranscurridos > 30) {
                return { success: false, error: 'El período de reembolso ha expirado (30 días)' };
            }

            // Actualizar estado del pago
            await db.query(
                'UPDATE pago SET estado = "Reembolsado", fechaReembolso = NOW() WHERE idPago = ?',
                [idPago]
            );

            logBusinessOperation('Pago reembolsado', { idPago, razon });

            return {
                success: true,
                pago: {
                    idPago,
                    estado: 'Reembolsado',
                    fechaReembolso: new Date()
                }
            };
        } catch (error) {
            logger.error('Error al reembolsar pago', error, { idPago, idUsuario });
            throw error;
        }
    }
}

module.exports = new PagoService();