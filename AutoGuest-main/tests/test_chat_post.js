const axios = require('axios');

async function testChatPost() {
    const API_URL = 'http://localhost:3000';
    const idCita = 'CIT0Exvk'; // From user screenshot
    
    // We need a valid token. Since I can't easily get one without login, 
    // I'll try to trigger the 500 error which should happen AFTER auth if the logic is broken.
    // If it returns 401, I know auth is working.
    
    try {
        console.log(`Sending test message to ${API_URL}/api/chat/${idCita}...`);
        const response = await axios.post(`${API_URL}/api/chat/${idCita}`, {
            contenido: 'Test message from script',
            tipoContenido: 'texto'
        }, {
            headers: {
                'Authorization': 'Bearer VALID_TOKEN_NEEDED_OR_SESSION'
            }
        });
        console.log('Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Instead of actual POST, let's check the server logs by running the command status if possible
// but I'll run this to see if I get a 500 vs 401.
testChatPost();
