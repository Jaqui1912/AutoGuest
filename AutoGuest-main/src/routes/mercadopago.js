const express = require('express');
const router = express.Router();
const { Preference } = require('mercadopago');
const client = require('../config/config/mercadopago');
const db = require('../config/config/database');

// Ruta para obtener la clave pública de MercadoPago
router.get('/public-key', (req, res) => {
    res.json({ publicKey: process.env.MP_PUBLIC_KEY });
});

router.post('/create-preference', async (req, res) => {
    const { id_cotizacion } = req.body;

    try {
        const [rows] = await db.query('SELECT totalAprobado FROM cotizacion WHERE idCotizacion = ?', [id_cotizacion]);
        if (rows.length === 0) {
            return res.status(404).send('Error: Cotización no encontrada.');
        }
        const amount = rows[0].totalAprobado;

        const preference = new Preference(client);

        const response = await preference.create({
            body: {
                items: [
                    {
                        title: 'Servicio de Taller',
                        unit_price: amount,
                        quantity: 1,
                    },
                ],
                back_urls: {
                    success: 'http://localhost:3000/pages/cliente/detalle_cita.html', // Update with your success URL
                    failure: 'http://localhost:3000/pages/cliente/detalle_cita.html', // Update with your failure URL
                    pending: 'http://localhost:3000/pages/cliente/detalle_cita.html', // Update with your pending URL
                },
                auto_return: 'approved',
            }
        });
        res.json({ id: response.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create preference' });
    }
});

module.exports = router;
