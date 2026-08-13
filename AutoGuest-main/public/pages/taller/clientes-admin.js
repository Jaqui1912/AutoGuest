// Script para ver clientes del taller
document.addEventListener('DOMContentLoaded', () => {
    console.log('Clientes admin loaded');
    cargarClientes();
});

// Cargar clientes desde el backend
async function cargarClientes() {
    try {
        const response = await fetch('/api/taller/clientes');

        if (response.status === 401) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = '/login_taller.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Error al cargar clientes');
        }

        const clientes = await response.json();
        mostrarClientes(clientes);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar clientes');
    }
}

// Mostrar clientes en la tabla
function mostrarClientes(clientes) {
    const tbody = document.querySelector('#clientes-table tbody');

    if (!tbody) return;

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No hay clientes registrados</td></tr>';
        return;
    }

    tbody.innerHTML = clientes.map(cliente => {
        const ultimaCita = cliente.ultimaCita
            ? new Date(cliente.ultimaCita).toLocaleDateString('es-ES')
            : 'N/A';

        return `
            <tr>
                <td>${cliente.nombre}</td>
                <td>${cliente.email}</td>
                <td>${cliente.telefono || 'N/A'}</td>
                <td>${cliente.totalCitas}</td>
                <td>${ultimaCita}</td>
            </tr>
        `;
    }).join('');

    // Actualizar contador en dashboard si existe
    const contadorElement = document.getElementById('nuevos-clientes-count');
    if (contadorElement) {
        // Contar clientes del último mes
        const unMesAtras = new Date();
        unMesAtras.setMonth(unMesAtras.getMonth() - 1);

        const clientesNuevos = clientes.filter(c => {
            const ultimaCita = new Date(c.ultimaCita);
            return ultimaCita >= unMesAtras;
        });

        contadorElement.textContent = clientesNuevos.length;
    }
}
