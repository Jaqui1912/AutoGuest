/**
 * Middleware de Rate Limiting
 * Protege contra abuso de la API limitando requests por IP/usuario
 */

const { logger } = require('./logger');

// Almacén en memoria para rate limiting (en producción usar Redis)
const rateLimitStore = new Map();

class RateLimiter {
    constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) { // 15 minutos, 100 requests
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    /**
     * Verificar si una IP/usuario puede hacer una request
     */
    checkLimit(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        if (!rateLimitStore.has(identifier)) {
            rateLimitStore.set(identifier, []);
        }

        const requests = rateLimitStore.get(identifier);

        // Filtrar requests fuera de la ventana
        const validRequests = requests.filter(timestamp => timestamp > windowStart);

        if (validRequests.length >= this.maxRequests) {
            return {
                allowed: false,
                remainingRequests: 0,
                resetTime: Math.min(...validRequests) + this.windowMs
            };
        }

        // Agregar nueva request
        validRequests.push(now);
        rateLimitStore.set(identifier, validRequests);

        return {
            allowed: true,
            remainingRequests: this.maxRequests - validRequests.length,
            resetTime: now + this.windowMs
        };
    }

    /**
     * Limpiar entradas antiguas periódicamente
     */
    cleanup() {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        for (const [identifier, requests] of rateLimitStore.entries()) {
            const validRequests = requests.filter(timestamp => timestamp > windowStart);
            if (validRequests.length === 0) {
                rateLimitStore.delete(identifier);
            } else {
                rateLimitStore.set(identifier, validRequests);
            }
        }
    }
}

// Instancias de rate limiter para diferentes tipos de endpoints
const generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests por 15 min
const authLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 intentos de login por 15 min
const apiLimiter = new RateLimiter(60 * 1000, 30); // 30 requests por minuto para APIs

// Limpiar store cada 10 minutos
setInterval(() => {
    generalLimiter.cleanup();
    authLimiter.cleanup();
    apiLimiter.cleanup();
}, 10 * 60 * 1000);

/**
 * Middleware de rate limiting general
 */
const rateLimit = (limiter = generalLimiter, identifierFn = null) => {
    return (req, res, next) => {
        // Determinar identificador (IP por defecto, o usuario si está autenticado)
        let identifier = req.ip || req.connection.remoteAddress;

        if (identifierFn) {
            identifier = identifierFn(req);
        } else if (req.session?.userId) {
            identifier = `user_${req.session.userId}`;
        }

        const result = limiter.checkLimit(identifier);

        // Headers informativos
        res.set({
            'X-RateLimit-Limit': limiter.maxRequests,
            'X-RateLimit-Remaining': result.remainingRequests,
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });

        if (!result.allowed) {
            logger.warn('Rate limit exceeded', {
                identifier,
                ip: req.ip,
                path: req.path,
                method: req.method
            });

            return res.status(429).json({
                error: 'Demasiadas solicitudes',
                message: 'Has excedido el límite de solicitudes. Inténtalo de nuevo más tarde.',
                retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
            });
        }

        next();
    };
};

/**
 * Rate limiting específico para autenticación
 */
const authRateLimit = rateLimit(authLimiter, (req) => {
    return `auth_${req.ip}_${req.body.email || 'unknown'}`;
});

/**
 * Rate limiting para APIs generales
 */
const apiRateLimit = rateLimit(apiLimiter);

/**
 * Rate limiting estricto para creación de recursos
 */
const createResourceRateLimit = rateLimit(new RateLimiter(60 * 1000, 10)); // 10 creaciones por minuto

/**
 * Rate limiting para búsquedas
 */
const searchRateLimit = rateLimit(new RateLimiter(60 * 1000, 20)); // 20 búsquedas por minuto

module.exports = {
    rateLimit,
    authRateLimit,
    apiRateLimit,
    createResourceRateLimit,
    searchRateLimit,
    RateLimiter
};