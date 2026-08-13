require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
(async () => {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='vehiculo' ORDER BY ordinal_position");
    console.log('COLUMNS', res.rows.map(r => r.column_name).join(','));
    const r2 = await pool.query('SELECT count(*) as c FROM vehiculo LIMIT 1');
    console.log('COUNT', r2.rows[0].c);
  } catch (e) {
    console.error('ERR', e.code, e.message);
    console.error(e);
  } finally {
    await pool.end();
  }
})();