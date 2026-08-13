require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function finalPolishing() {
    const client = await pool.connect();
    try {
        console.log('--- VINCULANDO DIAGNOSTICO ---');
        // El nombre exacto parece ser 'diagnostico' según el listado previo
        try {
            await client.query("ALTER TABLE diagnostico DROP CONSTRAINT IF EXISTS fk_diag_cita");
            await client.query("ALTER TABLE diagnostico ADD CONSTRAINT fk_diag_cita FOREIGN KEY (idcita) REFERENCES cita(idcita) ON DELETE CASCADE");
            console.log('OK: diagnostico vinculado a cita.');
        } catch (e) {
            console.log('AVISO: No se pudo vincular diagnostico:', e.message);
        }

        console.log('\n--- LIMPIEZA DE TABLAS VACÍAS ---');
        // El usuario mencionó que paypal_webhooks y log_pagos_paypal están solas. 
        // Ya vinculamos log_pagos_paypal en el paso anterior.
        // paypal_webhooks no tiene campo id_pedido claro, así que la dejamos como log.

    } finally {
        client.release();
        pool.end();
    }
}

finalPolishing().catch(console.error);
