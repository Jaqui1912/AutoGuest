const db = require('./config/database');

(async () => {
    try {
        const id = 'T03';
        console.log(`--- Running GET reviews query via config/database for ${id} ---`);
        const [rows] = await db.query(`
            SELECT r.*, u.nombre as nombreCliente 
            FROM resenas r 
            JOIN usuario u ON r.idUsuario = u.idUsuario 
            WHERE r.idTaller = ? 
            ORDER BY r.fecha DESC`, [id]);

        console.log('Success!', rows.length, 'reviews found.');
        console.log(rows);
    } catch (e) {
        console.error('DATABASE ERROR:', e.message);
    }
})();
