/**
 * Controlador de Perfil
 * Maneja operaciones relacionadas con el perfil del usuario
 */

const usuarioService = require('../services/usuarioService');
const { logger } = require('../middleware/logger');

class PerfilController {
    /**
     * Obtener perfil del usuario actual
     */
    async getPerfil(req, res) {
        try {
            const idUsuario = req.session.userId;
            const usuario = await usuarioService.getUsuarioById(idUsuario);

            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json({
                idUsuario: usuario.idUsuario,
                nombre: usuario.nombre,
                email: usuario.email,
                telefono: usuario.telefono,
                foto_perfil: usuario.foto_perfil,
                fecha_registro: usuario.fecha_registro
            });
        } catch (error) {
            logger.error('Error en getPerfil controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener perfil' });
        }
    }

    /**
     * Actualizar perfil del usuario
     */
    async updatePerfil(req, res) {
        try {
            const idUsuario = req.session.userId;
            const { nombre, email, telefono } = req.body;

            const success = await usuarioService.updatePerfil(idUsuario, {
                nombre,
                email,
                telefono
            });

            if (success) {
                res.json({ message: 'Perfil actualizado exitosamente' });
            } else {
                res.status(404).json({ error: 'Usuario no encontrado' });
            }
        } catch (error) {
            logger.error('Error en updatePerfil controller', error, req.body);
            res.status(500).json({ error: 'Error al actualizar perfil' });
        }
    }
}

module.exports = new PerfilController();