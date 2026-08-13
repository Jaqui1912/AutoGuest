/**
 * Controlador de Inventario
 * Maneja endpoints relacionados con el inventario de talleres
 */

const inventarioService = require('../services/inventarioService');
const { validateItemInventario } = require('../middleware/validation');
const { logger, logDatabaseOperation, logBusinessOperation, logRequest, logError } = require('../middleware/logger');
const { apiRateLimit } = require('../middleware/rateLimit');
const { getSessionIdentity } = require('../middleware/auth');

/**
 * Obtiene el idTaller de la request de forma robusta usando el helper centralizado.
 */
function getIdTaller(req) {
    const identity = getSessionIdentity(req);
    return identity ? identity.tallerId : null;
}

class InventarioController {
    constructor() {
        this.agregarItem = this.agregarItem.bind(this);
        this.actualizarItem = this.actualizarItem.bind(this);
        this.getInventarioTaller = this.getInventarioTaller.bind(this);
        this.getItemById = this.getItemById.bind(this);
        this.eliminarItem = this.eliminarItem.bind(this);
        this.actualizarCantidad = this.actualizarCantidad.bind(this);
        this.getEstadisticasInventario = this.getEstadisticasInventario.bind(this);
        this.getItemsStockBajo = this.getItemsStockBajo.bind(this);
        this.buscarItems = this.buscarItems.bind(this);
        this.getCategorias = this.getCategorias.bind(this);
    }

    /**
     * Agregar un item al inventario
     */
    async agregarItem(req, res) {
        try {
            logRequest(req);

            const itemData = req.body;
            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            // Validar datos de entrada
            const validation = validateItemInventario(itemData);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Datos de item inválidos',
                    details: validation.errors
                });
            }

            // Agregar item
            const result = await inventarioService.agregarItem({
                idTaller,
                ...itemData
            });

            if (!result.success) {
                return res.status(400).json({
                    error: result.error
                });
            }

            res.status(201).json({
                message: 'Item agregado al inventario exitosamente',
                item: result.item
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Actualizar un item del inventario
     */
    async actualizarItem(req, res) {
        try {
            logRequest(req);

            const { idItem } = req.params;
            const itemData = req.body;
            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            // Validar datos de entrada
            const validation = validateItemInventario(itemData);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Datos de item inválidos',
                    details: validation.errors
                });
            }

            const actualizado = await inventarioService.actualizarItem(idItem, idTaller, itemData);

            if (!actualizado) {
                return res.status(404).json({
                    error: 'Item no encontrado'
                });
            }

            res.json({
                message: 'Item actualizado exitosamente'
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener inventario del taller
     */
    async getInventarioTaller(req, res) {
        try {
            logRequest(req);

            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            const { categoria, nombre, stockBajo } = req.query;

            const filtros = {};
            if (categoria) filtros.categoria = categoria;
            if (nombre) filtros.nombre = nombre;
            if (stockBajo) filtros.stockBajo = parseInt(stockBajo);

            const items = await inventarioService.getInventarioTaller(idTaller, filtros);

            // Devolver array directo para compatibilidad con el panel de taller
            res.json(Array.isArray(items) ? items : (items || []));

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener un item específico
     */
    async getItemById(req, res) {
        try {
            logRequest(req);

            const { idItem } = req.params;
            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            const item = await inventarioService.getItemById(idItem, idTaller);

            if (!item) {
                return res.status(404).json({
                    error: 'Item no encontrado'
                });
            }

            res.json({ item });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Eliminar un item del inventario
     */
    async eliminarItem(req, res) {
        try {
            logRequest(req);

            const { idItem } = req.params;
            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            const eliminado = await inventarioService.eliminarItem(idItem, idTaller);

            if (!eliminado) {
                return res.status(404).json({
                    error: 'Item no encontrado'
                });
            }

            res.json({
                message: 'Item eliminado exitosamente'
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Actualizar cantidad de un item
     */
    async actualizarCantidad(req, res) {
        try {
            logRequest(req);

            const { idItem } = req.params;
            const { cantidad, tipoOperacion = 'set' } = req.body;
            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            if (!cantidad || cantidad < 0) {
                return res.status(400).json({
                    error: 'Cantidad debe ser un número positivo'
                });
            }

            const actualizado = await inventarioService.actualizarCantidad(idItem, idTaller, cantidad, tipoOperacion);

            if (!actualizado) {
                return res.status(404).json({
                    error: 'Item no encontrado'
                });
            }

            res.json({
                message: 'Cantidad actualizada exitosamente'
            });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener estadísticas del inventario
     */
    async getEstadisticasInventario(req, res) {
        try {
            logRequest(req);

            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            const estadisticas = await inventarioService.getEstadisticasInventario(idTaller);

            res.json({ estadisticas });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener items con stock bajo
     */
    async getItemsStockBajo(req, res) {
        try {
            logRequest(req);

            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            const { limite = 10 } = req.query;

            const items = await inventarioService.getItemsStockBajo(idTaller, parseInt(limite));

            res.json({ items });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Buscar items en el inventario
     */
    async buscarItems(req, res) {
        try {
            logRequest(req);

            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            const { q: terminoBusqueda, limit = 20 } = req.query;

            if (!terminoBusqueda) {
                return res.status(400).json({
                    error: 'Parámetro de búsqueda requerido'
                });
            }

            const items = await inventarioService.buscarItems(idTaller, terminoBusqueda, parseInt(limit));

            res.json({ items });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener categorías disponibles
     */
    async getCategorias(req, res) {
        try {
            logRequest(req);

            const idTaller = getIdTaller(req);

            if (!idTaller) {
                return res.status(401).json({ error: 'No se pudo identificar el taller. Inicia sesión nuevamente.' });
            }

            const categorias = await inventarioService.getCategorias(idTaller);

            res.json({ categorias });

        } catch (error) {
            logError(error, req);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
}

module.exports = new InventarioController();