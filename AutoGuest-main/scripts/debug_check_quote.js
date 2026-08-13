require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkLatestQuote() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('\n--- CHECKING LATEST QUOTE ---');
        // Get the most recent citation with status 'Cotizado'
        const [citas] = await connection.query('SELECT * FROM cita WHERE estado = ? ORDER BY fechaHora DESC LIMIT 1', ['Cotizado']);

        if (citas.length === 0) {
            console.log('No citation found with status "Cotizado".');
            // Check if any quote exists at all
            const [anyQuote] = await connection.query('SELECT * FROM cotizacion ORDER BY idCotizacion DESC LIMIT 1');
            if (anyQuote.length > 0) {
                console.log('Found a quote, but maybe citation status update failed?');
                console.log('Quote:', anyQuote[0]);
            }
            return;
        }

        const cita = citas[0];
        console.log('Cita:', cita.idCita, '| Estado:', cita.estado, '| Cliente:', cita.idCliente);

        const [cotizaciones] = await connection.query('SELECT * FROM cotizacion WHERE idCita = ?', [cita.idCita]);
        if (cotizaciones.length === 0) {
            console.log('ERROR: Citation is "Cotizado" but no record in "cotizacion" table.');
            return;
        }
        const cotizacion = cotizaciones[0];
        console.log('Cotizacion:', cotizacion.idCotizacion, '| Total:', cotizacion.totalAprobado);

        const [servicios] = await connection.query('SELECT * FROM cotizacion_servicios WHERE idCotizacion = ?', [cotizacion.idCotizacion]);
        console.log('Services linked:', servicios.length);
        servicios.forEach(s => console.log(`- Service ID: ${s.idServicio} | Price: ${s.precio}`));

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkLatestQuote();
