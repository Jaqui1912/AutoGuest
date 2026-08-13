const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../config/config/database');
const router = express.Router();

// Middleware para verificar que sea Taller o Mecánico
const isAuth = (req, res, next) => {
    if (req.session.userId && (req.session.role === 'taller' || req.session.role === 'mecanico')) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
};

const isTaller = (req, res, next) => {
    if (req.session.userId && req.session.role === 'taller') next();
    else res.status(401).json({ error: 'No autorizado' });
};

// 1. OBTENER SERVICIOS
router.get('/servicios', isAuth, async (req, res) => {
    try {
        console.log('Session in TallerServicios:', req.session); // DEBUG
        const idTaller = req.session.tallerId;

        if (!idTaller) {
            console.error('No tallerId in session');
            // return res.status(400).json({ error: 'No taller ID' }); // Don't break if logic assumes otherwise, but verify.
        }

        const [servicios] = await db.query('SELECT * FROM servicio WHERE idTaller = ?', [idTaller]);
        const [tallerInfo] = await db.query('SELECT nombre FROM taller WHERE idTaller = ?', [idTaller]);

        res.json({
            servicios,
            nombreTaller: tallerInfo.length > 0 ? tallerInfo[0].nombre : 'Mi Taller'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cargar servicios' });
    }
});

// 2. AGREGAR SERVICIO
router.post('/servicios', isTaller, async (req, res) => {
    const { nombre, descripcion, precio } = req.body;
    const idTaller = req.session.tallerId;

    if (!nombre || !precio) return res.status(400).json({ error: 'Faltan datos' });

    try {
        const idServicio = 'SERV-' + nanoid(6);
        await db.query(
            'INSERT INTO servicio (idServicio, idTaller, nombre, descripcion, precio) VALUES (?, ?, ?, ?, ?)',
            [idServicio, idTaller, nombre, descripcion, precio]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar' });
    }
});

// 2.5 EDITAR SERVICIO
router.put('/servicios/:id', isTaller, async (req, res) => {
    const { nombre, descripcion, precio } = req.body;
    const idServicio = req.params.id;
    const idTaller = req.session.tallerId;

    if (!nombre || !precio) return res.status(400).json({ error: 'Faltan datos' });

    try {
        await db.query(
            'UPDATE servicio SET nombre = ?, descripcion = ?, precio = ? WHERE idServicio = ? AND idTaller = ?',
            [nombre, descripcion, precio, idServicio, idTaller]
        );
        res.json({ success: true, message: 'Servicio actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

// 3. ELIMINAR SERVICIO
router.delete('/servicios/:id', isTaller, async (req, res) => {
    try {
        await db.query('DELETE FROM servicio WHERE idServicio = ? AND idTaller = ?', [req.params.id, req.session.tallerId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

module.exports = router;
