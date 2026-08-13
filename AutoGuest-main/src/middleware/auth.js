function getSessionIdentity(req) {
    if (req.session && req.session.userId && req.session.role) {
        return {
            userId: req.session.userId,
            role: req.session.role,
            tallerId: req.session.tallerId || req.session.idTaller
        };
    }

    if (req.jwtUser && req.jwtUser.userId && req.jwtUser.role) {
        req.session = req.session || {};
        req.session.userId = req.jwtUser.userId;
        req.session.role = req.jwtUser.role;
        if (req.jwtUser.idTaller) {
            req.session.tallerId = req.jwtUser.idTaller;
            req.session.idTaller = req.jwtUser.idTaller;
        }
        return {
            userId: req.jwtUser.userId,
            role: req.jwtUser.role,
            tallerId: req.jwtUser.idTaller
        };
    }

    return null;
}

function ensureAuthenticated(req, res, next) {
    if (getSessionIdentity(req)) {
        return next();
    }
    return res.status(401).json({ error: 'Acceso no autorizado. Debes iniciar sesión.' });
}

function ensureRole(role) {
    return (req, res, next) => {
        const identity = getSessionIdentity(req);
        if (identity && identity.role === role) {
            return next();
        }
        return res.status(401).json({ error: 'Acceso no autorizado. Rol inválido.' });
    };
}

function ensureTaller(req, res, next) {
    return ensureRole('taller')(req, res, next);
}

function ensureMecanico(req, res, next) {
    return ensureRole('mecanico')(req, res, next);
}

function ensureCliente(req, res, next) {
    return ensureRole('cliente')(req, res, next);
}

module.exports = {
    authenticate: ensureAuthenticated,
    ensureAuthenticated,
    ensureRole,
    ensureTaller,
    ensureMecanico,
    ensureCliente,
    getSessionIdentity
};
