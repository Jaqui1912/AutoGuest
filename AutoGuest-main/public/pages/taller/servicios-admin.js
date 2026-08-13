document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del HTML
    const servicesTableBody = document.getElementById('servicesTableBody');
    const serviceModal = document.getElementById('serviceModal');
    const addServiceBtn = document.getElementById('addServiceBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const serviceForm = document.getElementById('serviceForm');
    const headerTitle = document.getElementById('tallerNameHeader');

    // VARIABLE GLOBAL PARA GUARDAR LOS DATOS Y PODER BUSCARLOS AL EDITAR
    let listaServiciosGlobal = [];

    // --- 1. LÓGICA DEL MODAL ---

    // Botón "Añadir Nuevo" -> Limpia el formulario y abre modal
    addServiceBtn.addEventListener('click', () => {
        serviceForm.reset(); // Limpiar campos
        document.getElementById('service-id').value = ''; // ID vacío = Nuevo servicio
        document.getElementById('modalTitle').innerText = 'Añadir Nuevo Servicio';
        serviceModal.classList.add('active');
    });

    const cerrarModal = () => {
        serviceModal.classList.remove('active');
        serviceForm.reset();
    };

    closeModalBtn.addEventListener('click', cerrarModal);

    // Cerrar al dar click fuera
    serviceModal.addEventListener('click', (e) => {
        if (e.target === serviceModal) cerrarModal();
    });

    // --- 2. CARGAR DATOS ---

   async function cargarServicios() {
        try {
            const res = await fetch('/api/taller/servicios');
            const data = await res.json();

            // Guardamos los datos globales
            listaServiciosGlobal = data.servicios || []; 

            servicesTableBody.innerHTML = '';

            if (listaServiciosGlobal.length === 0) {
                servicesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay servicios.</td></tr>';
                return;
            }

            listaServiciosGlobal.forEach(servicio => {
                // DETECTAR EL ID CORRECTO:
                // Intentamos leer 'idServicio' (común en SQL) o 'id' (común en otras DB)
                // Si ambos fallan, usamos '_id' (Mongo).
                const elId = servicio.idServicio || servicio.id || servicio._id;

                const fila = `
                    <tr>
                        <td><strong>${servicio.nombre}</strong></td>
                        <td class="description">${servicio.descripcion}</td>
                        <td class="price">$${parseFloat(servicio.precio).toFixed(2)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-edit" onclick="editarServicio('${elId}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-danger" onclick="eliminarServicio('${elId}')">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                servicesTableBody.innerHTML += fila;
            });

        } catch (error) {
            console.error("Error cargando tabla:", error);
        }
    }

    // --- 3. GUARDAR (CREAR O EDITAR) ---
    // Esta lógica maneja AMBOS casos
    // --- 3. GUARDAR (CREAR O EDITAR) - VERSIÓN DEPURADA ---
    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Obtener datos
        const idInput = document.getElementById('service-id').value;
        // Limpiamos el ID por si tiene espacios vacíos
        const id = idInput ? idInput.trim() : ''; 
        
        const nombre = document.getElementById('service-name').value;
        const descripcion = document.getElementById('service-desc').value;
        const precio = document.getElementById('service-price').value;
        const btnSubmit = document.getElementById('saveServiceBtn');

        // 2. Preparar datos para enviar
        const datos = { nombre, descripcion, precio };

        // 3. Bloquear botón
        const textoOriginal = btnSubmit.innerText;
        btnSubmit.innerText = 'Procesando...';
        btnSubmit.disabled = true;

        console.log("--- INTENTANDO GUARDAR ---");
        console.log("ID detectado:", id ? id : "(Es nuevo servicio)");
        console.log("Datos a enviar:", datos);

        try {
            let res;
            let url;
            let method;

            // DECIDIR SI ES CREAR (POST) O EDITAR (PUT)
            if (id && id !== 'undefined') {
                // EDITAR
                url = `/api/taller/servicios/${id}`;
                method = 'PUT';
            } else {
                // CREAR
                url = '/api/taller/servicios';
                method = 'POST';
            }

            console.log(`Enviando petición ${method} a: ${url}`);

            // 4. HACER LA PETICIÓN
            res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            // 5. LEER LA RESPUESTA (Importante: leemos texto primero para ver errores HTML)
            const textoRespuesta = await res.text();
            console.log("Respuesta cruda del servidor:", textoRespuesta);

            let jsonRespuesta;
            try {
                jsonRespuesta = JSON.parse(textoRespuesta);
            } catch (err) {
                console.error("El servidor no devolvió JSON. Probablemente un error 500 o 404 HTML.");
                throw new Error("El servidor devolvió un error interno (posiblemente HTML en lugar de JSON). Mira la consola.");
            }

            if (res.ok) {
                alert('¡Operación exitosa!');
                cerrarModal();
                cargarServicios(); // Recargar la tabla
            } else {
                console.error("Error lógico del servidor:", jsonRespuesta);
                alert('Error al guardar: ' + (jsonRespuesta.message || jsonRespuesta.error || 'Revisa la consola'));
            }

        } catch (error) {
            console.error("ERROR GRAVE:", error);
            alert('Ocurrió un error: ' + error.message);
        } finally {
            // 6. Restaurar botón
            btnSubmit.innerText = textoOriginal;
            btnSubmit.disabled = false;
        }
    });

    // --- 4. FUNCIONES GLOBALES (PARA QUE EL HTML LAS VEA) ---

    // Definimos editarServicio en window para solucionar el "is not defined"
    window.editarServicio = (idRecibido) => {
        console.log("Intentando editar ID:", idRecibido);
        
        // Buscamos el servicio comparando de forma flexible (==) por si uno es string y el otro numero
        const servicio = listaServiciosGlobal.find(s => {
            const sId = s.idServicio || s.id || s._id;
            return sId == idRecibido;
        });

        if (servicio) {
            // Llenamos el input oculto con el ID que recibimos
            document.getElementById('service-id').value = idRecibido;
            
            document.getElementById('service-name').value = servicio.nombre;
            document.getElementById('service-desc').value = servicio.descripcion;
            document.getElementById('service-price').value = servicio.precio;
            
            document.getElementById('modalTitle').innerText = 'Editar Servicio';
            serviceModal.classList.add('active');
        } else {
            console.error("Error: No se encontró el servicio en la memoria local.");
            alert("No se pudieron cargar los datos de este servicio para editar.");
        }
    };

    window.eliminarServicio = async (idServicio) => {
        if (!confirm('¿Eliminar este servicio?')) return;
        try {
            const res = await fetch(`/api/taller/servicios/${idServicio}`, { method: 'DELETE' });
            if (res.ok) cargarServicios();
            else alert('Error al eliminar');
        } catch (error) {
            console.error(error);
        }
    };

    // Inicializar
    cargarServicios();
});