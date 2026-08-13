const express = require('express');
const bcrypt = require('bcryptjs');
// Nota: Asegúrate de tener instalada la versión 3 de nanoid (npm install nanoid@3.3.4)
const { nanoid } = require('nanoid');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/config/database');
const { generateToken } = require('../middleware/middleware/jwt');
const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   POST /api/registro/cliente
// @desc    Registrar un nuevo cliente
router.post('/cliente', async (req, res) => {
    // 1. Recibimos 'telefono' también
    const { nombre, email, password, telefono } = req.body;

    // --- VALIDACIONES ---
    if (!nombre || !email || !password || !telefono) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    // Validación: El nombre solo debe tener letras y espacios (No números)
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(nombre)) {
        return res.status(400).json({ mensaje: 'El nombre no es válido (no se permiten números).' });
    }

    // Validación: La contraseña debe ser segura
    if (password.length < 8) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    // Validación: Teléfono debe tener 10 dígitos
    const telefonoRegex = /^\d{10}$/;
    if (!telefonoRegex.test(telefono)) {
        return res.status(400).json({ mensaje: 'El teléfono debe tener exactamente 10 dígitos numéricos.' });
    }

    // Validación: Email estructura
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ mensaje: 'El formato del correo electrónico no es válido.' });
    }
    // --------------------

    try {
        // 2. Verificar si el email ya existe
        const [users] = await db.query('SELECT email FROM usuario WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
        }

        // 3. Generar ID y Hash de contraseña
        const idUsuario = nanoid(10);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Insertar en tabla 'usuario' (INCLUYENDO EL TELÉFONO)
        const [userResult] = await db.query(
            'INSERT INTO usuario (idUsuario, nombre, email, password, telefono) VALUES (?, ?, ?, ?, ?)',
            [idUsuario, nombre, email, hashedPassword, telefono]
        );

        // 5. Insertar en tabla 'cliente'
        const [clientResult] = await db.query(
            'INSERT INTO cliente (idUsuario) VALUES (?)',
            [idUsuario]
        );

        if (userResult.affectedRows > 0 && clientResult.affectedRows > 0) {
            console.log(`Nuevo cliente registrado: ${email}`);
            res.status(201).json({ mensaje: '¡Registro exitoso! Ahora puedes iniciar sesión.' });
        } else {
            throw new Error('No se pudo guardar en la base de datos.');
        }

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
});

// @route   POST /api/registro/login
// @desc    Iniciar sesión
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
        }

        const user = users[0];

        // 1. Intentar comparar con encriptación (Lo correcto)
        let isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch && password === user.password) {
            isMatch = true;
        }
        if (!isMatch) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
        }

        // Verificar que sea cliente
        const [clients] = await db.query('SELECT idUsuario FROM cliente WHERE idUsuario = ?', [user.idUsuario]);
        if (clients.length === 0) {
            return res.status(403).json({ mensaje: 'Este usuario no es un cliente.' });
        }

        // Crear sesión
        req.session.userId = user.idUsuario;
        req.session.role = 'cliente';

        const token = generateToken(user.idUsuario, 'cliente', { userName: user.nombre });

        res.status(200).json({
            success: true,
            mensaje: 'Inicio de sesión exitoso.',
            userName: user.nombre,
            userId: user.idUsuario,
            token,
            redirectTo: 'pages/cliente/dashboard_cliente.html'
        });

    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ mensaje: 'Error del servidor.' });
    }
});

// @route   POST /api/registro/google
// @desc    Autenticación con Google (Registro/Login)
router.post('/google', async (req, res) => {
    const { token, role } = req.body;

    if (!token || !role) {
        return res.status(400).json({ mensaje: 'Token y rol son obligatorios.' });
    }

    try {
        // 1. Verificar Token de Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId, picture } = payload;

        // 2. Buscar si el usuario ya existe
        let [users] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        let user;
        let isNewUser = false;

        if (users.length === 0) {
            // REGISTRO NUEVO
            isNewUser = true;
            // Generar ID según el rol para mantener consistencia
            const idPrefix = role === 'mecanico' ? 'MEC' : (role === 'taller' ? 'UA' : 'CLI');
            const idUsuario = idPrefix + nanoid(7);

            // Insertar en tabla usuario
            // Nota: El teléfono queda vacío inicialmente en Google Auth
            await db.query(
                'INSERT INTO usuario (idUsuario, nombre, email, password, foto_perfil) VALUES (?, ?, ?, ?, ?)',
                [idUsuario, name, email, googleId, picture] // Usamos googleId como password temporal/id
            );

            // Insertar en tabla específica del rol
            if (role === 'cliente') {
                await db.query('INSERT INTO cliente (idUsuario) VALUES (?)', [idUsuario]);
            } else if (role === 'taller') {
                const idTaller = 'T' + nanoid(5);
                await db.query('INSERT INTO taller (idTaller, nombre) VALUES (?, ?)', [idTaller, `Taller de ${name}`]);
                await db.query('INSERT INTO administrador (idUsuario, idTaller) VALUES (?, ?)', [idUsuario, idTaller]);
            } else if (role === 'mecanico') {
                // El mecánico queda sin taller asignado inicialmente o requiere validación extra
                await db.query(
                    'INSERT INTO mecanico (idUsuario, estado_solicitud) VALUES (?, ?)',
                    [idUsuario, 'PENDIENTE']
                );
            }

            user = { idUsuario, nombre: name, email };
        } else {
            // LOGIN DE USUARIO EXISTENTE
            user = users[0];

            // Verificar que el rol coincida (opcional, pero recomendado)
            if (role === 'cliente') {
                const [clients] = await db.query('SELECT idUsuario FROM cliente WHERE idUsuario = ?', [user.idUsuario]);
                if (clients.length === 0) return res.status(403).json({ mensaje: 'Este usuario no está registrado como cliente.' });
            } else if (role === 'taller') {
                const [admins] = await db.query('SELECT idUsuario FROM administrador WHERE idUsuario = ?', [user.idUsuario]);
                if (admins.length === 0) return res.status(403).json({ mensaje: 'Este usuario no es administrador de taller.' });
            } else if (role === 'mecanico') {
                const [mechanics] = await db.query('SELECT idUsuario FROM mecanico WHERE idUsuario = ?', [user.idUsuario]);
                if (mechanics.length === 0) return res.status(403).json({ mensaje: 'Este usuario no es un mecánico.' });
            }
        }

        // 3. Establecer Sesión
        req.session.userId = user.idUsuario;
        req.session.role = role;

        if (role === 'taller') {
            const [admins] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [user.idUsuario]);
            if (admins.length > 0) req.session.tallerId = admins[0].idTaller;
        }

        const extra = {};
        if (role === 'taller') {
            const [admins] = await db.query('SELECT idTaller FROM administrador WHERE idUsuario = ?', [user.idUsuario]);
            if (admins.length > 0) extra.idTaller = admins[0].idTaller;
        }
        const token = generateToken(user.idUsuario, role, { userName: user.nombre, ...extra });

        const redirectMap = {
            'cliente': 'pages/cliente/dashboard_cliente.html',
            'taller': 'portal_taller.html',
            'mecanico': 'portal_mecanico.html'
        };

        res.status(isNewUser ? 201 : 200).json({
            success: true,
            mensaje: isNewUser ? 'Registro con Google exitoso.' : 'Inicio de sesión con Google exitoso.',
            userName: user.nombre,
            userId: user.idUsuario,
            token,
            redirectTo: redirectMap[role]
        });

    } catch (error) {
        console.error('Error Google Auth:', error);
        res.status(500).json({ mensaje: 'Error al procesar la autenticación con Google.' });
    }
});

// @route   POST /api/registro/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ mensaje: 'Error al cerrar sesión.' });
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true });
    });
});

module.exports = router;
