window.editorQuill = null;

function inicializarEditorNotas() {
    // Si el editor ya existe, no lo volvemos a crear para evitar errores
    if (window.editorQuill) return; 

    window.editorQuill = new Quill('#editor-nota-general', {
        theme: 'snow',
        placeholder: 'Escribe aquí observaciones, cuadres de caja o recordatorios...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });
}
function cambiarPestana(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-tab');
    document.getElementById('btn-' + tabId).classList.add('active');
}
function actualizarSelectorNav() {
    const navSelect = document.getElementById('selectPeriodoNav');
    if (!navSelect) {
        console.error("No se encontró el elemento selectPeriodoNav");
        return;
    }

    // Limpiamos y ponemos la opción por defecto
    navSelect.innerHTML = '<option value="">Seleccionar Periodo...</option>';

    // Si no hay periodos, no hacemos nada más
    if (!datos.periodos || datos.periodos.length === 0) return;

    // Ordenamos cronológicamente
    const periodosOrdenados = [...datos.periodos].sort((a, b) => a.fecha.localeCompare(b.fecha));

    periodosOrdenados.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = formatearFecha(p.fecha);
        
        // Usamos == para comparar número con string por si acaso
        if (p.id == datos.periodoActivoId) {
            option.selected = true;
        }
        navSelect.appendChild(option);
    });
    
    console.log("Selector de la Navbar actualizado con " + periodosOrdenados.length + " periodos.");
}

// Función que se dispara cuando cambias el select de la navbar
function cambiarPeriodoDesdeNav() {
    const selectedId = document.getElementById('selectPeriodoNav').value;
    if (selectedId) {
        datos.periodoActivoId = parseInt(selectedId);
        guardarYRefrescar();
    }
}
function filtrarTabla(inputId, tableBodyId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toLowerCase();
    const tbody = document.getElementById(tableBodyId);
    const rows = tbody.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Si la fila es la de "No hay registros", la saltamos
        if (row.cells.length === 1) continue;

        let textoFila = row.textContent.toLowerCase();
        
        // Si el texto buscado está en cualquier parte de la fila, se muestra
        if (textoFila.indexOf(filter) > -1) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}
let ultimaColumna = -1;
let ordenAsc = true;

function ordenarTabla(header, colIndex) {
    const table = header.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // 1. Evitar ordenar si no hay datos o si se hace clic en la columna N° (colIndex 0)
    if (colIndex === 0) return; 
    if (rows.length <= 1 && (!rows[0] || rows[0].cells.length <= 1)) return;

    // Configuración de dirección
    if (ultimaColumna === colIndex) {
        ordenAsc = !ordenAsc;
    } else {
        ordenAsc = true;
        ultimaColumna = colIndex;
    }

    // 2. Ordenar las filas
    rows.sort((a, b) => {
        let valA = a.cells[colIndex].textContent.trim();
        let valB = b.cells[colIndex].textContent.trim();

        if (valA === '✅' || valA === '❌') {
            valA = valA === '✅' ? 1 : 0;
            valB = valB === '✅' ? 1 : 0;
        } 
        else if (valA.includes('Bs.')) {
            valA = parseFloat(valA.replace(/[^\d.-]/g, '')) || 0;
            valB = parseFloat(valB.replace(/[^\d.-]/g, '')) || 0;
        } 
        else {
            valA = valA.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            valB = valB.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        if (valA < valB) return ordenAsc ? -1 : 1;
        if (valA > valB) return ordenAsc ? 1 : -1;
        return 0;
    });

    // 3. Reinsertar y RE-NUMERAR
    tbody.innerHTML = "";
    rows.forEach((row, index) => {
        // ACTUALIZACIÓN CLAVE: Reescribimos el contenido de la primera celda (columna N°)
        row.cells[0].textContent = index + 1; 
        tbody.appendChild(row);
    });

    // 4. Actualizar indicadores visuales (flechas)
    const headers = table.querySelectorAll('th');
    headers.forEach(h => {
        if (h.textContent.match(/[↕↑↓]/)) {
            h.textContent = h.textContent.replace(/[↕↑↓]/g, '↕');
        }
    });
    header.textContent = header.textContent.replace('↕', ordenAsc ? '↑' : '↓');
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('sisCobroTheme', isDark ? 'dark' : 'light');
    
    // Cambiamos el icono según el modo
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

function inicializarTema() {
    const savedTheme = localStorage.getItem('sisCobroTheme');
    const btn = document.getElementById('btn-theme-toggle');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (btn) btn.textContent = '☀️';
    }
}


function inicializarSistema() {
    // Esta función llama a todos los renders por primera vez
    migrarBaseDeDatos();
    guardarYRefrescar(); 
    inicializarTema(); // Inicializamos el tema al cargar la página
    inicializarEditorNotas(); // <--- ESTA ES LA LÍNEA QUE FALTABA
   
}

// --- MODO OSCURO ---

/**
 * Filtra cualquier tabla basándose en un input de búsqueda
 * @param {string} inputId - El ID del campo de texto
 * @param {string} tableBodyId - El ID del tbody de la tabla
 */

// Variables para controlar el estado del orden
let sortDocentesConfig = { columna: 'paterno', asc: true };


inicializarSistema();

// Inicio
guardarYRefrescar();