/**
 * Controlador de Usuarios
 * Maneja las rutas relacionadas con usuarios, autenticación y perfiles
 */

const usuarioService = require('../services/usuarioService');
const { logger } = require('../middleware/logger');

class UsuarioController {
    /**
     * Registro de nuevo usuario
     */
    async register(req, res) {
        try {
            const { nombre, email, password, rol } = req.body;

            const result = await usuarioService.createUsuario({
                nombre,
                email,
                password,
                rol: rol || 'cliente'
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                usuario: result.usuario
            });
        } catch (error) {
            logger.error('Error en register controller', error, req.body);
            res.status(500).json({ error: 'Error al registrar usuario' });
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
     * Logout de usuario
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

    /**
     * Obtener estadísticas del taller (para administradores)
     */
    async getTallerStats(req, res) {
        try {
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!idTaller) {
                return res.status(404).json({ error: 'Taller no encontrado' });
            }

            const stats = await usuarioService.getTallerStats(idTaller);
            res.json(stats);
        } catch (error) {
            logger.error('Error en getTallerStats controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener estadísticas del taller' });
        }
    }

    /**
     * Obtener clientes del taller (para administradores)
     */
    async getClientesTaller(req, res) {
        try {
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!idTaller) {
                return res.status(404).json({ error: 'Taller no encontrado' });
            }

            const clientes = await usuarioService.getClientesTaller(idTaller);
            res.json(clientes);
        } catch (error) {
            logger.error('Error en getClientesTaller controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener clientes del taller' });
        }
    }

    /**
     * Obtener mecánicos del taller (para administradores)
     */
    async getMecanicosTaller(req, res) {
        try {
            const idTaller = req.session.tallerId || req.session.idTaller;

            if (!idTaller) {
                return res.status(404).json({ error: 'Taller no encontrado' });
            }

            const mecanicos = await usuarioService.getMecanicosTaller(idTaller);
            res.json(mecanicos);
        } catch (error) {
            logger.error('Error en getMecanicosTaller controller', error, { userId: req.session.userId });
            res.status(500).json({ error: 'Error al obtener mecánicos del taller' });
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
}

module.exports = new UsuarioController();