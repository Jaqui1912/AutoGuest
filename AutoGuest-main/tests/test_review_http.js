const http = require('http');

const data = JSON.stringify({
    idUsuario: 'CLI01',
    calificacion: 5,
    comentario: 'Prueba de depuración con http'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/talleres/T03/resenas',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
        console.log('Response:', responseBody);
    });
});

req.on('error', (e) => {
    console.error('Problem with request:', e.message);
});

req.write(data);
req.end();
