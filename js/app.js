window.editorQuill = null;

// ==========================================
// MÓDULO: CONEXIÓN A GOOGLE DRIVE
// ==========================================
const CLIENT_ID = '990149476481-ca8eoq51b5e0vvkgl62l3av8eihtugkl.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;
let resolveSubida = null;
let datosSubidaPendiente = null; // Guardará el archivo y nombre si pide login

function conectarConGoogle() {
    if (typeof google !== "undefined" && google.accounts) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    ejecutarSubidaPendiente();
                }
            },
        });
        console.log("✅ Google Drive API inicializada correctamente");
    } else {
        console.log("⏳ Esperando a que carguen los servicios de Google...");
        setTimeout(conectarConGoogle, 500);
    }
}

// Genera la fecha actual en formato mm_dd_yy
function obtenerFechaFormato() {
    const hoy = new Date();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const yy = String(hoy.getFullYear()).slice(-2);
    return `${mm}_${dd}_${yy}`;
}

// Busca una carpeta por nombre. Si no existe, la crea y retorna su ID
async function buscarOCrearCarpeta(nombreCarpeta, parentId = 'root') {
    // 1. Buscamos la carpeta
    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${nombreCarpeta}' and '${parentId}' in parents and trashed=false`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id; // Ya existe, retornamos su ID
    }

    // 2. Si no existe, la creamos
    const folderMetadata = {
        name: nombreCarpeta,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
    };
    
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(folderMetadata)
    });
    const createData = await createResponse.json();
    return createData.id; // Retornamos el nuevo ID
}

async function subirArchivoADrive(file, nombreDocente) {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            alert("⚠️ La conexión con Google aún está cargando. Espera un segundo y vuelve a intentar.");
            return reject("Google Client no está listo");
        }

        if (!accessToken) {
            resolveSubida = resolve;
            datosSubidaPendiente = { file, nombreDocente }; // Guardamos los datos temporalmente
            tokenClient.requestAccessToken({prompt: 'consent'});
            return;
        }
        realizarPeticionDrive(file, nombreDocente).then(resolve).catch(reject);
    });
}

async function ejecutarSubidaPendiente() {
    if (resolveSubida && datosSubidaPendiente) {
        const { file, nombreDocente } = datosSubidaPendiente;
        const link = await realizarPeticionDrive(file, nombreDocente);
        resolveSubida(link);
        resolveSubida = null;
        datosSubidaPendiente = null;
    }
}

async function realizarPeticionDrive(file, nombreDocente) {
    try {
        if (typeof showToast === "function") showToast("Preparando carpetas en Drive... ⏳", "success");
        
        // 1. Buscamos/Creamos "SisCobros" y la carpeta del docente
        const idRaiz = await buscarOCrearCarpeta("SisCobros", "root");
        const idDocente = await buscarOCrearCarpeta(nombreDocente, idRaiz);
        
        // 2. Preparamos el nombre del archivo (mm_dd_yy + extensión)
        const extension = file.name.split('.').pop();
        const nombreArchivo = `${obtenerFechaFormato()}.${extension}`;

        // 3. REEMPLAZO INTELIGENTE: Si ya había un archivo con ese nombre hoy, lo borramos de Drive primero
        await eliminarArchivoDrivePorNombre(idDocente, nombreArchivo);

        if (typeof showToast === "function") showToast("Subiendo archivo... ⏳", "success");

        // 4. Subimos el nuevo archivo
        const metadata = {
            name: nombreArchivo,
            parents: [idDocente]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });
        
        const data = await response.json();
        if (typeof showToast === "function") showToast("Archivo actualizado con éxito ✅", "success");
        return data.webViewLink;
    } catch (error) {
        console.error("Error al subir a Drive:", error);
        alert("Ocurrió un error al organizar y subir el archivo.");
        return null;
    }
}
// Nueva función para eliminar un archivo existente en Drive (para reemplazar o borrar)
async function eliminarArchivoDrivePorNombre(idCarpetaDocente, nombreArchivo) {
    try {
        const query = encodeURIComponent(`name='${nombreArchivo}' and '${idCarpetaDocente}' in parents and trashed=false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            for (let file of searchData.files) {
                // Enviamos el archivo a la papelera de Drive
                await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + accessToken }
                });
            }
        }
    } catch (error) {
        console.error("Error al limpiar archivo anterior en Drive:", error);
    }
}
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
    migrarBaseDeDatos();
    guardarYRefrescar();
    inicializarTema();
    inicializarEditorNotas();
    conectarConGoogle();
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