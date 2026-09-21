let datos = JSON.parse(localStorage.getItem('sisCobroDB')) || {
    docentes: [],
    periodos: [],
    cobros: [],
    periodoActivoId: null
};

function normalizarTexto(valor = '') {
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/,/g, '')
        .trim()
        .toUpperCase();
}

function numeroSeguro(valor) {
    return Number.parseFloat(valor) || 0;
}

function obtenerPeriodoActivo() {
    return datos.periodos.find((p) => p.id === datos.periodoActivoId) || null;
}

function obtenerCobrosActivos() {
    if (!datos.periodoActivoId) return [];
    return datos.cobros.filter(
        (c) => c.periodoId === datos.periodoActivoId && (c.categoria || 'general') === categoriaCobroActiva
    );
}

function guardarYRefrescar() {
    localStorage.setItem('sisCobroDB', JSON.stringify(datos));

    if (typeof renderDocentes === 'function') renderDocentes();
    if (typeof renderPeriodos === 'function') renderPeriodos();
    if (typeof renderCobros === 'function') renderCobros();
    if (typeof actualizarSelectorNav === 'function') actualizarSelectorNav();
    if (typeof renderReporteGeneral === 'function') renderReporteGeneral();
}

function showToast(mensaje, tipo = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icono = tipo === 'error' ? '⚠️' : '✅';
    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function formatearFecha(f) {
    if (!f) return 'Sin periodo';
    const [year, month] = String(f).split('-');
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mesIndex = Number.parseInt(month, 10) - 1;
    return `${meses[mesIndex] || 'Mes'} ${year || ''}`;
}

function migrarBaseDeDatos() {
    let modificado = false;
    datos.cobros.forEach((c) => {
        if (typeof c.cancelado === 'undefined') {
            c.cancelado = false;
            c.fechaCancelacion = null;
            modificado = true;
        }
    });

    if (modificado) {
        localStorage.setItem('sisCobroDB', JSON.stringify(datos));
    }
}

function exportarBaseDeDatos() {
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `Respaldo_Cobros_${fecha}.json`;
    const dataStr = JSON.stringify(datos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', nombreArchivo);
    linkElement.click();
}

function importarBaseDeDatos(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const contenido = JSON.parse(e.target.result);
            if (contenido.docentes && contenido.periodos && contenido.cobros) {
                if (confirm('¿Estás seguro? Esto reemplazará TODOS los datos actuales con los del respaldo.')) {
                    datos = contenido;
                    guardarYRefrescar();
                    alert('✅ Base de datos restaurada con éxito.');
                    location.reload();
                }
            } else {
                alert('❌ El archivo no es un respaldo válido de este sistema.');
            }
        } catch (err) {
            alert('❌ Error al leer el archivo. Asegúrate de que sea el .json correcto.');
        }
    };
    reader.readAsText(archivo);
}