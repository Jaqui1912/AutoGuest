require('dotenv').config();
const db = require('./config/database');
const { nanoid } = require('nanoid');

async function seedServices() {
    try {
        console.log('--- Seeding Services ---');
        const [talleres] = await db.query('SELECT idTaller FROM taller LIMIT 1');
        if (talleres.length === 0) { console.log('No workshop to seed.'); process.exit(0); }

        const idTaller = talleres[0].idTaller;

        const services = [
            { nombre: 'Afinación Mayor', precio: 1500, desc: 'Cambio de aceite, filtros y bujías.' },
            { nombre: 'Cambio de Balatas', precio: 800, desc: 'Reemplazo de pastillas de freno delanteras.' },
            { nombre: 'Diagnóstico General', precio: 500, desc: 'Escaneo de computadora y revisión visual.' }
        ];

        for (const s of services) {
            const id = 'SERV-' + nanoid(6);
            await db.query('INSERT INTO servicio (idServicio, idTaller, nombre, descripcion, precio) VALUES (?, ?, ?, ?, ?)',
                [id, idTaller, s.nombre, s.desc, s.precio]);
            console.log(`inserted ${s.nombre}`);
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}

seedServices();
