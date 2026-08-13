/**
 * Rutas de Reseñas
 * Define los endpoints para gestión de reseñas y calificaciones
 */

const express = require('express');
const router = express.Router();
const resenaController = require('../controllers/resenaController');
const { authenticate } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);
router.use(apiRateLimit);

// Crear reseña
router.post('/', resenaController.createResena);

// Obtener reseñas de un taller
router.get('/taller/:idTaller', resenaController.getResenasTaller);

// Obtener reseñas del usuario actual
router.get('/usuario', resenaController.getResenasUsuario);

// Obtener estadísticas de reseñas de un taller
router.get('/taller/:idTaller/estadisticas', resenaController.getEstadisticasTaller);

// Eliminar reseña (solo el autor)
router.delete('/:idResena', resenaController.deleteResena);

module.exports = router;
