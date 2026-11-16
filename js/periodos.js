function nombreCategoria(cat) {
    return cat === 'medicina' ? '⚕️ Medicina' : '🎓 General';
}

function fechaPeriodoValida(fecha) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(fecha);
}

// Muestra/oculta la meta de actividades según la categoría elegida en el formulario
function alternarCamposPeriodo() {
    const elCategoria = document.getElementById('nuevoPeriodoCategoria');
    const elMetaActividad = document.getElementById('metaActividadInput');
    if (!elCategoria || !elMetaActividad) return;

    const esMedicina = elCategoria.value === 'medicina';
    elMetaActividad.style.display = esMedicina ? 'none' : '';
    if (esMedicina) {
        elMetaActividad.value = '';
    }
}

function renderPeriodos() {
    const tbody = document.getElementById('tabla-periodos-body');
    if (!tbody) return;

    // Orden: primero General, luego Medicina; dentro de cada una, por fecha
    datos.periodos.sort((a, b) => {
        const catA = a.categoria || 'general';
        const catB = b.categoria || 'general';
        if (catA !== catB) return catA === 'general' ? -1 : 1;
        return String(a.fecha || '').localeCompare(String(b.fecha || ''));
    });

    if (datos.periodos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:16px; color:#666;">No hay periodos creados.</td></tr>';
        return;
    }

    tbody.innerHTML = datos.periodos.map((p) => {
        const cat = p.categoria || 'general';
        const esActivo = !!datos.periodoActivo && datos.periodoActivo[cat] === p.id;
        const colorBadge = cat === 'medicina' ? '#fde8e8' : '#e0ecff';
        const metas = cat === 'medicina'
            ? `Meta Atrasos: ${p.metaAtraso || 0}`
            : `Metas: A: ${p.metaAtraso || 0} / Act: ${p.metaActividad || 0}`;

        return `
            <tr style="${esActivo ? 'background:#e8f8f5' : ''}">
                <td>
                    <span style="font-size:0.8rem; padding:2px 8px; border-radius:10px; background:${colorBadge}; color:#1f2937;">${nombreCategoria(cat)}</span>
                    <b>${escaparHTML(formatearFecha(p.fecha))}</b><br>
                    <small>${escaparHTML(metas)}</small>
                </td>
                <td>${esActivo ? '✅ Activo' : '<button onclick="activarPeriodo(' + Number(p.id) + ')">Activar</button>'}</td>
                <td>
                    <button class="btn-edit" onclick="editarPeriodo(${Number(p.id)})">Editar</button>
                    <button class="btn-delete" onclick="borrarPeriodo(${Number(p.id)})">Borrar</button>
                </td>
            </tr>`;
    }).join('');
}

function crearPeriodo() {
    // 1. Capturamos los elementos
    const elFecha = document.getElementById('nuevoPeriodoFecha');
    const elCategoria = document.getElementById('nuevoPeriodoCategoria');
    const elMetaAtraso = document.getElementById('metaAtrasoInput');
    const elMetaActividad = document.getElementById('metaActividadInput');

    // 2. Validamos que existan en el HTML
    if (!elFecha || !elCategoria || !elMetaAtraso || !elMetaActividad) {
        console.error("Error: No se encontraron los IDs en el HTML");
        return;
    }

    const fecha = elFecha.value;
    const categoria = elCategoria.value === 'medicina' ? 'medicina' : 'general';
    const mAtraso = elMetaAtraso.value === '' ? 0 : Number(elMetaAtraso.value);
    const mActividad = categoria === 'medicina' || elMetaActividad.value === ''
        ? 0
        : Number(elMetaActividad.value);

    // 3. Validamos que la fecha no esté vacía
    if (!fechaPeriodoValida(fecha)) {
        alert("Por favor, selecciona un mes y año.");
        return;
    }
    if (!Number.isFinite(mAtraso) || mAtraso < 0 || !Number.isFinite(mActividad) || mActividad < 0) {
        alert("Las metas deben ser números válidos iguales o mayores a cero.");
        return;
    }

    // 4. Evitamos duplicados (misma fecha dentro de la misma categoría)
    if (datos.periodos.some(p => p.fecha === fecha && (p.categoria || 'general') === categoria)) {
        alert(`Este periodo ya existe en ${categoria === 'medicina' ? 'Medicina' : 'General'}.`);
        return;
    }

    // 5. Creamos el objeto y guardamos
    const nuevo = {
        id: Date.now(),
        fecha: fecha,
        categoria: categoria,
        metaAtraso: mAtraso,
        metaActividad: mActividad
    };

    datos.periodos.push(nuevo);

    // Si esa categoría no tenía periodo activo, este lo será
    if (!datos.periodoActivo[categoria]) {
        datos.periodoActivo[categoria] = nuevo.id;
    }
    sincronizarPeriodoActivo();

    guardarYRefrescar();

    // Limpiamos los campos
    elFecha.value = "";
    elMetaAtraso.value = "";
    elMetaActividad.value = "";

    alert(`Periodo de ${categoria === 'medicina' ? 'Medicina' : 'General'} creado con éxito`);
}

function activarPeriodo(id) {
    establecerPeriodoActivo(id);
    guardarYRefrescar();
}

function editarPeriodo(id) {
    const p = datos.periodos.find(per => per.id === id);
    if (!p) return;
    const nuevaFecha = prompt("Editar fecha (formato YYYY-MM):", p.fecha);
    if (nuevaFecha && fechaPeriodoValida(nuevaFecha)) {
        const cat = p.categoria || 'general';
        const duplicado = datos.periodos.some(
            per => per.id !== id && per.fecha === nuevaFecha && (per.categoria || 'general') === cat
        );
        if (duplicado) {
            alert("Ya existe un periodo con esa fecha en esta categoría.");
            return;
        }
        p.fecha = nuevaFecha;
        guardarYRefrescar();
    } else if (nuevaFecha !== null) {
        alert("La fecha debe tener el formato YYYY-MM y corresponder a un mes válido.");
    }
}

function borrarPeriodo(id) {
    const p = datos.periodos.find(per => per.id === id);
    if (!p) return;
    const cat = p.categoria || 'general';

    if (confirm(`¿Borrar el periodo ${formatearFecha(p.fecha)} de ${cat === 'medicina' ? 'Medicina' : 'General'}? Se perderán todos los cobros asociados a este mes.`)) {
        datos.periodos = datos.periodos.filter(per => per.id !== id);
        datos.cobros = datos.cobros.filter(c => c.periodoId !== id);
        if (datos.periodoActivo[cat] === id) datos.periodoActivo[cat] = null;
        sincronizarPeriodoActivo();
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