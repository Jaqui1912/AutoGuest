require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { verifyToken } = require('./middleware/middleware/jwt');
const { requestLogger, errorLogger } = require('./middleware/logger');
const registerRoutes = require('./routes');

const app = express();

// Middleware de logging de requests
app.use(requestLogger);

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(verifyToken);
registerRoutes(app);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorLogger);

module.exports = app;
