let datos = JSON.parse(localStorage.getItem('sisCobroDB')) || {
    docentes: [],
    periodos: [], // Cada uno: { id: 1, fecha: "2024-03" }
    cobros: [],
    periodoActivoId: null
};
function guardarYRefrescar() {
    localStorage.setItem('sisCobroDB', JSON.stringify(datos));
    renderDocentes();
    renderPeriodos();
    renderCobros();
    actualizarSelectorNav(); // <-- Añade esta línea
    renderReporteGeneral();

}
function showToast(mensaje, tipo = 'error') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    // Iconos según el tipo
    const icono = tipo === 'error' ? '⚠️' : '✅';
    
    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);

    // Se elimina del DOM después de 3.5 segundos
    setTimeout(() => { toast.remove(); }, 3500);
}
function formatearFecha(f) {
    const [year, month] = f.split('-');
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${meses[parseInt(month)-1]} ${year}`;
}
function migrarBaseDeDatos() {
    let modificado = false;
    datos.cobros.forEach(c => {
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
    
    // Convertimos el objeto de datos a una cadena JSON
    const dataStr = JSON.stringify(datos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', nombreArchivo);
    linkElement.click();
}

function importarBaseDeDatos(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            
            // Validación básica: verificar si tiene las propiedades necesarias
            if (contenido.docentes && contenido.periodos && contenido.cobros) {
                if (confirm("¿Estás seguro? Esto reemplazará TODOS los datos actuales con los del respaldo.")) {
                    datos = contenido;
                    guardarYRefrescar();
                    alert("✅ Base de datos restaurada con éxito.");
                    location.reload(); // Recargamos para asegurar que todo el UI se actualice
                }
            } else {
                alert("❌ El archivo no es un respaldo válido de este sistema.");
            }
        } catch (err) {
            alert("❌ Error al leer el archivo. Asegúrate de que sea el .json correcto.");
        }
    };
    reader.readAsText(archivo);
}