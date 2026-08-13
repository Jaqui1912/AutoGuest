/**
 * Sistema de Caché en Memoria
 * Proporciona caching básico para mejorar rendimiento
 */

const { logger } = require('./logger');

class Cache {
    constructor(defaultTTL = 300000) { // 5 minutos por defecto
        this.store = new Map();
        this.defaultTTL = defaultTTL;
    }

    /**
     * Establecer un valor en caché
     */
    set(key, value, ttl = null) {
        const expiresAt = Date.now() + (ttl || this.defaultTTL);

        this.store.set(key, {
            value,
            expiresAt,
            createdAt: Date.now()
        });

        logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
    }

    /**
     * Obtener un valor del caché
     */
    get(key) {
        const item = this.store.get(key);

        if (!item) {
            return null;
        }

        if (Date.now() > item.expiresAt) {
            this.store.delete(key);
            logger.debug('Cache expired', { key });
            return null;
        }

        logger.debug('Cache hit', { key });
        return item.value;
    }

    /**
     * Verificar si una clave existe en caché
     */
    has(key) {
        const item = this.store.get(key);
        return item && Date.now() <= item.expiresAt;
    }

    /**
     * Eliminar una clave del caché
     */
    delete(key) {
        const deleted = this.store.delete(key);
        if (deleted) {
            logger.debug('Cache deleted', { key });
        }
        return deleted;
    }

    /**
     * Limpiar todo el caché
     */
    clear() {
        const size = this.store.size;
        this.store.clear();
        logger.info('Cache cleared', { previousSize: size });
    }

    /**
     * Obtener o establecer (con función)
     */
    getOrSet(key, getterFn, ttl = null) {
        let value = this.get(key);

        if (value === null) {
            value = getterFn();
            if (value !== null && value !== undefined) {
                this.set(key, value, ttl);
            }
        }

        return value;
    }

    /**
     * Limpiar entradas expiradas
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, item] of this.store.entries()) {
            if (now > item.expiresAt) {
                this.store.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('Cache cleanup', { cleaned });
        }

        return cleaned;
    }

    /**
     * Obtener estadísticas del caché
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        let totalSize = 0;

        for (const [key, item] of this.store.entries()) {
            if (now <= item.expiresAt) {
                validEntries++;
            } else {
                expiredEntries++;
            }
            // Estimación aproximada del tamaño (no precisa)
            totalSize += JSON.stringify(item.value).length;
        }

        return {
            totalEntries: this.store.size,
            validEntries,
            expiredEntries,
            estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`
        };
    }
}

// Instancias de caché para diferentes propósitos
const userCache = new Cache(600000); // 10 minutos para datos de usuario
const statsCache = new Cache(300000); // 5 minutos para estadísticas
const configCache = new Cache(1800000); // 30 minutos para configuración

// Limpiar cachés expirados cada 5 minutos
setInterval(() => {
    userCache.cleanup();
    statsCache.cleanup();
    configCache.cleanup();
}, 5 * 60 * 1000);

/**
 * Decorador para métodos con caché
 */
function cached(ttl = null, cacheInstance = userCache) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function(...args) {
            const cacheKey = `${propertyKey}_${JSON.stringify(args)}`;

            return cacheInstance.getOrSet(cacheKey, () => {
                return originalMethod.apply(this, args);
            }, ttl);
        };

        return descriptor;
    };
}

/**
 * Invalidar caché por patrón
 */
function invalidateCache(pattern, cacheInstance = userCache) {
    const keysToDelete = [];

    for (const key of cacheInstance.store.keys()) {
        if (key.includes(pattern)) {
            keysToDelete.push(key);
        }
    }

    keysToDelete.forEach(key => cacheInstance.delete(key));

    if (keysToDelete.length > 0) {
        logger.info('Cache invalidated by pattern', { pattern, deletedKeys: keysToDelete.length });
    }
}

module.exports = {
    Cache,
    userCache,
    statsCache,
    configCache,
    cached,
    invalidateCache
};