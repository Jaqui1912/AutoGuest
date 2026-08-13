// Script para conectar el formulario de reseñas con el backend
document.addEventListener('DOMContentLoaded', () => {
    console.log('Resenas integration loaded');

    // Obtener el ID del taller de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const idTaller = urlParams.get('id');

    if (!idTaller) {
        console.error('No se encontró el ID del taller en la URL');
        return;
    }

    // Cargar reseñas existentes
    cargarResenasDelTaller(idTaller);

    // Conectar formulario de reseñas
    const formResena = document.getElementById('formResena');

    if (formResena) {
        formResena.addEventListener('submit', async (e) => {
            e.preventDefault();

            const calificacionField = formResena.querySelector('select[name="calificacion"]');
            const comentarioField = formResena.querySelector('textarea[name="comentario"]');

            if (!calificacionField || !comentarioField) {
                alert('Error: No se encontraron los campos del formulario');
                return;
            }

            const calificacion = parseInt(calificacionField.value);
            const comentario = comentarioField.value.trim();

            if (!calificacion || calificacion < 1 || calificacion > 5) {
                alert('Por favor selecciona una calificación');
                return;
            }

            try {
                const response = await fetch('/api/resenas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        idTaller,
                        calificacion,
                        comentario
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.mensaje || '¡Gracias por tu reseña!');

                    // Limpiar formulario
                    calificacionField.value = '';
                    comentarioField.value = '';

                    // Recargar reseñas inmediatamente
                    await cargarResenasDelTaller(idTaller);
                } else {
                    alert(result.error || 'Error al enviar la reseña');
                }
            } catch (error) {
                console.error('Error al enviar reseña:', error);
                alert('Error de red. Por favor intenta de nuevo.');
            }
        });
    } else {
        console.log('No se encontró el formulario de reseñas (formResena)');
    }
});

// Función para cargar reseñas desde el backend
async function cargarResenasDelTaller(idTaller) {
    try {
        const response = await fetch(`/api/resenas/${idTaller}`);

        if (!response.ok) {
            console.error('Error al cargar reseñas:', response.status);
            return;
        }

        const resenas = await response.json();

        // Buscar contenedor de reseñas
        const container = document.querySelector('#reviews-container');

        if (!container) {
            console.log('No se encontró contenedor de reseñas (#reviews-container)');
            return;
        }

        if (resenas.length === 0) {
            container.innerHTML = '<p style="color: #c0c0c0; text-align: center; padding: 20px;">No hay reseñas todavía. ¡Sé el primero en dejar una!</p>';
            return;
        }

        // Renderizar reseñas
        container.innerHTML = resenas.map(resena => {
            const fecha = new Date(resena.fecha).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const estrellas = '⭐'.repeat(resena.calificacion);

            return `
                <div class="review-card" style="background: #2c2c2c; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: #ffffff;">${resena.clienteNombre}</strong>
                        <span style="color: #f39c12; font-size: 1.2em;">${estrellas}</span>
                    </div>
                    ${resena.comentario ? `<p style="color: #e0e0e0; margin: 10px 0;">${resena.comentario}</p>` : ''}
                    <small style="color: #a0a0a0;">${fecha}</small>
                </div>
            `;
        }).join('');

        console.log(`✅ Cargadas ${resenas.length} reseñas`);

    } catch (error) {
        console.error('Error al cargar reseñas:', error);
    }
}
