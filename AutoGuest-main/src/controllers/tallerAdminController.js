/**
 * Controlador de Administrador de Taller
 * Maneja operaciones administrativas del taller
 */

const usuarioService = require('../services/usuarioService');
const { logger } = require('../middleware/logger');

class TallerAdminController {
    /**
     * Obtener estadísticas del taller
     */
    async getStats(req, res) {
        try {
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!idTaller) {
                return res.status(404).json({ error: 'Taller no encontrado' });
            }

            const stats = await usuarioService.getTallerStats(idTaller);
            res.json(stats);
        } catch (error) {
            logger.error('Error en getStats controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener estadísticas del taller' });
        }
    }

    /**
     * Obtener clientes del taller
     */
    async getClientes(req, res) {
        try {
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!idTaller) {
                return res.status(404).json({ error: 'Taller no encontrado' });
            }

            const clientes = await usuarioService.getClientesTaller(idTaller);
            res.json(clientes);
        } catch (error) {
            logger.error('Error en getClientes controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener clientes del taller' });
        }
    }

    /**
     * Obtener mecánicos del taller
     */
    async getMecanicos(req, res) {
        try {
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!idTaller) {
                return res.status(404).json({ error: 'Taller no encontrado' });
            }

            const mecanicos = await usuarioService.getMecanicosTaller(idTaller);
            res.json(mecanicos);
        } catch (error) {
            logger.error('Error en getMecanicos controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener mecánicos del taller' });
        }
    }
}

module.exports = new TallerAdminController();