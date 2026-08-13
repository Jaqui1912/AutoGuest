/**
 * Servicio de Tickets/Soporte
 * Maneja operaciones relacionadas con tickets de soporte y quejas
 */

const db = require('../config/config/database');
const citaService = require('./citaService');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class TicketService {
    /**
     * Crear un nuevo ticket
     */
    async crearTicket(ticketData) {
        const { idUsuario, titulo, idPedido, categoria, prioridad = 'media' } = ticketData;

        try {
            const idTicket = 'TK-' + Date.now().toString().slice(-6);
            // En la BD actual se usa ticketsoporte con asunto e idCliente
            await db.query(
                'INSERT INTO ticketsoporte (idTicket, asunto, estado, idCliente, idPedido, fecha) VALUES (?, ?, ?, ?, ?, NOW())',
                [idTicket, titulo, 'Abierto', idUsuario, idPedido || null]
            );

            logBusinessOperation('Ticket creado', { idUsuario, titulo, categoria, prioridad });

            return {
                success: true,
                ticket: {
                    idTicket,
                    idCliente: idUsuario,
                    asunto: titulo,
                    estado: 'Abierto'
                }
            };
        } catch (error) {
            logger.error('Error al crear ticket', error, ticketData);
            throw error;
        }
    }

    /**
     * Agregar respuesta a un ticket
     */
    async agregarRespuesta(idTicket, respuestaData) {
        const { idUsuario, contenido, esStaff = false } = respuestaData;

        try {
            // Verificar que el ticket existe
            const [ticketRows] = await db.query(
                'SELECT idTicket, estado FROM ticketsoporte WHERE idTicket = ?',
                [idTicket]
            );

            if (ticketRows.length === 0) {
                return { success: false, error: 'Ticket no encontrado' };
            }

            const ticket = ticketRows[0];

            // Solo permitir respuestas si el ticket está abierto o en progreso
            if (!['Abierto', 'En Progreso'].includes(ticket.estado)) {
                return { success: false, error: 'No se pueden agregar respuestas a tickets cerrados o resueltos' };
            }

            // Agregar respuesta
            const [result] = await db.query(
                'INSERT INTO respuesta_ticket (idTicket, idUsuario, contenido, esStaff, fechaCreacion) VALUES (?, ?, ?, ?, NOW())',
                [idTicket, idUsuario, contenido, esStaff]
            );

            // Si es respuesta de staff, cambiar estado a "En Progreso"
            if (esStaff && ticket.estado === 'Abierto') {
                await db.query(
                    'UPDATE ticketsoporte SET estado = "En Progreso" WHERE idTicket = ?',
                    [idTicket]
                );
            }

            logBusinessOperation('Respuesta agregada al ticket', { idTicket, idUsuario, esStaff });

            return {
                success: true,
                respuesta: {
                    idRespuesta: result.insertId,
                    idTicket,
                    idUsuario,
                    contenido,
                    esStaff,
                    fechaCreacion: new Date()
                }
            };
        } catch (error) {
            logger.error('Error al agregar respuesta al ticket', error, { idTicket, respuestaData });
            throw error;
        }
    }

    /**
     * Obtener tickets del usuario
     */
    async getTicketsUsuario(idUsuario) {
        try {
            const [tickets] = await db.query(`
                SELECT 
                    idticket, 
                    asunto, 
                    estado, 
                    idpedido, 
                    fecha 
                FROM ticketsoporte 
                WHERE idcliente = ?

                UNION ALL

                SELECT 
                    idcita as idticket, 
                    'Comprobante de Pago Servicio: ' || COALESCE(NULLIF(NULLIF(servicio_solicitado, 'undefined'), ''), 'Servicio General') as asunto, 
                    'Finalizado' as estado, 
                    NULL as idpedido, 
                    fechahora as fecha 
                FROM cita 
                WHERE idcliente = ? AND estado = 'Finalizado'

                UNION ALL

                SELECT 
                    idpedido as idticket, 
                    'Comprobante de Pago Pedido: ' || idpedido as asunto, 
                    'Pagado' as estado, 
                    idpedido, 
                    fecha_pedido as fecha 
                FROM pedido 
                WHERE idcliente = ? AND (estado = 'Pagado' OR estado_pago = 'PAGADO')

                ORDER BY fecha DESC
            `, [idUsuario, idUsuario, idUsuario]);

            logDatabaseOperation('SELECT', 'historial_consolidado', { idUsuario, count: tickets.length });

            return tickets;
        } catch (error) {
            logger.error('Error al obtener tickets del usuario', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Obtener detalles de un ticket específico
     */
    async getTicketById(idTicket, idUsuario) {
        try {
            const [tickets] = await db.query(`
                SELECT t.*
                FROM ticketsoporte t
                WHERE t.idTicket = ? AND t.idCliente = ?
            `, [idTicket, idUsuario]);

            if (tickets.length === 0) {
                return null;
            }

            const ticket = tickets[0];
            // No hay respuestas implementadas aún en la base de datos
            ticket.respuestas = [];

            logDatabaseOperation('SELECT', 'ticketsoporte_detalle', { idTicket });

            return ticket;
        } catch (error) {
            logger.error('Error al obtener ticket por ID', error, { idTicket, idUsuario });
            throw error;
        }
    }

    /**
     * Obtener detalles consolidados de un comprobante (Cita, Ticket o Pedido)
     */
    async getConsolidatedTicketDetail(idTicket, idUsuario) {
        try {
            let responseData = {
                ticket: { idTicket, estado: 'No encontrado' },
                tipo: 'General',
                taller: 'AutoGuest',
                fecha: new Date().toLocaleDateString(),
                items: [],
                total: 0,
                moneda: 'MXN'
            };

            if (idTicket.startsWith('CIT')) {
                const cita = await citaService.getCitaDetalle(idTicket);
                const cotizacion = await citaService.getCotizacion(idTicket);

                if (cita) {
                    responseData.ticket.estado = cita.estado;
                    responseData.tipo = 'Servicio de Taller';
                    responseData.taller = cita.tallerNombre;
                    responseData.fecha = cita.fechaHora ? new Date(cita.fechaHora).toLocaleString() : responseData.fecha;
                    
                    if (cotizacion) {
                        responseData.items = (cotizacion.servicios || []).map(s => ({
                            descripcion: s.nombre,
                            cantidad: 1,
                            precio: parseFloat(s.precio || 0),
                            subtotal: parseFloat(s.precio || 0)
                        }));
                        responseData.total = parseFloat(cotizacion.totalAprobado || 0);
                        responseData.moneda = cotizacion.moneda || 'MXN';
                    }
                    return responseData;
                }
            } else if (idTicket.startsWith('TK')) {
                const ticket = await this.getTicketById(idTicket, idUsuario);
                if (ticket) {
                    responseData.ticket.estado = ticket.estado;
                    responseData.tipo = 'Soporte Técnico';
                    responseData.items = [{
                        descripcion: ticket.asunto,
                        cantidad: 1,
                        precio: 0,
                        subtotal: 0
                    }];
                    return responseData;
                }
            } else if (idTicket.startsWith('PED')) {
                const [pedidos] = await db.query('SELECT * FROM pedido WHERE idpedido = ? AND idcliente = ?', [idTicket, idUsuario]);
                if (pedidos.length > 0) {
                    const pedido = pedidos[0];
                    responseData.ticket.estado = pedido.estado || pedido.estado_pago;
                    responseData.tipo = 'Compra de Catálogo';
                    responseData.total = parseFloat(pedido.total_pedido || 0);
                    responseData.fecha = new Date(pedido.fecha_pedido).toLocaleString();
                    
                    const [items] = await db.query('SELECT * FROM lineapedido WHERE idpedido = ?', [idTicket]);
                    responseData.items = items.map(it => ({
                        descripcion: it.nombreProducto || 'Producto',
                        cantidad: it.cantidad,
                        precio: parseFloat(it.precioUnitario || 0),
                        subtotal: parseFloat(it.subtotal || 0)
                    }));
                    return responseData;
                }
            }

            return null; // No encontrado
        } catch (error) {
            logger.error('Error al obtener detalle consolidado', error, { idTicket });
            throw error;
        }
    }

    /**
     * Obtener tickets para staff (todos los tickets)
     */
    async getTicketsStaff(filtros = {}) {
        try {
            let query = `
                SELECT t.*, u.nombre as nombreUsuario
                FROM ticketsoporte t
                JOIN usuario u ON t.idCliente = u.idUsuario
            `;

            let params = [];
            let whereConditions = [];

            if (filtros.estado) {
                whereConditions.push('t.estado = ?');
                params.push(filtros.estado);
            }

            if (whereConditions.length > 0) {
                query += ' WHERE ' + whereConditions.join(' AND ');
            }

            query += ' ORDER BY t.fecha DESC';

            const [tickets] = await db.query(query, params);

            logDatabaseOperation('SELECT', 'ticketsoporte_staff', { filtros, count: tickets.length });

            return tickets;
        } catch (error) {
            logger.error('Error al obtener tickets para staff', error, filtros);
            throw error;
        }
    }

    /**
     * Actualizar estado de un ticket
     */
    async actualizarEstadoTicket(idTicket, nuevoEstado, idUsuarioStaff) {
        try {
            const estadosValidos = ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'];

            if (!estadosValidos.includes(nuevoEstado)) {
                return { success: false, error: 'Estado inválido' };
            }

            const [result] = await db.query(
                'UPDATE ticketsoporte SET estado = ? WHERE idTicket = ?',
                [nuevoEstado, idTicket]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Estado del ticket actualizado', { idTicket, nuevoEstado, idUsuarioStaff });
                return { success: true };
            }

            return { success: false, error: 'Ticket no encontrado' };
        } catch (error) {
            logger.error('Error al actualizar estado del ticket', error, { idTicket, nuevoEstado });
            throw error;
        }
    }

    /**
     * Cerrar ticket (solo el creador)
     */
    async cerrarTicket(idTicket, idUsuario) {
        try {
            const [result] = await db.query(
                'UPDATE ticketsoporte SET estado = "Cerrado" WHERE idTicket = ? AND idCliente = ? AND estado != "Cerrado"',
                [idTicket, idUsuario]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Ticket closed by user', { idTicket, idUsuario });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al cerrar ticket', error, { idTicket, idUsuario });
            throw error;
        }
    }

    /**
     * Obtener estadísticas de tickets
     */
    async getEstadisticasTickets() {
        try {
            const [stats] = await db.query(`
                SELECT
                    COUNT(*) as totalTickets,
                    COUNT(CASE WHEN estado = 'Abierto' THEN 1 END) as ticketsAbiertos,
                    COUNT(CASE WHEN estado = 'En Progreso' THEN 1 END) as ticketsEnProgreso,
                    COUNT(CASE WHEN estado = 'Resuelto' THEN 1 END) as ticketsResueltos,
                    COUNT(CASE WHEN estado = 'Cerrado' THEN 1 END) as ticketsCerrados
                FROM ticketsoporte
            `);

            const estadisticas = stats[0];

            logDatabaseOperation('SELECT', 'estadisticas_ticketsoporte', {});

            return estadisticas;
        } catch (error) {
            logger.error('Error al obtener estadísticas de tickets', error);
            throw error;
        }
    }

    /**
     * Obtener categorías disponibles
     */
    async getCategoriasTickets() {
        try {
            const [categorias] = await db.query(
                'SELECT DISTINCT asunto FROM ticketsoporte WHERE asunto IS NOT NULL ORDER BY asunto ASC'
            );

            return categorias.map(row => row.asunto);
        } catch (error) {
            logger.error('Error al obtener categorías de tickets', error);
            throw error;
        }
    }
}

module.exports = new TicketService();