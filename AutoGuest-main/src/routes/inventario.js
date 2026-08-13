/**
 * Rutas de Inventario
 * Define los endpoints para gestión del inventario de talleres
 */

const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticate } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);
router.use(apiRateLimit);

// =========================================================
// Rutas usadas por el panel de taller (gestionar_inventario)
// =========================================================

// GET /api/inventario/taller  — obtener inventario del taller logueado
router.get('/taller', inventarioController.getInventarioTaller);

// POST /api/inventario        — agregar nuevo producto
router.post('/', inventarioController.agregarItem);

// PUT /api/inventario/:id     — editar producto
router.put('/:idItem', inventarioController.actualizarItem);

// DELETE /api/inventario/:id  — eliminar producto
router.delete('/:idItem', inventarioController.eliminarItem);

// =========================================================
// Rutas adicionales (legacy / uso interno)
// =========================================================

// GET /api/inventario/        — alias para obtener inventario
router.get('/', inventarioController.getInventarioTaller);

// Agregar item con ruta explícita (compatibilidad)
router.post('/item', inventarioController.agregarItem);

// Actualizar item con ruta explícita
router.put('/item/:idItem', inventarioController.actualizarItem);

// Obtener item específico
router.get('/item/:idItem', inventarioController.getItemById);

// Eliminar item con ruta explícita
router.delete('/item/:idItem', inventarioController.eliminarItem);

// Actualizar cantidad de un item
router.patch('/item/:idItem/cantidad', inventarioController.actualizarCantidad);

// Obtener estadísticas del inventario
router.get('/estadisticas', inventarioController.getEstadisticasInventario);

// Obtener items con stock bajo
router.get('/stock-bajo', inventarioController.getItemsStockBajo);

// Buscar items
router.get('/buscar', inventarioController.buscarItems);

// Obtener categorías disponibles
router.get('/categorias', inventarioController.getCategorias);

module.exports = router;
