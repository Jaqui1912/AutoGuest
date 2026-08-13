// Script para ver reseñas del taller
document.addEventListener('DOMContentLoaded', () => {
    console.log('Reseñas taller loaded');
    cargarResenasAdmin();
});

// Cargar reseñas desde el backend
async function cargarResenasAdmin() {
    try {
        const response = await fetch('/api/taller/resenas');

        if (response.status === 401) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = '/login_taller.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Error al cargar reseñas');
        }

        const resenas = await response.json();
        mostrarResenasAdmin(resenas);
        calcularEstadisticas(resenas);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar reseñas');
    }
}

// Mostrar reseñas
function mostrarResenasAdmin(resenas) {
    const container = document.getElementById('resenas-container');

    if (!container) return;

    if (resenas.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">No hay reseñas todavía</p>';
        return;
    }

    container.innerHTML = resenas.map(resena => {
        const fecha = new Date(resena.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const estrellas = '⭐'.repeat(resena.calificacion);

        return `
            <div class="resena-card" style="background: #2c2c2c; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: #ffffff;">${resena.clienteNombre}</strong>
                    <span style="color: #f39c12; font-size: 1.2em;">${estrellas}</span>
                </div>
                ${resena.comentario ? `<p style="color: #e0e0e0; margin: 10px 0;">${resena.comentario}</p>` : ''}
                <small style="color: #a0a0a0;">${fecha}</small>
            </div>
        `;
    }).join('');
}

// Calcular estadísticas de reseñas
function calcularEstadisticas(resenas) {
    if (resenas.length === 0) return;

    // Calcular promedio
    const suma = resenas.reduce((acc, r) => acc + r.calificacion, 0);
    const promedio = (suma / resenas.length).toFixed(1);

    // Actualizar en el dashboard si existe
    const promedioElement = document.getElementById('valoracion-media');
    if (promedioElement) {
        promedioElement.textContent = promedio;
    }

    // Mostrar estadísticas en la página de reseñas
    const statsElement = document.getElementById('resenas-stats');
    if (statsElement) {
        const distribucion = [5, 4, 3, 2, 1].map(num => {
            const count = resenas.filter(r => r.calificacion === num).length;
            const porcentaje = ((count / resenas.length) * 100).toFixed(0);
            return { estrellas: num, count, porcentaje };
        });

        statsElement.innerHTML = `
            <div style="background: #2c2c2c; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #fff; margin-bottom: 15px;">Estadísticas</h3>
                <div style="font-size: 2em; color: #f39c12; margin-bottom: 10px;">
                    ${promedio} ⭐
                </div>
                <p style="color: #c0c0c0; margin-bottom: 20px;">
                    Basado en ${resenas.length} reseña${resenas.length !== 1 ? 's' : ''}
                </p>
                ${distribucion.map(d => `
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #f39c12; width: 80px;">${d.estrellas} ⭐</span>
                            <div style="flex: 1; background: #1a1a1a; height: 10px; border-radius: 5px; overflow: hidden;">
                                <div style="width: ${d.porcentaje}%; height: 100%; background: #f39c12;"></div>
                            </div>
                            <span style="color: #c0c0c0; width: 60px;">${d.count} (${d.porcentaje}%)</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}
