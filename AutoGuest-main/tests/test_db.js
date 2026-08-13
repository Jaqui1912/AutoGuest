require('dotenv').config();
const pool = require('./config/database');

async function test() {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM cita');
        console.log('Total citas in DB:', rows[0].total);
        
        const [sample] = await pool.query('SELECT * FROM cita LIMIT 3');
        console.log('Sample data:', JSON.stringify(sample, null, 2));
    } catch (e) {
        console.error('Error testing DB:', e);
    } finally {
        process.exit();
    }
}

test();
