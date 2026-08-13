/**
 * Controlador de Vehículos
 * Maneja las rutas relacionadas con vehículos
 */

const vehiculoService = require('../services/vehiculoService');
const { logger } = require('../middleware/logger');

class VehiculoController {
    /**
     * Obtener vehículos del usuario actual
     */
    async getVehiculosUsuario(req, res) {
        try {
            const idUsuario = req.session.userId;
            console.log('[DEBUG] getVehiculosUsuario called with userId:', idUsuario);
            const vehiculos = await vehiculoService.getVehiculosUsuario(idUsuario);
            console.log('[DEBUG] vehicles found:', vehiculos.length);
            res.json(vehiculos);
        } catch (error) {
            console.error('[ERROR] getVehiculosUsuario error:', error.message);
            logger.error('Error en getVehiculosUsuario controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener vehículos' });
        }
    }

    /**
     * Crear nuevo vehículo
     */
    async createVehiculo(req, res) {
        try {
            const { marca, modelo, anio, placa } = req.body;
            const idUsuario = req.session.userId;

            const result = await vehiculoService.createVehiculo({
                marca,
                modelo,
                anio,
                placa,
                idUsuario
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.status(201).json({
                message: 'Vehículo creado exitosamente',
                vehiculo: result.vehiculo
            });
        } catch (error) {
            logger.error('Error en createVehiculo controller', error, req.body);
            res.status(500).json({ error: 'Error al crear vehículo' });
        }
    }

    /**
     * Actualizar vehículo
     */
    async updateVehiculo(req, res) {
        try {
            const { idVehiculo } = req.params;
            const { marca, modelo, anio, placa } = req.body;

            const result = await vehiculoService.updateVehiculo(idVehiculo, {
                marca,
                modelo,
                anio,
                placa
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({
                message: 'Vehículo actualizado exitosamente',
                vehiculo: result.vehiculo
            });
        } catch (error) {
            logger.error('Error en updateVehiculo controller', error, req.params);
            res.status(500).json({ error: 'Error al actualizar vehículo' });
        }
    }

    /**
     * Eliminar vehículo
     */
    async deleteVehiculo(req, res) {
        try {
            const { idVehiculo } = req.params;
            const idUsuario = req.session.userId;

            const result = await vehiculoService.deleteVehiculo(idVehiculo, idUsuario);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({ message: 'Vehículo eliminado exitosamente' });
        } catch (error) {
            logger.error('Error en deleteVehiculo controller', error, req.params);
            res.status(500).json({ error: 'Error al eliminar vehículo' });
        }
    }

    /**
     * Obtener detalles de un vehículo específico
     */
    async getVehiculoDetalle(req, res) {
        try {
            const { idVehiculo } = req.params;
            const vehiculo = await vehiculoService.getVehiculoById(idVehiculo);

            if (!vehiculo) {
                return res.status(404).json({ error: 'Vehículo no encontrado' });
            }

            // Verificar que el vehículo pertenece al usuario actual
            if (vehiculo.idUsuario !== req.session.userId) {
                return res.status(403).json({ error: 'No tienes permiso para ver este vehículo' });
            }

            res.json(vehiculo);
        } catch (error) {
            logger.error('Error en getVehiculoDetalle controller', error, req.params);
            res.status(500).json({ error: 'Error al obtener detalle del vehículo' });
        }
    }

    /**
     * Buscar vehículos (para talleres)
     */
    async searchVehiculos(req, res) {
        try {
            const { q: searchTerm } = req.query;
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!searchTerm) {
                return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
            }

            const vehiculos = await vehiculoService.searchVehiculos(searchTerm, idTaller);
            res.json(vehiculos);
        } catch (error) {
            logger.error('Error en searchVehiculos controller', error, req.query);
            res.status(500).json({ error: 'Error al buscar vehículos' });
        }
    }

    /**
     * Obtener estadísticas de vehículos del taller
     */
    async getVehiculosStatsTaller(req, res) {
        try {
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!idTaller) {
                return res.status(404).json({ error: 'Taller no encontrado' });
            }

            const stats = await vehiculoService.getVehiculosStatsTaller(idTaller);
            res.json(stats);
        } catch (error) {
            logger.error('Error en getVehiculosStatsTaller controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener estadísticas de vehículos' });
        }
    }
}

module.exports = new VehiculoController();