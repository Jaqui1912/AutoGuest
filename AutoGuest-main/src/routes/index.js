const paymentRoutes = require('./payment');
const mercadopagoRoutes = require('./mercadopago');
const authRoutes = require('./auth');
const vehiculosRoutes = require('./vehiculos');
const talleresRoutes = require('./talleres');
const tallerAuthRoutes = require('./taller_auth');
const citasRoutes = require('./citas');
const pedidosRoutes = require('./pedidos');
const perfilRoutes = require('./perfil');
const resenasRoutes = require('./resenas');
const tallerServiciosRoutes = require('./taller_servicios');
const tallerCitasRoutes = require('./taller_citas');
const tallerAdminRoutes = require('./taller_admin');
const mecanicoRoutes = require('./auth_mecanico');
const inventarioRoutes = require('./inventario');
const chatRoutes = require('./chat');
const ticketsRoutes = require('./tickets');
const notificacionesRoutes = require('./notificaciones');

module.exports = (app) => {
    app.use('/api/talleres', talleresRoutes);

    app.use('/api/registro', tallerAuthRoutes);
    app.use('/api/registro', authRoutes);
    app.use('/api/citas', citasRoutes);

    app.use('/api/taller', tallerServiciosRoutes);
    app.use('/api/taller', tallerCitasRoutes);
    app.use('/api/taller', tallerAdminRoutes);

    app.use('/api/paypal', paymentRoutes);
    app.use('/api/mercadopago', mercadopagoRoutes);

    app.use('/api/vehiculos', vehiculosRoutes);
    app.use('/api/pedidos', pedidosRoutes);
    app.use('/api/perfil', perfilRoutes);
    app.use('/api/resenas', resenasRoutes);
    app.use('/api/inventario', inventarioRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/tickets', ticketsRoutes);
    app.use('/api/mecanico', mecanicoRoutes);
    app.use('/api/notificaciones', notificacionesRoutes);
};
