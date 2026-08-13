/**
 * Servicio de Inventario
 * Maneja operaciones relacionadas con el inventario de talleres
 */

const db = require('../config/config/database');
const { logger, logDatabaseOperation, logBusinessOperation } = require('../middleware/logger');

class InventarioService {
    /**
     * Agregar un item al inventario
     */
    async agregarItem(itemData) {
        const { idTaller, nombre, descripcion, stock, precio, esParaVenta, imagen } = itemData;

        try {
            // Verificar que el taller existe
            const [tallerRows] = await db.query(
                'SELECT idTaller FROM taller WHERE idTaller = ?',
                [idTaller]
            );

            if (tallerRows.length === 0) {
                return { success: false, error: 'Taller no encontrado' };
            }

            // Agregar item
            const [result] = await db.query(
                'INSERT INTO iteminventario (idTaller, nombre, stock, precio, esParaVenta, imagen) VALUES (?, ?, ?, ?, ?, ?)',
                [idTaller, nombre, stock || 0, precio || 0, esParaVenta ? true : false, imagen || null]
            );

            logBusinessOperation('Item agregado al inventario', { idTaller, nombre, stock });

            return {
                success: true,
                item: {
                    idItem: result.insertId,
                    idTaller,
                    nombre,
                    stock,
                    precio,
                    esParaVenta,
                    imagen
                }
            };
        } catch (error) {
            logger.error('Error al agregar item al inventario', error, itemData);
            throw error;
        }
    }

    /**
     * Actualizar un item del inventario
     */
    async actualizarItem(idItem, idTaller, itemData) {
        const { nombre, stock, precio, esParaVenta, imagen } = itemData;

        try {
            const [result] = await db.query(
                'UPDATE iteminventario SET nombre = ?, stock = ?, precio = ?, esParaVenta = ?, imagen = ? WHERE idItem = ? AND idTaller = ?',
                [nombre, stock || 0, precio || 0, esParaVenta ? true : false, imagen || null, idItem, idTaller]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Item del inventario actualizado', { idItem, idTaller });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al actualizar item del inventario', error, { idItem, idTaller, itemData });
            throw error;
        }
    }

    /**
     * Obtener inventario de un taller
     */
    async getInventarioTaller(idTaller, filtros = {}) {
        try {
            let query = 'SELECT idItem, idTaller, nombre, stock, precio, esParaVenta, imagen FROM iteminventario WHERE idTaller = ?';
            let params = [idTaller];

            // Aplicar filtros
            if (filtros.categoria) {
                query += ' AND categoria = ?';
                params.push(filtros.categoria);
            }

            if (filtros.nombre) {
                query += ' AND nombre LIKE ?';
                params.push(`%${filtros.nombre}%`);
            }

            if (filtros.stockBajo !== undefined) {
                query += ' AND stock <= ?';
                params.push(filtros.stockBajo);
            }

            query += ' ORDER BY nombre ASC';

            const [items] = await db.query(query, params);

            logDatabaseOperation('SELECT', 'iteminventario', { idTaller, filtros, count: items.length });

            return items;
        } catch (error) {
            logger.error('Error al obtener inventario del taller', error, { idTaller, filtros });
            throw error;
        }
    }

    /**
     * Obtener un item específico
     */
    async getItemById(idItem, idTaller) {
        try {
            const [items] = await db.query(
                'SELECT * FROM iteminventario WHERE idItem = ? AND idTaller = ?',
                [idItem, idTaller]
            );

            if (items.length === 0) {
                return null;
            }

            logDatabaseOperation('SELECT', 'iteminventario', { idItem, idTaller });

            return items[0];
        } catch (error) {
            logger.error('Error al obtener item por ID', error, { idItem, idTaller });
            throw error;
        }
    }

    /**
     * Eliminar un item del inventario
     */
    async eliminarItem(idItem, idTaller) {
        try {
            const [result] = await db.query(
                'DELETE FROM iteminventario WHERE idItem = ? AND idTaller = ?',
                [idItem, idTaller]
            );

            if (result.affectedRows > 0) {
                logBusinessOperation('Item del inventario eliminado', { idItem, idTaller });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al eliminar item del inventario', error, { idItem, idTaller });
            throw error;
        }
    }

    /**
     * Actualizar cantidad de un item
     */
    async actualizarCantidad(idItem, idTaller, nuevaCantidad, tipoOperacion = 'set') {
        try {
            let query;
            let params;

            if (tipoOperacion === 'add') {
                query = 'UPDATE iteminventario SET cantidad = cantidad + ? WHERE idItem = ? AND idTaller = ?';
                params = [nuevaCantidad, idItem, idTaller];
            } else if (tipoOperacion === 'subtract') {
                query = 'UPDATE iteminventario SET cantidad = GREATEST(0, cantidad - ?) WHERE idItem = ? AND idTaller = ?';
                params = [nuevaCantidad, idItem, idTaller];
            } else {
                query = 'UPDATE iteminventario SET cantidad = ? WHERE idItem = ? AND idTaller = ?';
                params = [nuevaCantidad, idItem, idTaller];
            }

            const [result] = await db.query(query, params);

            if (result.affectedRows > 0) {
                logBusinessOperation('Cantidad de item actualizada', { idItem, idTaller, nuevaCantidad, tipoOperacion });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Error al actualizar cantidad del item', error, { idItem, idTaller, nuevaCantidad, tipoOperacion });
            throw error;
        }
    }

    /**
     * Obtener estadísticas del inventario
     */
    async getEstadisticasInventario(idTaller) {
        try {
            const [stats] = await db.query(`
                SELECT
                    COUNT(*) as totalItems,
                    SUM(cantidad) as totalUnidades,
                    AVG(precioUnitario) as valorPromedio,
                    SUM(cantidad * precioUnitario) as valorTotalInventario,
                    COUNT(CASE WHEN cantidad <= 5 THEN 1 END) as itemsStockBajo,
                    COUNT(DISTINCT categoria) as categoriasDistintas
                FROM iteminventario
                WHERE idTaller = ?
            `, [idTaller]);

            const estadisticas = stats[0];

            // Formatear valores monetarios
            if (estadisticas.valorPromedio) {
                estadisticas.valorPromedio = parseFloat(estadisticas.valorPromedio).toFixed(2);
            }
            if (estadisticas.valorTotalInventario) {
                estadisticas.valorTotalInventario = parseFloat(estadisticas.valorTotalInventario).toFixed(2);
            }

            logDatabaseOperation('SELECT', 'estadisticas_inventario', { idTaller });

            return estadisticas;
        } catch (error) {
            logger.error('Error al obtener estadísticas del inventario', error, { idTaller });
            throw error;
        }
    }

    /**
     * Obtener items con stock bajo
     */
    async getItemsStockBajo(idTaller, limite = 10) {
        try {
            const [items] = await db.query(
                'SELECT * FROM iteminventario WHERE idTaller = ? AND cantidad <= ? ORDER BY cantidad ASC LIMIT ?',
                [idTaller, limite, limite]
            );

            logDatabaseOperation('SELECT', 'iteminventario_stock_bajo', { idTaller, limite, count: items.length });

            return items;
        } catch (error) {
            logger.error('Error al obtener items con stock bajo', error, { idTaller, limite });
            throw error;
        }
    }

    /**
     * Buscar items por nombre o descripción
     */
    async buscarItems(idTaller, terminoBusqueda, limit = 20) {
        try {
            const [items] = await db.query(
                'SELECT * FROM iteminventario WHERE idTaller = ? AND (nombre LIKE ? OR descripcion LIKE ?) ORDER BY nombre ASC LIMIT ?',
                [idTaller, `%${terminoBusqueda}%`, `%${terminoBusqueda}%`, limit]
            );

            logDatabaseOperation('SELECT', 'iteminventario_busqueda', { idTaller, terminoBusqueda, count: items.length });

            return items;
        } catch (error) {
            logger.error('Error al buscar items', error, { idTaller, terminoBusqueda });
            throw error;
        }
    }

    /**
     * Obtener categorías disponibles en el inventario
     */
    async getCategorias(idTaller) {
        try {
            const [categorias] = await db.query(
                'SELECT DISTINCT categoria FROM iteminventario WHERE idTaller = ? AND categoria IS NOT NULL ORDER BY categoria ASC',
                [idTaller]
            );

            return categorias.map(row => row.categoria);
        } catch (error) {
            logger.error('Error al obtener categorías', error, { idTaller });
            throw error;
        }
    }
}

module.exports = new InventarioService();