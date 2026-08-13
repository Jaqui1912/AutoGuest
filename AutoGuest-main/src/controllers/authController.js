/**
 * Controlador de Autenticación
 * Maneja login, registro y gestión de sesiones
 */

const usuarioService = require('../services/usuarioService');
const { logger } = require('../middleware/logger');

class AuthController {
    /**
     * Registro de cliente
     */
    async registerCliente(req, res) {
        try {
            const { nombre, email, password } = req.body;

            const result = await usuarioService.createUsuario({
                nombre,
                email,
                password,
                rol: 'cliente'
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.status(201).json({
                message: 'Cliente registrado exitosamente',
                usuario: result.usuario
            });
        } catch (error) {
            logger.error('Error en registerCliente controller', error, req.body);
            res.status(500).json({ error: 'Error al registrar cliente' });
        }
    }

    /**
     * Login de usuario
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;

            const result = await usuarioService.verifyCredentials(email, password);

            if (!result.success) {
                return res.status(401).json({ error: result.error });
            }

            // Establecer sesión
            req.session.userId = result.usuario.idUsuario;
            req.session.role = result.usuario.rol;

            // Si es taller, guardar idTaller
            if (result.usuario.rol === 'taller') {
                const taller = await usuarioService.getTallerByAdminId(result.usuario.idUsuario);
                if (taller) {
                    req.session.tallerId = taller.idTaller;
                    req.session.idTaller = taller.idTaller;
                }
            }

            res.json({
                message: 'Login exitoso',
                usuario: {
                    idUsuario: result.usuario.idUsuario,
                    nombre: result.usuario.nombre,
                    email: result.usuario.email,
                    rol: result.usuario.rol
                }
            });
        } catch (error) {
            logger.error('Error en login controller', error, { email: req.body.email });
            res.status(500).json({ error: 'Error al iniciar sesión' });
        }
    }

    /**
     * Logout
     */
    async logout(req, res) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    logger.error('Error al destruir sesión', err);
                    return res.status(500).json({ error: 'Error al cerrar sesión' });
                }

                res.clearCookie('connect.sid');
                res.json({ message: 'Sesión cerrada exitosamente' });
            });
        } catch (error) {
            logger.error('Error en logout controller', error);
            res.status(500).json({ error: 'Error al cerrar sesión' });
        }
    }

    /**
     * Verificar sesión actual
     */
    async checkSession(req, res) {
        try {
            if (req.session.userId) {
                const usuario = await usuarioService.getUsuarioById(req.session.userId);
                if (usuario) {
                    return res.json({
                        authenticated: true,
                        usuario: {
                            idUsuario: usuario.idUsuario,
                            nombre: usuario.nombre,
                            email: usuario.email,
                            rol: usuario.rol
                        }
                    });
                }
            }

            res.json({ authenticated: false });
        } catch (error) {
            logger.error('Error en checkSession controller', error);
            res.status(500).json({ error: 'Error al verificar sesión' });
        }
    }

    /**
     * Login con Google (placeholder)
     */
    async googleLogin(req, res) {
        try {
            // Implementación placeholder para Google OAuth
            res.status(501).json({ error: 'Google login no implementado aún' });
        } catch (error) {
            logger.error('Error en googleLogin controller', error);
            res.status(500).json({ error: 'Error en login con Google' });
        }
    }
}

module.exports = new AuthController();