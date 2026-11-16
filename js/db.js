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
    const numero = Number.parseFloat(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function escaparHTML(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fechaLocalISO(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function urlSegura(valor) {
    if (typeof valor !== 'string' || !valor.trim()) return '';
    try {
        const url = new URL(valor, window.location.href);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (error) {
        return '';
    }
}

function obtenerPeriodoActivo() {
    if (datos.periodoActivoId == null) return null;
    return datos.periodos.find((p) => Number(p.id) === Number(datos.periodoActivoId)) || null;
}

// Mantiene datos.periodoActivoId apuntando al periodo activo de la categoría en pantalla
function sincronizarPeriodoActivo() {
    const periodoActivo = datos.periodoActivo || {};
    datos.periodoActivo = {
        general: null,
        medicina: null
    };
    ['general', 'medicina'].forEach((categoria) => {
        if (periodoActivo[categoria] == null) return;
        const periodo = datos.periodos.find(
            (p) => Number(p.id) === Number(periodoActivo[categoria]) &&
                (p.categoria || 'general') === categoria
        );
        if (periodo) datos.periodoActivo[categoria] = periodo.id;
    });
    datos.periodoActivoId = datos.periodoActivo[categoriaCobroActiva] || null;
}

function periodosDeCategoria(categoria = categoriaCobroActiva) {
    return datos.periodos.filter((p) => (p.categoria || 'general') === categoria);
}

// Marca un periodo como activo en SU categoría (y cambia a esa categoría si hace falta)
function establecerPeriodoActivo(id) {
    const p = datos.periodos.find((per) => per.id === Number(id));
    if (!p) return;
    const cat = p.categoria || 'general';
    if (!datos.periodoActivo) datos.periodoActivo = { general: null, medicina: null };
    datos.periodoActivo[cat] = p.id;
    if (cat !== categoriaCobroActiva && typeof aplicarCategoriaCobro === 'function') {
        aplicarCategoriaCobro(cat);
    }
    sincronizarPeriodoActivo();
}

function obtenerCobrosActivos() {
    if (!datos.periodoActivoId) return [];
    return datos.cobros.filter(
        (c) => Number(c.periodoId) === Number(datos.periodoActivoId) && (c.categoria || 'general') === categoriaCobroActiva
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
    const iconoEl = document.createElement('span');
    iconoEl.textContent = icono;
    const mensajeEl = document.createElement('span');
    mensajeEl.textContent = mensaje;
    toast.append(iconoEl, mensajeEl);
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

    // Un periodo activo por categoría
    if (!datos.periodoActivo) {
        datos.periodoActivo = { general: datos.periodoActivoId || null, medicina: null };
        modificado = true;
    }

    // Los periodos antiguos pasan a ser "general"
    datos.periodos.forEach((p) => {
        if (!p.categoria) {
            p.categoria = 'general';
            modificado = true;
        }
    });

    datos.cobros.forEach((c) => {
        if (typeof c.cancelado === 'undefined') {
            c.cancelado = false;
            c.fechaCancelacion = null;
            modificado = true;
        }
        if (!c.categoria) {
            c.categoria = 'general';
            modificado = true;
        }
    });

    let contador = 0;

    // Los periodos antiguos guardaban la meta de Medicina en el periodo General.
    // Separa esa meta en su propio periodo, aunque todavía no tenga cobros.
    datos.periodos.slice().forEach((origen) => {
        if (origen.categoria !== 'general' || typeof origen.metaAtrasoMedicina === 'undefined') return;

        let destino = datos.periodos.find((p) => p.categoria === 'medicina' && p.fecha === origen.fecha);
        if (!destino) {
            destino = {
                id: Date.now() + (++contador),
                fecha: origen.fecha,
                categoria: 'medicina',
                metaAtraso: numeroSeguro(origen.metaAtrasoMedicina),
                metaActividad: 0
            };
            datos.periodos.push(destino);
            modificado = true;
        }
        if (datos.periodoActivo.general === origen.id && !datos.periodoActivo.medicina) {
            datos.periodoActivo.medicina = destino.id;
            modificado = true;
        }
    });

    // Cobros de Medicina que seguían colgados de un periodo general:
    // se crea (o reutiliza) un periodo de Medicina con la misma fecha y se les reasigna
    datos.cobros.forEach((c) => {
        if (c.categoria !== 'medicina') return;
        if (numeroSeguro(c.actividad) !== 0) {
            c.actividad = 0;
            modificado = true;
        }

        const origen = datos.periodos.find((p) => p.id === c.periodoId);
        if (!origen || origen.categoria === 'medicina') return;

        let destino = datos.periodos.find((p) => p.categoria === 'medicina' && p.fecha === origen.fecha);
        if (!destino) {
            destino = {
                id: Date.now() + (++contador),
                fecha: origen.fecha,
                categoria: 'medicina',
                metaAtraso: numeroSeguro(origen.metaAtrasoMedicina),
                metaActividad: 0
            };
            datos.periodos.push(destino);
        }
        if (datos.periodoActivo.general === origen.id && !datos.periodoActivo.medicina) {
            datos.periodoActivo.medicina = destino.id;
        }
        c.periodoId = destino.id;
        modificado = true;
    });

    sincronizarPeriodoActivo();

    if (modificado) {
        localStorage.setItem('sisCobroDB', JSON.stringify(datos));
    }
}

function exportarBaseDeDatos() {
    const fecha = fechaLocalISO();
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
            const registrosValidos = (registros) => registros.every(
                (registro) => registro && typeof registro === 'object' && !Array.isArray(registro)
            );
            if (
                !contenido ||
                !Array.isArray(contenido.docentes) ||
                !Array.isArray(contenido.periodos) ||
                !Array.isArray(contenido.cobros) ||
                !registrosValidos(contenido.docentes) ||
                !registrosValidos(contenido.periodos) ||
                !registrosValidos(contenido.cobros)
            ) {
                alert('❌ El archivo no es un respaldo válido de este sistema.');
                return;
            }

            if (confirm('¿Estás seguro? Esto reemplazará TODOS los datos actuales con los del respaldo.')) {
                datos = contenido;
                guardarYRefrescar();
                alert('✅ Base de datos restaurada con éxito.');
                location.reload();
            }
        } catch (err) {
            console.error('Error al importar el respaldo:', err);
            alert('❌ Error al leer el archivo. Asegúrate de que sea el .json correcto.');
        } finally {
            input.value = '';
        }
    };
    reader.readAsText(archivo);
}