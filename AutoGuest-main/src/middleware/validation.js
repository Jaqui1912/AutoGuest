/**
 * Middleware de validación de entrada
 * Proporciona funciones para validar datos de entrada en las rutas
 */

const validateRequired = (fields) => {
    return (req, res, next) => {
        const missingFields = [];

        fields.forEach(field => {
            if (!req.body[field] && req.body[field] !== 0) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Campos requeridos faltantes',
                missingFields
            });
        }

        next();
    };
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone) => {
    // Validar formato de teléfono (permitir varios formatos comunes)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

const validateDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

const validateTime = (timeString) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
};

const validateFutureDateTime = (date, time) => {
    const dateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    return dateTime > now;
};

const validateAppointmentData = (req, res, next) => {
    const { idTaller, idVehiculo, fecha, hora, servicio } = req.body;

    const errors = [];

    if (!idTaller) errors.push('idTaller es requerido');
    if (!idVehiculo) errors.push('idVehiculo es requerido');
    if (!fecha) errors.push('fecha es requerida');
    if (!hora) errors.push('hora es requerida');
    if (!servicio) errors.push('servicio es requerido');

    if (fecha && !validateDate(fecha)) {
        errors.push('fecha debe tener formato válido (YYYY-MM-DD)');
    }

    if (hora && !validateTime(hora)) {
        errors.push('hora debe tener formato válido (HH:mm)');
    }

    if (fecha && hora && !validateFutureDateTime(fecha, hora)) {
        errors.push('la cita debe ser en el futuro');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de cita inválidos',
            details: errors
        });
    }

    next();
};

const validateUserData = (req, res, next) => {
    const { nombre, email, password } = req.body;
    const errors = [];

    if (nombre && (nombre.length < 2 || nombre.length > 100)) {
        errors.push('nombre debe tener entre 2 y 100 caracteres');
    }

    if (email && !validateEmail(email)) {
        errors.push('email debe tener formato válido');
    }

    if (password && password.length < 6) {
        errors.push('password debe tener al menos 6 caracteres');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de usuario inválidos',
            details: errors
        });
    }

    next();
};

const validateVehicleData = (req, res, next) => {
    const { marca, modelo, anio, placa } = req.body;
    const errors = [];

    if (!marca || marca.length < 2) errors.push('marca es requerida y debe tener al menos 2 caracteres');
    if (!modelo || modelo.length < 2) errors.push('modelo es requerido y debe tener al menos 2 caracteres');
    if (!anio || anio < 1900 || anio > new Date().getFullYear() + 1) {
        errors.push('año debe ser válido');
    }
    if (!placa || placa.length < 3) errors.push('placa es requerida y debe tener al menos 3 caracteres');

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de vehículo inválidos',
            details: errors
        });
    }

    next();
};

const validateResena = (data) => {
    const { idTaller, calificacion, comentario, idCita } = data;
    const errors = [];

    if (!idTaller) errors.push('idTaller es requerido');
    if (!calificacion || calificacion < 1 || calificacion > 5) {
        errors.push('calificacion debe ser un número entre 1 y 5');
    }
    if (!idCita) errors.push('idCita es requerido');

    if (comentario && comentario.length > 500) {
        errors.push('comentario no puede exceder 500 caracteres');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validatePago = (data) => {
    const { idCita, monto, metodoPago } = data;
    const errors = [];

    if (!idCita) errors.push('idCita es requerido');
    if (!monto || monto <= 0) errors.push('monto debe ser un número positivo');
    if (!metodoPago) errors.push('metodoPago es requerido');

    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia', 'paypal'];
    if (metodoPago && !metodosValidos.includes(metodoPago.toLowerCase())) {
        errors.push('metodoPago debe ser uno de: efectivo, tarjeta, transferencia, paypal');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateMensaje = (data) => {
    const { idDestinatario, contenido, tipo = 'texto' } = data;
    const errors = [];

    if (!idDestinatario) errors.push('idDestinatario es requerido');
    if (!contenido || contenido.trim().length === 0) errors.push('contenido es requerido');

    const tiposValidos = ['texto', 'imagen', 'archivo'];
    if (tipo && !tiposValidos.includes(tipo.toLowerCase())) {
        errors.push('tipo debe ser uno de: texto, imagen, archivo');
    }

    if (contenido && contenido.length > 1000) {
        errors.push('contenido no puede exceder 1000 caracteres');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateItemInventario = (data) => {
    const { nombre, stock, precio } = data;
    const errors = [];

    if (!nombre || nombre.trim().length === 0) errors.push('nombre es requerido');
    if (stock === undefined || stock === null || Number(stock) < 0) errors.push('stock debe ser un número no negativo');

    if (nombre && nombre.length > 100) {
        errors.push('nombre no puede exceder 100 caracteres');
    }

    if (precio !== undefined && precio !== null && Number(precio) < 0) {
        errors.push('precio debe ser un número no negativo');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateTicket = (data) => {
    const { titulo, descripcion, categoria, prioridad = 'media' } = data;
    const errors = [];

    if (!titulo || titulo.trim().length === 0) errors.push('titulo es requerido');
    if (!descripcion || descripcion.trim().length === 0) errors.push('descripcion es requerida');

    if (titulo && titulo.length > 200) {
        errors.push('titulo no puede exceder 200 caracteres');
    }

    if (descripcion && descripcion.length > 2000) {
        errors.push('descripcion no puede exceder 2000 caracteres');
    }

    const prioridadesValidas = ['baja', 'media', 'alta', 'urgente'];
    if (prioridad && !prioridadesValidas.includes(prioridad.toLowerCase())) {
        errors.push('prioridad debe ser una de: baja, media, alta, urgente');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateRespuestaTicket = (data) => {
    const { contenido } = data;
    const errors = [];

    if (!contenido || contenido.trim().length === 0) errors.push('contenido es requerido');

    if (contenido && contenido.length > 2000) {
        errors.push('contenido no puede exceder 2000 caracteres');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateRequired,
    validateEmail,
    validatePhone,
    validateDate,
    validateTime,
    validateFutureDateTime,
    validateAppointmentData,
    validateUserData,
    validateVehicleData,
    validateResena,
    validatePago,
    validateMensaje,
    validateItemInventario,
    validateTicket,
    validateRespuestaTicket
};