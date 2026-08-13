
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Para parsear body de requests como JSON

// Configuración de la conexión a la base de datos
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Conectar a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conectado exitosamente a la base de datos MariaDB.');
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('El servidor backend está funcionando.');
});

const jwt = require('jsonwebtoken');

// Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

    if (token == null) return res.sendStatus(401); // No hay token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token no es válido
        req.user = user;
        next();
    });
}

// ... (código existente) ...

// ENDPOINT PARA AÑADIR UN VEHÍCULO (Protegido)
app.post('/api/vehiculos', authenticateToken, async (req, res) => {
    let { placa, marca } = req.body;

    if (!placa || !marca) {
        return res.status(400).json({ mensaje: 'La placa y la marca son obligatorias.' });
    }

    // Validación y limpieza de la placa
    placa = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (placa.length < 5) {
        return res.status(400).json({ mensaje: 'La placa no es válida.' });
    }

    const idVehiculo = `VEHI-${uuidv4()}`;
    const idDuenio = req.user.id; // Obtenido del token

    const query = 'INSERT INTO vehiculo (idVehiculo, placa, marca, idDuenio) VALUES (?, ?, ?, ?)';
    db.query(query, [idVehiculo, placa, marca, idDuenio], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ mensaje: 'La placa ya está registrada.' });
            }
            console.error('Error al insertar vehículo:', err);
            return res.status(500).json({ mensaje: 'Error al registrar el vehículo.' });
        }
        res.status(201).json({ idVehiculo, placa, marca, idDuenio });
    });
});

// ENDPOINT PARA OBTENER LOS VEHÍCULOS DE UN CLIENTE (Protegido)
app.get('/api/vehiculos', authenticateToken, (req, res) => {
    const idDuenio = req.user.id;

    const query = 'SELECT * FROM vehiculo WHERE idDuenio = ?';
    db.query(query, [idDuenio], (err, vehiculos) => {
        if (err) {
            console.error('Error al obtener vehículos:', err);
            return res.status(500).json({ mensaje: 'Error al obtener los vehículos.' });
        }
        res.json(vehiculos);
    });
});

// ENDPOINT PARA OBTENER LAS CITAS DE UN CLIENTE (Protegido)
app.get('/api/citas', authenticateToken, (req, res) => {
    const idCliente = req.user.id;
    console.log('DEBUG: Petición GET /api/citas recibida para cliente:', idCliente);
    // La consulta une varias tablas para obtener datos más completos
    const query = `
        SELECT 
            c.idCita, c.fechaHora, c.estado,
            v.marca as vehiculoMarca, v.placa as vehiculoPlaca,
            t.nombre as tallerNombre
        FROM cita c
        JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
        LEFT JOIN mecanico m ON c.idMecanico = m.idUsuario
        LEFT JOIN taller t ON m.idTaller = t.idTaller
        WHERE c.idCliente = ?
        ORDER BY c.fechaHora DESC
    `;
    db.query(query, [idCliente], (err, citas) => {
        if (err) {
            console.error('Error al obtener citas:', err);
            return res.status(500).json({ mensaje: 'Error al obtener las citas.' });
        }
        console.log('DEBUG: Citas obtenidas de DB para cliente', idCliente, ':', citas);
        res.json(citas);
    });
});

// ENDPOINT PARA OBTENER LA LISTA DE PRODUCTOS (Protegido)
app.get('/api/productos', authenticateToken, (req, res) => {
    console.log('DEBUG: Petición GET /api/productos recibida.');
    const query = 'SELECT idItem, nombre, precio, stock FROM iteminventario WHERE esParaVenta = 1 AND stock > 0';
    db.query(query, (err, productos) => {
        if (err) {
            console.error('Error al obtener productos:', err);
            return res.status(500).json({ mensaje: 'Error al obtener la lista de productos.' });
        }
        console.log('DEBUG: Productos obtenidos de DB:', productos);
        res.json(productos);
    });
});

// ENDPOINT PARA CREAR UNA CITA (Protegido)
app.post('/api/citas', authenticateToken, async (req, res) => {
    const { idVehiculo, fechaHora } = req.body; // idMecanico ya no viene del body, se asignará
    const idCliente = req.user.id;

    console.log('DEBUG: Petición POST /api/citas recibida.');
    console.log('DEBUG: Datos recibidos:', { idVehiculo, fechaHora, idCliente });

    if (!idVehiculo || !fechaHora) {
        return res.status(400).json({ mensaje: 'El vehículo y la fecha son obligatorios.' });
    }

    // Validación: La fecha y hora no puede ser en el pasado
    const fechaCita = new Date(fechaHora);
    const ahora = new Date();
    if (fechaCita < ahora) {
        return res.status(400).json({ mensaje: 'No se puede agendar una cita en el pasado.' });
    }

    // Verificar que el vehículo pertenece al cliente
    const vehiculoQuery = 'SELECT * FROM vehiculo WHERE idVehiculo = ? AND idDuenio = ?';
    db.query(vehiculoQuery, [idVehiculo, idCliente], async (err, vehiculos) => {
        if (err || vehiculos.length === 0) {
            return res.status(403).json({ mensaje: 'Acción no permitida. El vehículo no pertenece a este usuario.' });
        }

        // --- Asignación temporal de un mecánico por defecto ---
        let idMecanicoAsignado = null;
        try {
            const defaultMecanicoQuery = 'SELECT idUsuario FROM mecanico LIMIT 1';
            const [mecanicos] = await new Promise((resolve, reject) => {
                db.query(defaultMecanicoQuery, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
            if (mecanicos.length > 0) {
                idMecanicoAsignado = mecanicos[0].idUsuario;
                console.log('DEBUG: Mecánico por defecto asignado:', idMecanicoAsignado);
            } else {
                console.warn('ADVERTENCIA: No se encontraron mecánicos en la base de datos para asignar por defecto.');
            }
        } catch (mecanicoErr) {
            console.error('Error al buscar mecánico por defecto:', mecanicoErr);
        }
        // --- Fin asignación temporal ---

        const idCita = `CITA-${uuidv4()}`;
        const estadoInicial = 'Pendiente de Cotización';

        const insertQuery = 'INSERT INTO cita (idCita, fechaHora, estado, idCliente, idVehiculo, idMecanico) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(insertQuery, [idCita, fechaHora, estadoInicial, idCliente, idVehiculo, idMecanicoAsignado], (err, result) => {
            if (err) {
                console.error('Error al crear la cita:', err);
                return res.status(500).json({ mensaje: 'Error al crear la cita.' });
            }
            console.log('DEBUG: Cita insertada en DB:', { idCita, fechaHora, estado: estadoInicial, idCliente, idVehiculo, idMecanico: idMecanicoAsignado });
            res.status(201).json({ idCita, fechaHora, estado: estadoInicial, idCliente, idVehiculo, idMecanico: idMecanicoAsignado });
        });
    });
});

// ENDPOINT PARA CREAR UN PEDIDO (Protegido)
app.post('/api/pedidos', authenticateToken, async (req, res) => {
    const { items } = req.body; // items es un array de { idItemInventario, cantidad, precioUnitario }
    const idCliente = req.user.id;

    console.log('DEBUG: Petición POST /api/pedidos recibida.');
    console.log('DEBUG: Datos recibidos:', { items, idCliente });

    if (!items || items.length === 0) {
        return res.status(400).json({ mensaje: 'El pedido no contiene ítems.' });
    }

    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Error al iniciar la transacción para pedido:', err);
            return res.status(500).json({ mensaje: 'Error en el servidor.' });
        }

        try {
            // 1. Crear el pedido principal
            const idPedido = `PEDIDO-${uuidv4()}`;
            const estadoPedido = 'Pendiente de Pago';
            const pedidoQuery = 'INSERT INTO pedido (idPedido, estado, idCliente) VALUES (?, ?, ?)';
            await new Promise((resolve, reject) => {
                db.query(pedidoQuery, [idPedido, estadoPedido, idCliente], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            // 2. Procesar cada ítem del pedido
            for (const item of items) {
                const { idItemInventario, cantidad, precioUnitario } = item;
                console.log('DEBUG Pedido: Procesando ítem:', { idItemInventario, cantidad, precioUnitario });

                // Validar stock y precio actual del producto
                const stockQuery = 'SELECT stock, precio FROM iteminventario WHERE idItem = ? AND esParaVenta = 1';
                const stockResults = await new Promise((resolve, reject) => {
                    db.query(stockQuery, [idItemInventario], (err, results) => {
                        if (err) return reject(err);
                        resolve(results); // results here is an array of rows
                    });
                });

                const productInStock = stockResults[0]; // Acceder al primer elemento del array de resultados

                console.log('DEBUG Pedido: Resultado de stock para', idItemInventario, ':', productInStock);

                if (!productInStock) { // Check if product was found at all
                    throw new Error(`Producto no disponible o no apto para venta: ${idItemInventario}`);
                }
                if (productInStock.stock < cantidad) {
                    throw new Error(`Stock insuficiente para ${idItemInventario}. Disponible: ${productInStock.stock}, Solicitado: ${cantidad}`);
                }
                // Opcional: verificar que el precioUnitario enviado por el cliente coincida con el de la DB
                // if (productsInStock[0].precio !== precioUnitario) {
                //     throw new Error(`El precio del producto ${idItemInventario} ha cambiado.`);
                // }

                // Insertar línea de pedido
                const lineaPedidoQuery = 'INSERT INTO lineapedido (idPedido, idItemInventario, cantidad) VALUES (?, ?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(lineaPedidoQuery, [idPedido, idItemInventario, cantidad], (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });

                // Actualizar stock
                const updateStockQuery = 'UPDATE iteminventario SET stock = stock - ? WHERE idItem = ?';
                await new Promise((resolve, reject) => {
                    db.query(updateStockQuery, [cantidad, idItemInventario], (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }

            db.commit((err) => {
                if (err) {
                    console.error('Error al confirmar la transacción de pedido:', err);
                    return db.rollback(() => { throw err; });
                }
                console.log('DEBUG: Pedido creado con éxito:', idPedido);
                res.status(201).json({ mensaje: 'Pedido creado con éxito.', idPedido: idPedido });
            });

        } catch (error) {
            console.error('Error en el proceso de creación de pedido:', error);
            db.rollback(() => {
                res.status(500).json({ mensaje: `Error al crear el pedido: ${error.message}` });
            });
        }
    });
});

// ENDPOINT PARA OBTENER UN TICKET DE PEDIDO (Simulación)
app.get('/api/pedidos/:id/ticket', authenticateToken, async (req, res) => {
    const idPedido = req.params.id;
    const idCliente = req.user.id;

    console.log('DEBUG: Petición GET /api/pedidos/:id/ticket recibida para pedido:', idPedido, 'cliente:', idCliente);

    try {
        // 1. Verificar que el pedido existe y pertenece al cliente
        const pedidoQuery = 'SELECT * FROM pedido WHERE idPedido = ? AND idCliente = ?';
        const [pedidos] = await new Promise((resolve, reject) => {
            db.query(pedidoQuery, [idPedido, idCliente], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (pedidos.length === 0) {
            return res.status(404).json({ mensaje: 'Pedido no encontrado o no pertenece a este usuario.' });
        }

        const pedido = pedidos[0];

        // 2. Obtener los ítems del pedido
        const itemsQuery = `
            SELECT lp.cantidad, ii.nombre, ii.precio
            FROM lineapedido lp
            JOIN iteminventario ii ON lp.idItemInventario = ii.idItem
            WHERE lp.idPedido = ?
        `;
        const [items] = await new Promise((resolve, reject) => {
            db.query(itemsQuery, [idPedido], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // 3. Formatear el ticket
        let ticketContent = `--- Ticket de Pedido AutoGuest ---\n`;
        ticketContent += `ID de Pedido: ${pedido.idPedido}\n`;
        ticketContent += `Fecha: ${new Date(pedido.fechaCreacion).toLocaleString()}\n`; // Asumiendo que tienes una columna fechaCreacion
        ticketContent += `Estado: ${pedido.estado}\n`;
        ticketContent += `Cliente ID: ${pedido.idCliente}\n`;
        ticketContent += `-----------------------------------\n`;
        ticketContent += `Productos:\n`;
        let total = 0;
        items.forEach(item => {
            const subtotal = item.cantidad * item.precio;
            total += subtotal;
            ticketContent += `- ${item.nombre} (x${item.cantidad}) @ $${item.precio.toFixed(2)} = $${subtotal.toFixed(2)}\n`;
        });
        ticketContent += `-----------------------------------\n`;
        ticketContent += `Total: $${total.toFixed(2)}\n`;
        ticketContent += `-----------------------------------\n`;
        ticketContent += `Gracias por tu compra!\n`;

        console.log('DEBUG: Ticket generado para pedido:', idPedido);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="ticket_pedido_${idPedido}.txt"`);
        res.send(ticketContent);

    } catch (error) {
        console.error('Error al generar ticket:', error);
        res.status(500).json({ mensaje: 'Error al generar el ticket.' });
    }
});

// ENDPOINT PARA OBTENER LA LISTA DE TALLERES (Protegido)
app.get('/api/talleres', authenticateToken, (req, res) => {
    console.log('DEBUG: Petición GET /api/talleres recibida.');
    const query = 'SELECT idTaller, nombre, direccion FROM taller';
    db.query(query, (err, talleres) => {
        if (err) {
            console.error('Error al obtener talleres:', err);
            return res.status(500).json({ mensaje: 'Error al obtener la lista de talleres.' });
        }
        console.log('DEBUG: Talleres obtenidos de DB:', talleres);
        res.json(talleres);
    });
});

// ENDPOINT PARA OBTENER LAS CITAS DE UN TALLER ESPECÍFICO (Protegido)
app.get('/api/taller/citas', authenticateToken, async (req, res) => {
    const idUsuarioAdmin = req.user.id;

    console.log('DEBUG: Petición GET /api/taller/citas recibida para admin:', idUsuarioAdmin);

    // 1. Verificar que el usuario es un administrador de taller y obtener su idTaller
    const adminQuery = 'SELECT idTaller FROM administrador WHERE idUsuario = ?';
    const [admins] = await new Promise((resolve, reject) => {
        db.query(adminQuery, [idUsuarioAdmin], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (admins.length === 0) {
        return res.status(403).json({ mensaje: 'Acceso denegado. El usuario no es un administrador de taller.' });
    }
    const idTaller = admins[0].idTaller;

    // 2. Obtener las citas asociadas a ese taller
    const citasQuery = `
        SELECT 
            c.idCita, c.fechaHora, c.estado,
            v.marca as vehiculoMarca, v.placa as vehiculoPlaca,
            u.nombre as clienteNombre, u.email as clienteEmail
        FROM cita c
        JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
        JOIN usuario u ON c.idCliente = u.idUsuario
        LEFT JOIN mecanico m ON c.idMecanico = m.idUsuario
        WHERE m.idTaller = ? OR c.idCita IN (
            SELECT c2.idCita FROM cita c2
            LEFT JOIN mecanico m2 ON c2.idMecanico = m2.idUsuario
            WHERE m2.idTaller IS NULL AND c2.idCita IN (
                SELECT c3.idCita FROM cita c3
                LEFT JOIN taller t3 ON c3.idTaller = t3.idTaller -- Asumiendo que cita tiene idTaller o se puede inferir
                WHERE t3.idTaller = ?
            )
        )
        ORDER BY c.fechaHora DESC
    `;
    // Nota: La lógica de WHERE para citas sin mecánico asignado a un taller específico puede ser compleja.
    // Por simplicidad, asumiré que las citas se asocian a un taller a través de un mecánico,
    // o que la tabla 'cita' tendrá una columna 'idTaller' en el futuro.
    // Por ahora, la consulta se basa en el idTaller del mecánico asignado.
    // Si una cita no tiene mecánico, no se mostrará aquí a menos que se añada idTaller a la tabla cita.

    // REVISIÓN: La tabla 'cita' no tiene 'idTaller'. La asociación es a través de 'idMecanico'.
    // Si 'idMecanico' es NULL, la cita no está directamente asociada a un taller en esta estructura.
    // Para que un taller vea TODAS sus citas (incluyendo las no asignadas a un mecánico específico),
    // la tabla 'cita' necesitaría un 'idTaller' o una lógica más compleja.
    // Por ahora, solo mostraremos las citas que tienen un mecánico asignado a este taller.

    const simplifiedCitasQuery = `
        SELECT 
            c.idCita, c.fechaHora, c.estado,
            v.marca as vehiculoMarca, v.placa as vehiculoPlaca,
            u.nombre as clienteNombre, u.email as clienteEmail,
            m.nombre as mecanicoNombre
        FROM cita c
        JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
        JOIN usuario u ON c.idCliente = u.idUsuario
        LEFT JOIN mecanico mec ON c.idMecanico = mec.idUsuario
        LEFT JOIN usuario m ON mec.idUsuario = m.idUsuario -- Para obtener el nombre del mecánico
        WHERE mec.idTaller = ? OR (c.idMecanico IS NULL AND c.idCita IN (
            SELECT c2.idCita FROM cita c2
            LEFT JOIN mecanico m2 ON c2.idMecanico = m2.idUsuario
            WHERE m2.idTaller = ? OR c2.idCita IN (
                SELECT c3.idCita FROM cita c3
                WHERE c3.idCita IN (
                    SELECT c4.idCita FROM cita c4
                    LEFT JOIN vehiculo v4 ON c4.idVehiculo = v4.idVehiculo
                    LEFT JOIN cliente cli4 ON v4.idDuenio = cli4.idUsuario
                    LEFT JOIN usuario u4 ON cli4.idUsuario = u4.idUsuario
                    -- Aquí necesitaríamos una forma de saber a qué taller se agendó la cita si no hay mecánico
                    -- Por ahora, esta parte es un placeholder.
                    -- La forma más robusta sería añadir idTaller a la tabla 'cita'.
                )
            )
        ))
        ORDER BY c.fechaHora DESC
    `;

    // REVISIÓN FINAL DE LA CONSULTA:
    // La tabla 'cita' no tiene 'idTaller'. La única forma de asociar una cita a un taller
    // es a través del 'idMecanico' que está asignado a un 'idTaller'.
    // Si una cita no tiene 'idMecanico', no hay forma directa de saber a qué taller pertenece
    // con la estructura actual.
    // Para que un taller vea TODAS sus citas, la tabla 'cita' debería tener un 'idTaller'.
    // Por ahora, la consulta solo mostrará citas asignadas a un mecánico de ese taller.

    const finalCitasQuery = `
        SELECT 
            c.idCita, c.fechaHora, c.estado,
            v.marca as vehiculoMarca, v.placa as vehiculoPlaca,
            u.nombre as clienteNombre, u.email as clienteEmail,
            um.nombre as mecanicoNombre
        FROM cita c
        JOIN vehiculo v ON c.idVehiculo = v.idVehiculo
        JOIN usuario u ON c.idCliente = u.idUsuario
        LEFT JOIN mecanico mec ON c.idMecanico = mec.idUsuario
        LEFT JOIN usuario um ON mec.idUsuario = um.idUsuario -- Para obtener el nombre del mecánico
        WHERE mec.idTaller = ?
        ORDER BY c.fechaHora DESC
    `;

    const [citas] = await new Promise((resolve, reject) => {
        db.query(finalCitasQuery, [idTaller], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    console.log('DEBUG: Citas obtenidas para taller', idTaller, ':', citas);
    res.json(citas);
});

// ENDPOINT PARA ACTUALIZAR EL ESTADO DE UNA CITA (Protegido)
app.put('/api/citas/:id/estado', authenticateToken, async (req, res) => {
    const idCita = req.params.id;
    const { estado } = req.body;
    const idUsuarioAdmin = req.user.id;

    console.log('DEBUG: Petición PUT /api/citas/:id/estado recibida para cita:', idCita, 'estado:', estado, 'admin:', idUsuarioAdmin);

    if (!estado) {
        return res.status(400).json({ mensaje: 'El estado es obligatorio.' });
    }

    // 1. Verificar que el usuario es un administrador de taller y obtener su idTaller
    const adminQuery = 'SELECT idTaller FROM administrador WHERE idUsuario = ?';
    const [admins] = await new Promise((resolve, reject) => {
        db.query(adminQuery, [idUsuarioAdmin], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (admins.length === 0) {
        return res.status(403).json({ mensaje: 'Acceso denegado. El usuario no es un administrador de taller.' });
    }
    const idTaller = admins[0].idTaller;

    // 2. Verificar que la cita pertenece a este taller
    const citaQuery = `
        SELECT c.idCita
        FROM cita c
        LEFT JOIN mecanico mec ON c.idMecanico = mec.idUsuario
        WHERE c.idCita = ? AND mec.idTaller = ?
    `;
    const [citas] = await new Promise((resolve, reject) => {
        db.query(citaQuery, [idCita, idTaller], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (citas.length === 0) {
        return res.status(403).json({ mensaje: 'Acceso denegado. La cita no pertenece a este taller.' });
    }

    // 3. Actualizar el estado de la cita
    const updateQuery = 'UPDATE cita SET estado = ? WHERE idCita = ?';
    db.query(updateQuery, [estado, idCita], (err, result) => {
        if (err) {
            console.error('Error al actualizar estado de cita:', err);
            return res.status(500).json({ mensaje: 'Error al actualizar el estado de la cita.' });
        }
        console.log('DEBUG: Estado de cita', idCita, 'actualizado a', estado);
        res.json({ mensaje: 'Estado de cita actualizado con éxito.' });
    });
});

// ENDPOINTS PARA GESTIÓN DE SERVICIOS DE TALLER (Protegidos)

// GET /api/taller/servicios - Obtener todos los servicios del taller
app.get('/api/taller/servicios', authenticateToken, async (req, res) => {
    const idUsuarioAdmin = req.user.id;
    console.log('DEBUG: Petición GET /api/taller/servicios recibida para admin:', idUsuarioAdmin);

    const adminQuery = 'SELECT idTaller FROM administrador WHERE idUsuario = ?';
    const [admins] = await new Promise((resolve, reject) => {
        db.query(adminQuery, [idUsuarioAdmin], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (admins.length === 0) {
        return res.status(403).json({ mensaje: 'Acceso denegado. El usuario no es un administrador de taller.' });
    }
    const idTaller = admins[0].idTaller;

    const query = 'SELECT * FROM iteminventario WHERE idTaller = ? AND esParaServicio = 1';
    db.query(query, [idTaller], (err, servicios) => {
        if (err) {
            console.error('Error al obtener servicios:', err);
            return res.status(500).json({ mensaje: 'Error al obtener la lista de servicios.' });
        }
        console.log('DEBUG: Servicios obtenidos para taller', idTaller, ':', servicios);
        res.json(servicios);
    });
});

// POST /api/taller/servicios - Crear un nuevo servicio
app.post('/api/taller/servicios', authenticateToken, async (req, res) => {
    const { nombre, descripcion, precio } = req.body;
    const idUsuarioAdmin = req.user.id;

    console.log('DEBUG: Petición POST /api/taller/servicios recibida para admin:', idUsuarioAdmin);

    if (!nombre || !descripcion || !precio) {
        return res.status(400).json({ mensaje: 'Nombre, descripción y precio son obligatorios.' });
    }

    const adminQuery = 'SELECT idTaller FROM administrador WHERE idUsuario = ?';
    const [admins] = await new Promise((resolve, reject) => {
        db.query(adminQuery, [idUsuarioAdmin], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (admins.length === 0) {
        return res.status(403).json({ mensaje: 'Acceso denegado. El usuario no es un administrador de taller.' });
    }
    const idTaller = admins[0].idTaller;

    const idItem = `SERV-${uuidv4()}`; // ID para el servicio
    const insertQuery = 'INSERT INTO iteminventario (idItem, nombre, descripcion, precio, esParaServicio, idTaller) VALUES (?, ?, ?, ?, 1, ?)';
    db.query(insertQuery, [idItem, nombre, descripcion, precio, idTaller], (err, result) => {
        if (err) {
            console.error('Error al crear servicio:', err);
            return res.status(500).json({ mensaje: 'Error al crear el servicio.' });
        }
        console.log('DEBUG: Servicio creado con éxito:', idItem);
        res.status(201).json({ mensaje: 'Servicio creado con éxito.', idItem: idItem });
    });
});

// PUT /api/taller/servicios/:id - Actualizar un servicio existente
app.put('/api/taller/servicios/:id', authenticateToken, async (req, res) => {
    const idItem = req.params.id;
    const { nombre, descripcion, precio } = req.body;
    const idUsuarioAdmin = req.user.id;

    console.log('DEBUG: Petición PUT /api/taller/servicios/:id recibida para servicio:', idItem, 'admin:', idUsuarioAdmin);

    if (!nombre || !descripcion || !precio) {
        return res.status(400).json({ mensaje: 'Nombre, descripción y precio son obligatorios.' });
    }

    const adminQuery = 'SELECT idTaller FROM administrador WHERE idUsuario = ?';
    const [admins] = await new Promise((resolve, reject) => {
        db.query(adminQuery, [idUsuarioAdmin], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (admins.length === 0) {
        return res.status(403).json({ mensaje: 'Acceso denegado. El usuario no es un administrador de taller.' });
    }
    const idTaller = admins[0].idTaller;

    // Verificar que el servicio pertenece a este taller
    const checkQuery = 'SELECT idItem FROM iteminventario WHERE idItem = ? AND idTaller = ? AND esParaServicio = 1';
    const [items] = await new Promise((resolve, reject) => {
        db.query(checkQuery, [idItem, idTaller], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (items.length === 0) {
        return res.status(404).json({ mensaje: 'Servicio no encontrado o no pertenece a este taller.' });
    }

    const updateQuery = 'UPDATE iteminventario SET nombre = ?, descripcion = ?, precio = ? WHERE idItem = ?';
    db.query(updateQuery, [nombre, descripcion, precio, idItem], (err, result) => {
        if (err) {
            console.error('Error al actualizar servicio:', err);
            return res.status(500).json({ mensaje: 'Error al actualizar el servicio.' });
        }
        console.log('DEBUG: Servicio', idItem, 'actualizado con éxito.');
        res.json({ mensaje: 'Servicio actualizado con éxito.' });
    });
});

// DELETE /api/taller/servicios/:id - Eliminar un servicio
app.delete('/api/taller/servicios/:id', authenticateToken, async (req, res) => {
    const idItem = req.params.id;
    const idUsuarioAdmin = req.user.id;

    console.log('DEBUG: Petición DELETE /api/taller/servicios/:id recibida para servicio:', idItem, 'admin:', idUsuarioAdmin);

    const adminQuery = 'SELECT idTaller FROM administrador WHERE idUsuario = ?';
    const [admins] = await new Promise((resolve, reject) => {
        db.query(adminQuery, [idUsuarioAdmin], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (admins.length === 0) {
        return res.status(403).json({ mensaje: 'Acceso denegado. El usuario no es un administrador de taller.' });
    }
    const idTaller = admins[0].idTaller;

    // Verificar que el servicio pertenece a este taller
    const checkQuery = 'SELECT idItem FROM iteminventario WHERE idItem = ? AND idTaller = ? AND esParaServicio = 1';
    const [items] = await new Promise((resolve, reject) => {
        db.query(checkQuery, [idItem, idTaller], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (items.length === 0) {
        return res.status(404).json({ mensaje: 'Servicio no encontrado o no pertenece a este taller.' });
    }

    const deleteQuery = 'DELETE FROM iteminventario WHERE idItem = ?';
    db.query(deleteQuery, [idItem], (err, result) => {
        if (err) {
            console.error('Error al eliminar servicio:', err);
            return res.status(500).json({ mensaje: 'Error al eliminar el servicio.' });
        }
        console.log('DEBUG: Servicio', idItem, 'eliminado con éxito.');
        res.json({ mensaje: 'Servicio eliminado con éxito.' });
    });
});



// ... (código existente) ...

// ENDPOINT DE LOGIN UNIFICADO
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios.' });
    }

    const userQuery = 'SELECT * FROM usuario WHERE email = ?';
    db.query(userQuery, [email], async (err, users) => {
        if (err) {
            console.error('Error en la consulta de usuario:', err);
            return res.status(500).json({ mensaje: 'Error interno del servidor.' });
        }

        if (users.length === 0) {
            return res.status(404).json({ mensaje: 'El usuario no existe.' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta.' });
        }

        // Determinar el rol del usuario de forma explícita
        db.query('SELECT * FROM administrador WHERE idUsuario = ?', [user.idUsuario], (err, admins) => {
            if (err) {
                console.error('Error al verificar rol de administrador:', err);
                return res.status(500).json({ mensaje: 'Error interno del servidor al verificar rol.' });
            }

            if (admins.length > 0) {
                // Es un administrador de taller
                const payload = { id: user.idUsuario, role: 'taller' };
                const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
                return res.json({ mensaje: 'Inicio de sesión exitoso', token: token, role: 'taller' });
            }

            // Si no es administrador, verificar si es cliente
            db.query('SELECT * FROM cliente WHERE idUsuario = ?', [user.idUsuario], (err, clientes) => {
                if (err) {
                    console.error('Error al verificar rol de cliente:', err);
                    return res.status(500).json({ mensaje: 'Error interno del servidor al verificar rol.' });
                }

                if (clientes.length > 0) {
                    // Es un cliente
                    const payload = { id: user.idUsuario, role: 'cliente' };
                    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
                    return res.json({ mensaje: 'Inicio de sesión exitoso', token: token, role: 'cliente' });
                }

                // Si no es ni administrador ni cliente
                return res.status(403).json({ mensaje: 'Usuario sin rol asignado. Contacte a soporte.' });
            });
        });
    });
});


// ENDPOINT PARA REGISTRO DE CLIENTE
app.post('/api/registro/cliente', async (req, res) => {
    const { nombre, email, password } = req.body;

    // Validación simple
    if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generar un ID de usuario único
        const idUsuario = `USER-${uuidv4()}`;

        // Iniciar transacción
        db.beginTransaction(async (err) => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                return res.status(500).json({ mensaje: 'Error en el servidor.' });
            }

            // 1. Insertar en la tabla `usuario`
            const usuarioQuery = 'INSERT INTO usuario (idUsuario, nombre, email, password) VALUES (?, ?, ?, ?)';
            db.query(usuarioQuery, [idUsuario, nombre, email, hashedPassword], (err, result) => {
                if (err) {
                    db.rollback(() => {
                        console.error('Error al insertar en usuario:', err);
                        // Error de email duplicado
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(409).json({ mensaje: 'El correo electrónico ya está registrado.' });
                        }
                        return res.status(500).json({ mensaje: 'Error al registrar el usuario.' });
                    });
                    return;
                }

                // 2. Insertar en la tabla `cliente`
                const clienteQuery = 'INSERT INTO cliente (idUsuario) VALUES (?)';
                db.query(clienteQuery, [idUsuario], (err, result) => {
                    if (err) {
                        db.rollback(() => {
                            console.error('Error al insertar en cliente:', err);
                            return res.status(500).json({ mensaje: 'Error al asignar el rol de cliente.' });
                        });
                        return;
                    }

                    // Confirmar transacción
                    db.commit((err) => {
                        if (err) {
                            db.rollback(() => {
                                console.error('Error al confirmar la transacción:', err);
                                return res.status(500).json({ mensaje: 'Error al finalizar el registro.' });
                            });
                            return;
                        }
                        
                        console.log('Usuario cliente registrado con éxito:', idUsuario);
                        res.status(201).json({ mensaje: '¡Registro completado con éxito!' });
                    });
                });
            });
        });

    } catch (error) {
        console.error('Error en el proceso de registro:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
});

// ENDPOINT PARA REGISTRO DE TALLER
app.post('/api/registro/taller', async (req, res) => {
    const { nombreTaller, direccion, email, password } = req.body;

    if (!nombreTaller || !direccion || !email || !password) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const idUsuario = `USER-${uuidv4()}`;
        const idTaller = `TALLER-${uuidv4()}`;
        // El nombre del usuario administrador será el mismo que el del taller por simplicidad
        const nombreAdmin = nombreTaller; 

        db.beginTransaction(async (err) => {
            if (err) { throw err; }

            // 1. Insertar en `usuario` (el dueño/admin del taller)
            const userQuery = 'INSERT INTO usuario (idUsuario, nombre, email, password) VALUES (?, ?, ?, ?)';
            db.query(userQuery, [idUsuario, nombreAdmin, email, hashedPassword], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(409).json({ mensaje: 'El correo electrónico ya está registrado.' });
                        }
                        throw err;
                    });
                }

                // 2. Insertar en `taller`
                const tallerQuery = 'INSERT INTO taller (idTaller, nombre, direccion) VALUES (?, ?, ?)';
                db.query(tallerQuery, [idTaller, nombreTaller, direccion], (err, result) => {
                    if (err) { return db.rollback(() => { throw err; }); }

                    // 3. Insertar en `administrador` para asignar el rol
                    const adminQuery = 'INSERT INTO administrador (idUsuario, idTaller) VALUES (?, ?)';
                    db.query(adminQuery, [idUsuario, idTaller], (err, result) => {
                        if (err) { return db.rollback(() => { throw err; }); }

                        db.commit((err) => {
                            if (err) { return db.rollback(() => { throw err; }); }
                            
                            console.log('Taller registrado con éxito:', idTaller);
                            res.status(201).json({ mensaje: '¡Taller registrado con éxito!' });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error en el proceso de registro de taller:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
});



app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
