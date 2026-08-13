// Script para asegurar que los nombres de talleres se muestren correctamente en citas
// Incluir este archivo en mis_citas.html con: <script src="citas-fix.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    console.log('Citas workshop name fix loaded');

    // Interceptar la función que renderiza las citas
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        // Si es la petición de citas
        if (args[0] && args[0].includes('/api/citas')) {
            const clonedResponse = response.clone();

            try {
                const data = await clonedResponse.json();

                // Verificar y corregir nombres de talleres
                if (Array.isArray(data)) {
                    data.forEach(cita => {
                        if (!cita.tallerNombre || cita.tallerNombre === 'null') {
                            cita.tallerNombre = 'Taller no disponible';
                        }
                    });
                }

                // Retornar respuesta modificada
                return new Response(JSON.stringify(data), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            } catch (e) {
                // Si hay error, retornar respuesta original
                return response;
            }
        }

        return response;
    };

    console.log('Fetch interceptor instalado para corregir nombres de talleres');
});

// Función auxiliar para formatear nombres de talleres
function formatTallerNombre(nombre) {
    if (!nombre || nombre === 'null' || nombre === 'undefined') {
        return 'Taller no disponible';
    }
    return nombre;
}

// Hacer disponible globalmente
window.formatTallerNombre = formatTallerNombre;
