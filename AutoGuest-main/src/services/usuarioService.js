/**
 * Servicio de Usuarios
 * Maneja todas las operaciones relacionadas con usuarios, clientes, talleres y mecánicos
 */

const db = require('../config/config/database');
const bcrypt = require('bcryptjs');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class UsuarioService {
    /**
     * Obtiene información de un usuario por ID
     */
    async getUsuarioById(idUsuario) {
        try {
            const [usuarios] = await db.query(
                'SELECT idUsuario, nombre, email, telefono, foto_perfil, fecha_registro FROM usuario WHERE idUsuario = ?',
                [idUsuario]
            );

            logDatabaseOperation('SELECT', 'usuario', { idUsuario, found: usuarios.length > 0 });

            return usuarios.length > 0 ? usuarios[0] : null;
        } catch (error) {
            logger.error('Error al obtener usuario por ID', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Obtiene información de un usuario por email
     */
    async getUsuarioByEmail(email) {
        try {
            const [usuarios] = await db.query(
                'SELECT idUsuario, nombre, email, password, rol FROM usuario WHERE email = ?',
                [email]
            );

            logDatabaseOperation('SELECT', 'usuario', { email, found: usuarios.length > 0 });

            return usuarios.length > 0 ? usuarios[0] : null;
        } catch (error) {
            logger.error('Error al obtener usuario por email', error, { email });
            throw error;
        }
    }

    /**
     * Crea un nuevo usuario
     */
    async createUsuario(userData) {
        const { nombre, email, password, rol = 'cliente' } = userData;

        try {
            // Verificar si el email ya existe
            const existingUser = await this.getUsuarioByEmail(email);
            if (existingUser) {
                return { success: false, error: 'El email ya está registrado' };
            }

            // Hash de la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insertar usuario
            const [result] = await db.query(
                'INSERT INTO usuario (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
                [nombre, email, hashedPassword, rol]
            );

            const idUsuario = result.insertId;

            logBusinessOperation('Usuario creado', { idUsuario, email, rol });

            return {
                success: true,
                usuario: {
                    idUsuario,
                    nombre,
                    email,
                    rol
                }
            };
        } catch (error) {
            logger.error('Error al crear usuario', error, { email, rol });
            throw error;
        }
    }

    /**
     * Verifica las credenciales de un usuario
     */
    async verifyCredentials(email, password) {
        try {
            const usuario = await this.getUsuarioByEmail(email);
            if (!usuario) {
                return { success: false, error: 'Usuario no encontrado' };
            }

            const isValidPassword = await bcrypt.compare(password, usuario.password);
            if (!isValidPassword) {
                return { success: false, error: 'Contraseña incorrecta' };
            }

            logBusinessOperation('Login exitoso', { email, rol: usuario.rol });

            return {
                success: true,
                usuario: {
                    idUsuario: usuario.idUsuario,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol
                }
            };
        } catch (error) {
            logger.error('Error al verificar credenciales', error, { email });
            throw error;
        }
    }

    /**
     * Obtiene información de un taller por ID de administrador
     */
    async getTallerByAdminId(idAdmin) {
        try {
            const [talleres] = await db.query(
                'SELECT t.*, u.nombre as adminNombre FROM taller t JOIN administrador a ON t.idTaller = a.idTaller JOIN usuario u ON a.idUsuario = u.idUsuario WHERE a.idUsuario = ?',
                [idAdmin]
            );

            logDatabaseOperation('SELECT', 'taller', { idAdmin, found: talleres.length > 0 });

            return talleres.length > 0 ? talleres[0] : null;
        } catch (error) {
            logger.error('Error al obtener taller por admin ID', error, { idAdmin });
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de un taller
     */
    async getTallerStats(idTaller) {
        try {
            // Estadísticas generales
            const [stats] = await db.query(`
                SELECT
                    COUNT(DISTINCT c.idCliente) as totalClientes,
                    COUNT(c.idCita) as totalCitas,
                    COUNT(CASE WHEN c.estado = 'Completada' THEN 1 END) as citasCompletadas,
                    COUNT(CASE WHEN c.estado = 'Pendiente' THEN 1 END) as citasPendientes,
                    COUNT(m.idUsuario) as totalMecanicos
                FROM taller t
                LEFT JOIN mecanico m ON t.idTaller = m.idTaller
                LEFT JOIN cita c ON t.idTaller = c.idTaller
                WHERE t.idTaller = ?
                GROUP BY t.idTaller
            `, [idTaller]);

            // Ingresos del mes actual
            const [ingresos] = await db.query(`
                SELECT COALESCE(SUM(p.monto), 0) as ingresosMes
                FROM pago p
                JOIN cita c ON p.idCita = c.idCita
                WHERE c.idTaller = ?
                  AND MONTH(p.fechaPago) = MONTH(CURRENT_DATE())
                  AND YEAR(p.fechaPago) = YEAR(CURRENT_DATE())
            `, [idTaller]);

            const estadisticas = {
                ...stats[0],
                ingresosMes: ingresos[0].ingresosMes
            };

            logDatabaseOperation('SELECT', 'estadisticas_taller', { idTaller });

            return estadisticas;
        } catch (error) {
            logger.error('Error al obtener estadísticas del taller', error, { idTaller });
            throw error;
        }
    }

    /**
     * Obtiene clientes de un taller
     */
    async getClientesTaller(idTaller) {
        try {
            const [clientes] = await db.query(`
                SELECT DISTINCT u.idUsuario, u.nombre, u.email, u.telefono,
                       COUNT(c.idCita) as totalCitas,
                       MAX(c.fechaHora) as ultimaCita
                FROM usuario u
                JOIN cliente cl ON u.idUsuario = cl.idUsuario
                JOIN cita c ON cl.idUsuario = c.idCliente
                JOIN mecanico m ON c.idMecanico = m.idUsuario
                WHERE m.idTaller = ?
                GROUP BY u.idUsuario, u.nombre, u.email, u.telefono
                ORDER BY totalCitas DESC
            `, [idTaller]);

            logDatabaseOperation('SELECT', 'clientes_taller', { idTaller, count: clientes.length });

            return clientes;
        } catch (error) {
            logger.error('Error al obtener clientes del taller', error, { idTaller });
            throw error;
        }
    }

    /**
     * Actualiza el perfil de un usuario
     */
    async updatePerfil(idUsuario, updateData) {
        const { nombre, email, telefono } = updateData;

        try {
            const [result] = await db.query(
                'UPDATE usuario SET nombre = ?, email = ?, telefono = ? WHERE idUsuario = ?',
                [nombre, email, telefono, idUsuario]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Perfil actualizado', { idUsuario, campos: Object.keys(updateData) });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al actualizar perfil', error, { idUsuario, updateData });
            throw error;
        }
    }

    /**
     * Obtiene mecánicos de un taller
     */
    async getMecanicosTaller(idTaller) {
        try {
            const [mecanicos] = await db.query(`
                SELECT u.idUsuario, u.nombre, u.email, u.telefono,
                       COUNT(c.idCita) as citasAsignadas,
                       COUNT(CASE WHEN c.estado = 'Completada' THEN 1 END) as citasCompletadas
                FROM usuario u
                JOIN mecanico m ON u.idUsuario = m.idUsuario
                LEFT JOIN cita c ON m.idUsuario = c.idMecanico
                WHERE m.idTaller = ?
                GROUP BY u.idUsuario, u.nombre, u.email, u.telefono
                ORDER BY u.nombre
            `, [idTaller]);

            logDatabaseOperation('SELECT', 'mecanicos_taller', { idTaller, count: mecanicos.length });

            return mecanicos;
        } catch (error) {
            logger.error('Error al obtener mecánicos del taller', error, { idTaller });
            throw error;
        }
    }
}

module.exports = new UsuarioService();