/**
 * Pruebas Unitarias para Servicios
 * Pruebas básicas para validar la funcionalidad de los servicios creados
 */

const resenaService = require('../src/services/resenaService');
const pagoService = require('../src/services/pagoService');
const chatService = require('../src/services/chatService');
const inventarioService = require('../src/services/inventarioService');
const ticketService = require('../src/services/ticketService');

// Mock de base de datos para pruebas
jest.mock('../src/config/config/database', () => ({
    query: jest.fn()
}));

const db = require('../src/config/config/database');

describe('ResenaService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('createResena debería crear una reseña válida', async () => {
        const mockResenaData = {
            idUsuario: 'user123',
            idTaller: 'taller456',
            calificacion: 5,
            comentario: 'Excelente servicio',
            idCita: 'cita789'
        };

        // Mock de verificación de cita
        db.query
            .mockResolvedValueOnce([[{ idCita: 'cita789', estado: 'Completado' }]])
            .mockResolvedValueOnce([[]]) // No existe reseña previa
            .mockResolvedValueOnce([{ insertId: 1 }]);

        const result = await resenaService.createResena(mockResenaData);

        expect(result.success).toBe(true);
        expect(result.resena.idUsuario).toBe('user123');
        expect(result.resena.calificacion).toBe(5);
    });

    test('createResena debería fallar si ya existe reseña para la cita', async () => {
        const mockResenaData = {
            idUsuario: 'user123',
            idTaller: 'taller456',
            calificacion: 4,
            idCita: 'cita789'
        };

        // Mock de verificación de cita
        db.query
            .mockResolvedValueOnce([[{ idCita: 'cita789', estado: 'Completado' }]])
            .mockResolvedValueOnce([[{ idResena: 1 }]]); // Ya existe reseña

        const result = await resenaService.createResena(mockResenaData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Ya existe una reseña');
    });
});

describe('PagoService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('createPago debería crear un pago válido', async () => {
        const mockPagoData = {
            idCita: 'cita123',
            monto: 1500.50,
            metodoPago: 'tarjeta',
            descripcion: 'Pago por servicio de mantenimiento',
            idUsuario: 'user456'
        };

        // Mocks
        db.query
            .mockResolvedValueOnce([[{ idCita: 'cita123', costoEstimado: 2000 }]])
            .mockResolvedValueOnce([{ insertId: 1 }]);

        const result = await pagoService.createPago(mockPagoData);

        expect(result.success).toBe(true);
        expect(result.pago.monto).toBe(1500.50);
        expect(result.pago.metodoPago).toBe('tarjeta');
    });

    test('createPago debería fallar si el monto excede el límite', async () => {
        const mockPagoData = {
            idCita: 'cita123',
            monto: 2500.00, // Excede el 110% del costo estimado
            metodoPago: 'efectivo',
            idUsuario: 'user456'
        };

        db.query.mockResolvedValueOnce([[{ idCita: 'cita123', costoEstimado: 2000 }]]);

        const result = await pagoService.createPago(mockPagoData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('excede el límite');
    });
});

describe('ChatService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('enviarMensaje debería enviar un mensaje válido', async () => {
        const mockMensajeData = {
            idRemitente: 'user123',
            idDestinatario: 'user456',
            contenido: 'Hola, ¿cómo estás?',
            tipo: 'texto'
        };

        // Mocks
        db.query
            .mockResolvedValueOnce([[{ idUsuario: 'user123' }, { idUsuario: 'user456' }]])
            .mockResolvedValueOnce([{ insertId: 1 }]);

        const result = await chatService.enviarMensaje(mockMensajeData);

        expect(result.success).toBe(true);
        expect(result.mensaje.contenido).toBe('Hola, ¿cómo estás?');
        expect(result.mensaje.tipo).toBe('texto');
    });

    test('enviarMensaje debería fallar si un usuario no existe', async () => {
        const mockMensajeData = {
            idRemitente: 'user123',
            idDestinatario: 'user999', // Usuario no existe
            contenido: 'Mensaje de prueba'
        };

        db.query.mockResolvedValueOnce([[{ idUsuario: 'user123' }]]); // Solo un usuario

        const result = await chatService.enviarMensaje(mockMensajeData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('usuarios no existen');
    });
});

describe('InventarioService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('agregarItem debería agregar un item válido', async () => {
        const mockItemData = {
            nombre: 'Filtro de aceite',
            descripcion: 'Filtro de aceite sintético',
            cantidad: 50,
            precioUnitario: 25.99,
            categoria: 'Filtros'
        };
        const idTaller = 'taller123';

        // Mocks
        db.query
            .mockResolvedValueOnce([[{ idTaller: 'taller123' }]])
            .mockResolvedValueOnce([{ insertId: 1 }]);

        const result = await inventarioService.agregarItem({ idTaller, ...mockItemData });

        expect(result.success).toBe(true);
        expect(result.item.nombre).toBe('Filtro de aceite');
        expect(result.item.cantidad).toBe(50);
    });

    test('actualizarCantidad debería actualizar la cantidad correctamente', async () => {
        const idItem = 'item123';
        const idTaller = 'taller456';
        const nuevaCantidad = 75;

        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const result = await inventarioService.actualizarCantidad(idItem, idTaller, nuevaCantidad);

        expect(result).toBe(true);
        expect(db.query).toHaveBeenCalledWith(
            'UPDATE iteminventario SET cantidad = ? WHERE idItem = ? AND idTaller = ?',
            [75, 'item123', 'taller456']
        );
    });
});

describe('TicketService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('crearTicket debería crear un ticket válido', async () => {
        const mockTicketData = {
            titulo: 'Problema con la aplicación',
            descripcion: 'La app se cierra inesperadamente',
            categoria: 'Técnico',
            prioridad: 'media',
            idUsuario: 'user123'
        };

        db.query.mockResolvedValueOnce([{ insertId: 1 }]);

        const result = await ticketService.crearTicket(mockTicketData);

        expect(result.success).toBe(true);
        expect(result.ticket.titulo).toBe('Problema con la aplicación');
        expect(result.ticket.estado).toBe('Abierto');
    });

    test('agregarRespuesta debería agregar una respuesta válida', async () => {
        const idTicket = 'ticket123';
        const mockRespuestaData = {
            idUsuario: 'user456',
            contenido: 'Gracias por reportar el problema. Estamos investigando.',
            esStaff: true
        };

        // Mocks
        db.query
            .mockResolvedValueOnce([[{ idTicket: 'ticket123', estado: 'Abierto' }]])
            .mockResolvedValueOnce([{ insertId: 1 }])
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // Actualización de estado

        const result = await ticketService.agregarRespuesta(idTicket, mockRespuestaData);

        expect(result.success).toBe(true);
        expect(result.respuesta.contenido).toBe('Gracias por reportar el problema. Estamos investigando.');
        expect(result.respuesta.esStaff).toBe(true);
    });
});

// Pruebas de validación
describe('Validaciones', () => {
    const { validateResena, validatePago, validateMensaje, validateItemInventario, validateTicket } = require('../src/middleware/validation');

    test('validateResena debería validar reseña correcta', () => {
        const data = {
            idTaller: 'taller123',
            calificacion: 4,
            comentario: 'Buen servicio',
            idCita: 'cita456'
        };

        const result = validateResena(data);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('validateResena debería rechazar calificación inválida', () => {
        const data = {
            idTaller: 'taller123',
            calificacion: 6, // Inválida
            idCita: 'cita456'
        };

        const result = validateResena(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('calificacion debe ser un número entre 1 y 5');
    });

    test('validatePago debería validar pago correcto', () => {
        const data = {
            idCita: 'cita123',
            monto: 1500.00,
            metodoPago: 'tarjeta'
        };

        const result = validatePago(data);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('validateMensaje debería validar mensaje correcto', () => {
        const data = {
            idDestinatario: 'user456',
            contenido: 'Hola, ¿cómo estás?',
            tipo: 'texto'
        };

        const result = validateMensaje(data);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
});