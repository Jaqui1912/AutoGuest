require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
(async () => {
  try {
    const users = await pool.query("SELECT u.idusuario FROM usuario u JOIN cliente c ON u.idusuario = c.idusuario LIMIT 1");
    if (users.rows.length === 0) {
      console.error('No client found');
      return;
    }
    const idUsuario = users.rows[0].idusuario;
    const token = jwt.sign({ userId: idUsuario, role: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('TOKEN', token);
    const res = await fetch('http://localhost:3000/api/vehiculos', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('STATUS', res.status);
    const body = await res.text();
    console.log('BODY', body);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();