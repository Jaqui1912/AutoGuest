/**
 * Middleware de logging centralizado
 * Proporciona logging consistente para todas las operaciones
 */

const logger = {
    info: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] INFO: ${message}`, Object.keys(data).length ? data : '');
    },

    error: (message, error = {}, data = {}) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR: ${message}`, {
            error: error.message || error,
            stack: error.stack,
            ...data
        });
    },

    warn: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] WARN: ${message}`, Object.keys(data).length ? data : '');
    },

    debug: (message, data = {}) => {
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.debug(`[${timestamp}] DEBUG: ${message}`, Object.keys(data).length ? data : '');
        }
    }
};

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;

    logger.info(`Request: ${method} ${url}`, {
        ip,
        userAgent: req.get('User-Agent'),
        userId: req.session?.userId || 'anonymous'
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;

        logger.info(`Response: ${method} ${url} ${statusCode}`, {
            duration: `${duration}ms`,
            userId: req.session?.userId || 'anonymous'
        });
    });

    next();
};

// Middleware para logging de errores
const errorLogger = (error, req, res, next) => {
    logger.error('Unhandled error', error, {
        method: req.method,
        url: req.url,
        userId: req.session?.userId,
        body: req.body,
        params: req.params,
        query: req.query
    });

    next(error);
};

// Función para logging de operaciones de base de datos
const logDatabaseOperation = (operation, table, data = {}) => {
    logger.debug(`Database ${operation}: ${table}`, data);
};

// Función para logging de operaciones de negocio
const logBusinessOperation = (operation, details = {}) => {
    logger.info(`Business operation: ${operation}`, details);
};

// Helper: log de request entrante (manual)
const logRequest = (req) => {
    logger.info(`Manual Request Log: ${req.method} ${req.originalUrl || req.url}`, { 
        userId: req.session?.userId || 'anonymous',
        role: req.session?.role || 'none'
    });
};

// Helper: log de error con contexto de request
const logError = (error, req) => {
    logger.error('Error en controlador', error, { 
        url: req?.originalUrl || req?.url,
        userId: req?.session?.userId,
        method: req?.method
    });
};

module.exports = {
    logger,
    requestLogger,
    errorLogger,
    logDatabaseOperation,
    logBusinessOperation,
    logRequest,
    logError
};