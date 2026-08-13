const fetch = require('node-fetch');

(async () => {
    const idTaller = 'T03';
    const body = {
        idUsuario: 'CLI01',
        calificacion: 5,
        comentario: 'Prueba de depuración'
    };

    try {
        console.log('--- Traning to POST review ---');
        const res = await fetch(`http://localhost:3000/api/talleres/${idTaller}/resenas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error('Fetch Error:', e.message);
    }
})();
