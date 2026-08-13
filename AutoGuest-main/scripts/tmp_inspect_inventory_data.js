require('dotenv').config();
const db = require('./config/database');

async function inspect() {
    try {
        console.log('--- Data in iteminventario ---');
        const [rows] = await db.query('SELECT idItem, nombre, imagen FROM iteminventario WHERE nombre LIKE "%Bujía%" OR nombre LIKE "%Aceite%"');
        rows.forEach(r => {
            console.log(`Item: ${r.nombre}`);
            console.log(`Imagen: ${r.imagen ? (r.imagen.startsWith('data:') ? r.imagen.substring(0, 50) + '...' : r.imagen) : 'null'}`);
        });
        process.exit(0);
    } catch (e) {
        console.log('Error:', e.message);
        process.exit(1);
    }
}
inspect();
