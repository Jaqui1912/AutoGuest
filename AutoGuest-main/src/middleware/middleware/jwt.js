const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'autoguest_secret_key_2025';
const JWT_EXPIRES = '7d';

/**
 * Genera un JWT firmado con el userId, rol y datos extra.
 * @param {string} userId
 * @param {string} role - 'cliente' | 'taller' | 'mecanico'
 * @param {object} extra - datos adicionales (ej: tallerName, idTaller)
 */
function generateToken(userId, role, extra = {}) {
    return jwt.sign({ userId, role, ...extra }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * Middleware para verificar JWT desde el header Authorization: Bearer <token>
 * Si el token es válido, popula req.session con userId y role para compatibilidad
 * con el resto de los routes que usan req.session.
 * Si no hay token Bearer, continúa con la sesión de cookies normal (web).
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Only attempt verification if token is a real value (not 'null' or empty)
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                // Inyectar en req.session para compatibilidad con rutas existentes
                if (!req.session) req.session = {};
                req.session.userId = decoded.userId;
                req.session.role = decoded.role;
                if (decoded.idTaller) {
                    req.session.tallerId = decoded.idTaller;  // Clave que usan los routes
                    req.session.idTaller = decoded.idTaller;  // Compatibilidad adicional
                }
                req.jwtUser = decoded;
            } catch (err) {
                // Token inválido pero no rompemos la sesión de cookie,
                // simplemente continuamos sin establecer usuario JWT
                console.warn('JWT verificación fallida, continuando con sesión de cookie:', err.message);
            }
        }
    }
    next();
}

module.exports = { generateToken, verifyToken };
