/**
 * Servicio de Citas
 * Maneja todas las operaciones relacionadas con citas
 */

const db = require('../config/config/database');
const { nanoid } = require('nanoid');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class CitaService {
    /**
     * Verifica si un cliente existe, si no, lo crea
     */
    async ensureClienteExists(idUsuario) {
        try {
            const [clienteExists] = await db.query('SELECT idUsuario FROM cliente WHERE idUsuario = ?', [idUsuario]);

            if (clienteExists.length === 0) {
                logBusinessOperation('Cliente creado automáticamente', { idUsuario });
                await db.query('INSERT INTO cliente (idUsuario) VALUES (?)', [idUsuario]);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al verificar/crear cliente', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Verifica si un vehículo tiene citas activas
     */
    async checkActiveAppointments(idVehiculo) {
        try {
            const [citasActivas] = await db.query(`
                SELECT c.idCita, c.estado, c.fechaHora, t.nombre as tallerNombre
                FROM cita c
                JOIN taller t ON c.idTaller = t.idTaller
                WHERE c.idVehiculo = ?
                  AND c.estado IN ('Pendiente', 'Pendiente de Cotización', 'Cotizado', 'En Proceso')
                ORDER BY c.fechaHora DESC
                LIMIT 1
            `, [idVehiculo]);

            logDatabaseOperation('SELECT', 'cita', { idVehiculo, found: citasActivas.length });

            return citasActivas.length > 0 ? citasActivas[0] : null;
        } catch (error) {
            logger.error('Error al verificar citas activas', error, { idVehiculo });
            throw error;
        }
    }

    /**
     * Asigna un mecánico aleatorio de un taller
     */
    async assignRandomMechanic(idTaller) {
        try {
            const [mecanicos] = await db.query('SELECT idUsuario FROM mecanico WHERE idTaller = ?', [idTaller]);

            if (mecanicos.length === 0) {
                logger.warn('No hay mecánicos disponibles en el taller', { idTaller });
                return null;
            }

            const random = Math.floor(Math.random() * mecanicos.length);
            const idMecanico = mecanicos[random].idUsuario;

            logBusinessOperation('Mecánico asignado aleatoriamente', { idTaller, idMecanico });
            return idMecanico;
        } catch (error) {
            logger.error('Error al asignar mecánico', error, { idTaller });
            throw error;
        }
    }

    /**
     * Valida el horario del taller
     */
    async validateTallerSchedule(idTaller, fecha, hora) {
        try {
            const [tallerRows] = await db.query('SELECT horario FROM taller WHERE idTaller = ?', [idTaller]);

            if (tallerRows.length === 0 || !tallerRows[0].horario) {
                return { valid: true }; // No hay horario configurado, permitir
            }

            const schedule = JSON.parse(tallerRows[0].horario);
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const dateObj = new Date(`${fecha}T12:00:00`);
            const dayName = dayNames[dateObj.getDay()];

            const dayConfig = schedule[dayName];
            if (!dayConfig) {
                return { valid: true }; // No hay configuración para este día
            }

            if (dayConfig.closed) {
                return {
                    valid: false,
                    error: `El taller está cerrado los días ${dayName}.`
                };
            }

            if (hora < dayConfig.open || hora > dayConfig.close) {
                return {
                    valid: false,
                    error: `Cita fuera de horario. El taller abre de ${dayConfig.open} a ${dayConfig.close} los días ${dayName}.`
                };
            }

            return { valid: true };
        } catch (error) {
            logger.error('Error al validar horario del taller', error, { idTaller, fecha, hora });
            return { valid: true }; // En caso de error, permitir la cita
        }
    }

    /**
     * Crea una nueva cita
     */
    async createCita(citaData) {
        const { idTaller, idVehiculo, fecha, hora, servicio, idCliente } = citaData;

        try {
            // Asegurar que el cliente existe
            await this.ensureClienteExists(idCliente);

            // Verificar citas activas
            const citaActiva = await this.checkActiveAppointments(idVehiculo);
            if (citaActiva) {
                return {
                    success: false,
                    error: 'Este vehículo ya tiene una cita activa',
                    citaActiva
                };
            }

            // Asignar mecánico
            const idMecanico = await this.assignRandomMechanic(idTaller);

            // Validar horario
            const scheduleValidation = await this.validateTallerSchedule(idTaller, fecha, hora);
            if (!scheduleValidation.valid) {
                return {
                    success: false,
                    error: scheduleValidation.error
                };
            }

            // Crear cita
            const idCita = 'CIT' + nanoid(5);
            const fechaHora = `${fecha} ${hora}:00`;

            await db.query(
                'INSERT INTO cita (idCita, fechaHora, estado, idCliente, idVehiculo, idMecanico, idTaller, servicio_solicitado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [idCita, fechaHora, 'Pendiente', idCliente, idVehiculo, idMecanico, idTaller, servicio]
            );

            logBusinessOperation('Cita creada', { idCita, idCliente, idTaller, servicio });

            return {
                success: true,
                cita: {
                    idCita,
                    fechaHora,
                    estado: 'Pendiente',
                    idCliente,
                    idVehiculo,
                    idMecanico,
                    idTaller,
                    servicio_solicitado: servicio
                }
            };
        } catch (error) {
            logger.error('Error al crear cita', error, citaData);
            throw error;
        }
    }

    /**
     * Obtiene citas de un cliente
     */
    async getCitasCliente(idCliente) {
        try {
            const [citas] = await db.query(`
                SELECT
                    c.idCita,
                    c.fechaHora,
                    c.estado,
                    c.servicio_solicitado AS servicio,
                    c.idVehiculo,
                    v.marca AS vehiculoMarca,
                    v.modelo AS vehiculoModelo,
                    v.placa AS vehiculoPlaca,
                    t.nombre AS tallerNombre,
                    t.direccion AS tallerDireccion,
                    u.nombre AS mecanicoNombre
                FROM cita c
                JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
                JOIN taller t ON c.idTaller = t.idTaller
                LEFT JOIN usuario u ON c.idMecanico = u.idUsuario
                WHERE c.idCliente = ?
                ORDER BY c.fechaHora DESC
            `, [idCliente]);

            logDatabaseOperation('SELECT', 'cita', { idCliente, count: citas.length });

            return citas;
        } catch (error) {
            logger.error('Error al obtener citas del cliente', error, { idCliente });
            throw error;
        }
    }

    /**
     * Obtiene citas de un taller
     */
    async getCitasTaller(idTaller) {
        try {
            const [citas] = await db.query(`
                SELECT
                    c.idCita,
                    c.fechaHora,
                    c.estado,
                    c.servicio_solicitado,
                    u.nombre as clienteNombre,
                    u.email as clienteEmail,
                    v.marca,
                    v.modelo,
                    v.placa,
                    mu.nombre as mecanicoNombre
                FROM cita c
                JOIN cliente cl ON c.idCliente = cl.idUsuario
                JOIN usuario u ON cl.idUsuario = u.idUsuario
                JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
                LEFT JOIN usuario mu ON c.idMecanico = mu.idUsuario
                WHERE c.idTaller = ?
                ORDER BY c.fechaHora DESC
            `, [idTaller]);

            logDatabaseOperation('SELECT', 'cita', { idTaller, count: citas.length });

            return citas;
        } catch (error) {
            logger.error('Error al obtener citas del taller', error, { idTaller });
            throw error;
        }
    }

    /**
     * Obtiene el detalle de una cita específica
     */
    async getCitaDetalle(idCita) {
        try {
            const [rows] = await db.query(`
                SELECT
                    c.idCita,
                    c.fechaHora,
                    c.estado,
                    c.servicio_solicitado AS servicio,
                    c.servicio_solicitado AS motivo,
                    c.idVehiculo,
                    v.marca AS vehiculoMarca,
                    v.modelo AS vehiculoModelo,
                    v.placa AS vehiculoPlaca,
                    t.idTaller,
                    t.nombre AS tallerNombre,
                    t.direccion AS tallerDireccion,
                    t.telefono_contacto AS tallerTelefono,
                    u.nombre AS mecanicoNombre
                FROM cita c
                JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
                JOIN taller t ON c.idTaller = t.idTaller
                LEFT JOIN usuario u ON c.idMecanico = u.idUsuario
                WHERE c.idCita = ?
                LIMIT 1
            `, [idCita]);

            logDatabaseOperation('SELECT', 'cita', { idCita, found: rows.length });

            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            logger.error('Error al obtener detalle de cita', error, { idCita });
            throw error;
        }
    }

    /**
     * Obtiene la cotización con evidencia de una cita
     */
    async getCotizacion(idCita) {
        try {
            // 1. Obtener la cotización
            const [cotizaciones] = await db.query(`
                SELECT c.*, e.urlarchivo AS evidenciaBase64
                FROM cotizacion c
                LEFT JOIN evidencia e ON c.idCotizacion = e.idcotizacion
                WHERE c.idCita = ?
                ORDER BY c.idCotizacion DESC
                LIMIT 1
            `, [idCita]);

            if (cotizaciones.length === 0) return null;
            const cotizacion = cotizaciones[0];

            // 2. Obtener los servicios de la cotización
            const [servicios] = await db.query(`
                SELECT cs.precio, s.nombre, s.descripcion 
                FROM cotizacion_servicios cs 
                JOIN servicio s ON cs.idServicio = s.idServicio 
                WHERE cs.idCotizacion = ?
            `, [cotizacion.idCotizacion]);

            cotizacion.servicios = servicios;

            logDatabaseOperation('SELECT', 'cotizacion', { idCita, idCotizacion: cotizacion.idCotizacion });
            
            return cotizacion;
        } catch (error) {
            logger.error('Error al obtener la cotización', error, { idCita });
            throw error;
        }
    }

    /**
     * Actualiza el estado de una cita
     */
    async updateCitaEstado(idCita, nuevoEstado, idUsuario = null) {
        try {
            const [result] = await db.query(
                'UPDATE cita SET estado = ? WHERE idCita = ?',
                [nuevoEstado, idCita]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Estado de cita actualizado', { idCita, nuevoEstado, idUsuario });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al actualizar estado de cita', error, { idCita, nuevoEstado });
            throw error;
        }
    }
}

module.exports = new CitaService();