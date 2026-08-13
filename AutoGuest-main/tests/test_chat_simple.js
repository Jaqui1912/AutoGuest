const axios = require('axios');

async function testChatPost() {
    const API_URL = 'http://localhost:3000';
    const idCita = 'CIT0Exvk'; 
    
    try {
        console.log(`Sending simplified test message to ${API_URL}/api/chat/${idCita}...`);
        const response = await axios.post(`${API_URL}/api/chat/${idCita}`, {
            contenido: 'Test message ' + Date.now(),
            tipoContenido: 'texto'
        }, {
            // No auth to see if we get 401 or 500
            validateStatus: () => true
        });
        console.log('Final Status:', response.status);
        console.log('Final Data:', response.data);
    } catch (error) {
        console.error('Network/Other Error:', error.message);
    }
}

testChatPost();
