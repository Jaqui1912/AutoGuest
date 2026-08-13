/**
 * Servicio de Vehículos
 * Maneja todas las operaciones relacionadas con vehículos
 */

const db = require('../config/config/database');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');
const { nanoid } = require('nanoid');

class VehiculoService {
    /**
     * Obtiene vehículos de un usuario
     */
    async getVehiculosUsuario(idUsuario) {
        try {
            const [vehiculos] = await db.query(`
                SELECT v.idVehiculo, v.marca, v.modelo, v.anio, v.placa,
                       COUNT(c.idCita) as totalCitas,
                       MAX(c.fechaHora) as ultimaCita
                FROM vehiculo v
                LEFT JOIN cita c ON v.idVehiculo = c.idVehiculo
                WHERE v.idDuenio = ?
                GROUP BY v.idVehiculo, v.marca, v.modelo, v.anio, v.placa
                ORDER BY v.marca, v.modelo
            `, [idUsuario]);

            logDatabaseOperation('SELECT', 'vehiculo', { idUsuario, count: vehiculos.length });

            return vehiculos;
        } catch (error) {
            logger.error('Error al obtener vehículos del usuario', error, { idUsuario });
            throw error;
        }
    }

    /**
     * Obtiene un vehículo por ID
     */
    async getVehiculoById(idVehiculo) {
        try {
            const [vehiculos] = await db.query(
                'SELECT * FROM vehiculo WHERE idVehiculo = ?',
                [idVehiculo]
            );

            logDatabaseOperation('SELECT', 'vehiculo', { idVehiculo, found: vehiculos.length > 0 });

            return vehiculos.length > 0 ? vehiculos[0] : null;
        } catch (error) {
            logger.error('Error al obtener vehículo por ID', error, { idVehiculo });
            throw error;
        }
    }

    /**
     * Crea un nuevo vehículo
     */
    async createVehiculo(vehiculoData) {
        const { marca, modelo, anio, placa, color, kilometraje, idUsuario } = vehiculoData;

        try {
            // Verificar si la placa ya existe
            const [existing] = await db.query('SELECT idVehiculo FROM vehiculo WHERE placa = ?', [placa]);
            if (existing.length > 0) {
                return { success: false, error: 'Ya existe un vehículo con esta placa' };
            }

            // Generate a nanoid since PostgreSQL doesn't auto-increment this column
            const idVehiculo = 'VEH' + nanoid(8);

            const [result] = await db.query(
                'INSERT INTO vehiculo (idVehiculo, marca, modelo, anio, placa, idDuenio) VALUES (?, ?, ?, ?, ?, ?)',
                [idVehiculo, marca, modelo, anio, placa, idUsuario]
            );

            logBusinessOperation('Vehículo creado', { idVehiculo, placa, marca, modelo });

            return {
                success: true,
                vehiculo: {
                    idVehiculo,
                    marca,
                    modelo,
                    anio,
                    placa,
                    idUsuario
                }
            };
        } catch (error) {
            logger.error('Error al crear vehículo', error, vehiculoData);
            throw error;
        }
    }

    /**
     * Actualiza un vehículo
     */
    async updateVehiculo(idVehiculo, updateData) {
        const { marca, modelo, anio, placa } = updateData;

        try {
            // Verificar que el vehículo existe
            const vehiculo = await this.getVehiculoById(idVehiculo);
            if (!vehiculo) {
                return { success: false, error: 'Vehículo no encontrado' };
            }

            // Si se está cambiando la placa, verificar que no exista
            if (placa && placa !== vehiculo.placa) {
                const [existing] = await db.query('SELECT idVehiculo FROM vehiculo WHERE placa = ? AND idVehiculo != ?', [placa, idVehiculo]);
                if (existing.length > 0) {
                    return { success: false, error: 'Ya existe otro vehículo con esta placa' };
                }
            }

            const [result] = await db.query(
                'UPDATE vehiculo SET marca = ?, modelo = ?, anio = ?, placa = ? WHERE idVehiculo = ?',
                [marca, modelo, anio, placa, idVehiculo]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Vehículo actualizado', { idVehiculo, campos: Object.keys(updateData) });
                return {
                    success: true,
                    vehiculo: {
                        idVehiculo: idVehiculo,
                        marca,
                        modelo,
                        anio,
                        placa
                    }
                };
            }

            return { success: false, error: 'No se pudo actualizar el vehículo' };
        } catch (error) {
            logger.error('Error al actualizar vehículo', error, { idVehiculo, updateData });
            throw error;
        }
    }

    /**
     * Elimina un vehículo
     */
    async deleteVehiculo(idVehiculo, idUsuario) {
        try {
            // Verificar que el vehículo pertenece al usuario
            const vehiculo = await this.getVehiculoById(idVehiculo);
            if (!vehiculo) {
                return { success: false, error: 'Vehículo no encontrado' };
            }

            if (String(vehiculo.idDuenio) !== String(idUsuario)) {
                return { success: false, error: 'No tienes permiso para eliminar este vehículo' };
            }

            // Verificar que no tenga citas activas
            const [citasActivas] = await db.query(
                'SELECT COUNT(*) as count FROM cita WHERE idVehiculo = ? AND estado IN ("Pendiente", "En Proceso", "Cotizado")',
                [idVehiculo]
            );

            if (citasActivas[0].count > 0) {
                return { success: false, error: 'No se puede eliminar un vehículo con citas activas' };
            }

            const [result] = await db.query('DELETE FROM vehiculo WHERE idVehiculo = ?', [idVehiculo]);

            if (result.affectedRows > 0) {
                logBusinessOperation('Vehículo eliminado', { idVehiculo, placa: vehiculo.placa });
                return { success: true };
            }

            return { success: false, error: 'No se pudo eliminar el vehículo' };
        } catch (error) {
            logger.error('Error al eliminar vehículo', error, { idVehiculo, idUsuario });
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de vehículos por taller
     */
    async getVehiculosStatsTaller(idTaller) {
        try {
            const [stats] = await db.query(`
                SELECT
                    COUNT(DISTINCT v.idVehiculo) as totalVehiculos,
                    COUNT(DISTINCT v.marca) as marcasDistintas,
                    AVG(v.anio) as promedioAnio
                FROM vehiculo v
                JOIN cita c ON v.idVehiculo = c.idVehiculo
                JOIN mecanico m ON c.idMecanico = m.idUsuario
                WHERE m.idTaller = ?
            `, [idTaller]);

            logDatabaseOperation('SELECT', 'estadisticas_vehiculos', { idTaller });

            return stats[0];
        } catch (error) {
            logger.error('Error al obtener estadísticas de vehículos', error, { idTaller });
            throw error;
        }
    }

    /**
     * Busca vehículos por placa o marca/modelo
     */
    async searchVehiculos(searchTerm, idTaller = null) {
        try {
            let query = `
                SELECT v.*, u.nombre as propietarioNombre
                FROM vehiculo v
                JOIN usuario u ON v.idUsuario = u.idUsuario
                WHERE (v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ?)
            `;
            let params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

            if (idTaller) {
                query += ` AND EXISTS (
                    SELECT 1 FROM cita c
                    JOIN mecanico m ON c.idMecanico = m.idUsuario
                    WHERE c.idVehiculo = v.idVehiculo AND m.idTaller = ?
                )`;
                params.push(idTaller);
            }

            query += ' ORDER BY v.marca, v.modelo LIMIT 50';

            const [vehiculos] = await db.query(query, params);

            logDatabaseOperation('SELECT', 'vehiculo_search', { searchTerm, idTaller, count: vehiculos.length });

            return vehiculos;
        } catch (error) {
            logger.error('Error al buscar vehículos', error, { searchTerm, idTaller });
            throw error;
        }
    }
}

module.exports = new VehiculoService();