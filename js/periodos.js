function renderPeriodos() {
    const tbody = document.getElementById('tabla-periodos-body');
    tbody.innerHTML = "";
    // Ordenar periodos por fecha
    datos.periodos.sort((a,b) => a.fecha.localeCompare(b.fecha));
    const periodoAct = datos.periodos.find(p => p.id === datos.periodoActivoId);

    // LÓGICA DE DASHBOARD
    const cobrosMes = datos.cobros.filter(c => c.periodoId === datos.periodoActivoId);
    const recaudadoAtraso = cobrosMes.reduce((acc, c) => acc + c.atraso, 0);
    const recaudadoActividad = cobrosMes.reduce((acc, c) => acc + c.actividad, 0);

    // Actualizar Textos
    document.getElementById('dash-atraso-txt').textContent = `Bs. ${recaudadoAtraso} / ${periodoAct.metaAtraso}`;
    document.getElementById('dash-actividad-txt').textContent = `Bs. ${recaudadoActividad} / ${periodoAct.metaActividad}`;
    

    // Actualizar Barras (Cálculo de porcentaje)
    const porcAtraso = Math.min((recaudadoAtraso / (periodoAct.metaAtraso || 1)) * 100, 100);
    const porcActividad = Math.min((recaudadoActividad / (periodoAct.metaActividad || 1)) * 100, 100);
    
    document.getElementById('bar-atraso').style.width = porcAtraso + '%';
    document.getElementById('bar-actividad').style.width = porcActividad + '%';
    datos.periodos.forEach(p => {
        const esActivo = p.id === datos.periodoActivoId;
        tbody.innerHTML += `
            <tr style="${esActivo ? 'background:#e8f8f5' : ''}">
                
<td>
    <b>${formatearFecha(p.fecha)}</b><br>
    <small>Metas: A: ${p.metaAtraso} / Act: ${p.metaActividad}</small>
</td>
                <td>${esActivo ? '✅ Activo' : '<button onclick="activarPeriodo('+p.id+')">Activar</button>'}</td>
                <td>
                    <button class="btn-edit" onclick="editarPeriodo(${p.id})">Editar</button>
                    <button class="btn-delete" onclick="borrarPeriodo(${p.id})">Borrar</button>
                </td>
            </tr>`;
    });
}
function crearPeriodo() {
    // 1. Capturamos los elementos
    const elFecha = document.getElementById('nuevoPeriodoFecha');
    const elMetaAtraso = document.getElementById('metaAtrasoInput');
    const elMetaActividad = document.getElementById('metaActividadInput');

    // 2. Validamos que existan en el HTML
    if (!elFecha || !elMetaAtraso || !elMetaActividad) {
        console.error("Error: No se encontraron los IDs en el HTML");
        return;
    }

    const fecha = elFecha.value;
    const mAtraso = parseFloat(elMetaAtraso.value) || 0;
    const mActividad = parseFloat(elMetaActividad.value) || 0;

    // 3. Validamos que la fecha no esté vacía
    if (!fecha) {
        alert("Por favor, selecciona un mes y año.");
        return;
    }

    // 4. Evitamos duplicados
    if (datos.periodos.some(p => p.fecha === fecha)) {
        alert("Este periodo ya existe.");
        return;
    }

    // 5. Creamos el objeto y guardamos
    const nuevo = { 
        id: Date.now(), 
        fecha: fecha, 
        metaAtraso: mAtraso, 
        metaActividad: mActividad 
    };

    datos.periodos.push(nuevo);
    
    // Si no había periodo activo, este lo será
    if (!datos.periodoActivoId) {
        datos.periodoActivoId = nuevo.id;
    }

    guardarYRefrescar();
    
    // Limpiamos los campos
    elFecha.value = "";
    elMetaAtraso.value = "";
    elMetaActividad.value = "";
    
    alert("Periodo creado con éxito");
}

function activarPeriodo(id) {
    datos.periodoActivoId = id;
    guardarYRefrescar();
}

function editarPeriodo(id) {
    const p = datos.periodos.find(per => per.id === id);
    const nuevaFecha = prompt("Editar fecha (formato YYYY-MM):", p.fecha);
    if (nuevaFecha && nuevaFecha.length === 7) {
        p.fecha = nuevaFecha;
        guardarYRefrescar();
    }
}

function borrarPeriodo(id) {
    if (confirm("¿Borrar periodo? Se perderán todos los cobros asociados a este mes.")) {
        datos.periodos = datos.periodos.filter(p => p.id !== id);
        datos.cobros = datos.cobros.filter(c => c.periodoId !== id);
        if (datos.periodoActivoId === id) datos.periodoActivoId = null;
        guardarYRefrescar();
    }
}
function guardarNotaGeneral() {
    if (!datos.periodoActivoId) return;
    
    const periodo = datos.periodos.find(p => p.id === datos.periodoActivoId);
    
    if (periodo && window.editorQuill) {
        // Extraemos el texto con todos los colores y formatos de Quill
        periodo.notaGeneral = window.editorQuill.root.innerHTML;
        
        // Guardamos en localStorage silenciosamente
        localStorage.setItem('sisCobroDB', JSON.stringify(datos));
        
        if (typeof showToast === "function") {
            showToast("Nota general guardada con éxito", "success");
        } else {
            alert("Nota general guardada");
        }
    }
}