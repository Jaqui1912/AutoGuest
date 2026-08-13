const express = require('express');
const vehiculoController = require('../controllers/vehiculoController');
const { ensureAuthenticated } = require('../middleware/auth');
const { validateVehicleData } = require('../middleware/validation');
const router = express.Router();

// Debug session (temporal)
router.get('/debug-session', (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        user: req.user
    });
});

// Obtener vehículos del usuario
router.get('/', ensureAuthenticated, vehiculoController.getVehiculosUsuario);

// Crear nuevo vehículo
router.post('/', ensureAuthenticated, validateVehicleData, vehiculoController.createVehiculo);

// Actualizar vehículo
router.put('/:idVehiculo', ensureAuthenticated, vehiculoController.updateVehiculo);

// Eliminar vehículo
router.delete('/:idVehiculo', ensureAuthenticated, vehiculoController.deleteVehiculo);


module.exports = router;
