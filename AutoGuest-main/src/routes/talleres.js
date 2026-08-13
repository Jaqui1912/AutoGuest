// Archivo: routes/talleres.js
const express = require('express');
const db = require('../config/config/database');
const { nanoid } = require('nanoid');
const router = express.Router();

// Ruta para obtener todos los talleres
router.get('/', async (req, res) => {
    try {
        // Esta consulta trae los 50 talleres de tu base de datos
        const [rows] = await db.query('SELECT idTaller, nombre, direccion, foto_perfil FROM taller');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener talleres:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 2. Obtener DETALLE de un taller específico (Info + Servicios + Reseñas)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // A) Info del taller
        const [taller] = await db.query('SELECT * FROM taller WHERE idTaller = ?', [id]);
        if (taller.length === 0) return res.status(404).json({ message: 'Taller no encontrado' });

        // B) Servicios (Tabla servicio)
        const [servicios] = await db.query('SELECT * FROM servicio WHERE idTaller = ?', [id]);

        // C) Productos (Para saber si mostrar botón de catálogo)
        const [productos] = await db.query('SELECT count(*) as total FROM iteminventario WHERE idTaller = ? AND esParaVenta = true', [id]);
        const tieneProductos = productos[0].total > 0;

        // D) Reseñas
        const [resenas] = await db.query(`
            SELECT r.*, u.nombre as nombreCliente, u.nombre as clienteNombre 
            FROM resenas r 
            JOIN usuario u ON r.idUsuario = u.idUsuario 
            WHERE r.idTaller = ? 
            ORDER BY r.fecha DESC`, [id]);

        res.json({
            info: taller[0],
            servicios: servicios,
            resenas: resenas,
            tieneProductos: tieneProductos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// 2.5 Obtener específicamente las RESEÑAS de un taller
router.get('/:id/resenas', async (req, res) => {
    const { id } = req.params;
    try {
        const [resenas] = await db.query(`
            SELECT r.*, u.nombre as nombreCliente, u.nombre as clienteNombre 
            FROM resenas r 
            JOIN usuario u ON r.idUsuario = u.idUsuario 
            WHERE r.idTaller = ? 
            ORDER BY r.fecha DESC`, [id]);
        res.json(resenas);
    } catch (error) {
        console.error('Error al obtener reseñas:', error);
        res.status(500).json({ error: 'Error al obtener reseñas' });
    }
});

// 3. Guardar una nueva RESEÑA
router.post('/:id/resenas', async (req, res) => {
    const { id } = req.params;
    const { idUsuario, calificacion, comentario } = req.body;

    // VALIDACIÓN: Evitar nulos que rompan PostgreSQL
    if (!idUsuario) {
        console.error(`Error: Intento de reseña sin idUsuario para taller ${id}`);
        return res.status(400).json({ error: 'Debes iniciar sesión para publicar una reseña.' });
    }

    try {
        console.log(`Intentando guardar reseña para taller ${id}, usuario ${idUsuario}`);
        await db.query('INSERT INTO resenas (idtaller, idusuario, calificacion, comentario) VALUES (?, ?, ?, ?)',
            [id, idUsuario, calificacion, comentario]);

        // Notificar al taller sobre la nueva reseña
        try {
            // Obtener el ID del administrador del taller
            const [adminRows] = await db.query('SELECT idUsuario FROM administrador WHERE idTaller = ? LIMIT 1', [id]);
            if (adminRows.length > 0) {
                const idAdmin = adminRows[0].idUsuario;
                // Obtener el nombre del cliente
                const [userRows] = await db.query('SELECT nombre FROM usuario WHERE idUsuario = ?', [idUsuario]);
                const nombreCliente = userRows.length > 0 ? userRows[0].nombre : 'Un cliente';

                await db.query(
                    'INSERT INTO notificacion (idUsuario, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
                    [idAdmin, 'Nueva Reseña Recibida', `${nombreCliente} ha dejado una calificación de ${calificacion} estrellas.`, 'resena']
                );
            }
        } catch (notifError) {
            console.error('Error al enviar notificación de reseña:', notifError);
        }

        res.json({ success: true, message: 'Reseña guardada' });
    } catch (error) {
        console.error('Error al guardar reseña en taller:', error);
        res.status(500).json({ error: 'No se pudo guardar la reseña', detail: error.message });
    }
});
module.exports = router;
