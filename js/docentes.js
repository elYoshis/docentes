let docenteEnEdicion = null;

function renderDocentes() {
    const tbody = document.getElementById('tabla-docentes-body');
    if (!tbody) return;

    const docentesOrdenados = [...datos.docentes].sort((a, b) => {
        const diferenciaPaterno = normalizarTexto(a.paterno).localeCompare(normalizarTexto(b.paterno));
        if (diferenciaPaterno !== 0) return diferenciaPaterno;
        const diferenciaMaterno = normalizarTexto(a.materno).localeCompare(normalizarTexto(b.materno));
        if (diferenciaMaterno !== 0) return diferenciaMaterno;
        return normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre));
    });

    tbody.innerHTML = docentesOrdenados.map((doc, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escaparHTML(normalizarTexto(doc.paterno))}</td>
            <td>${escaparHTML(normalizarTexto(doc.materno || ''))}</td>
            <td>${escaparHTML(normalizarTexto(doc.nombre))}</td>
            <td>
                <button class="btn-primary" style="background-color: #3b82f6; padding: 5px 10px; margin-right: 5px;" onclick="abrirModalHistorial(${Number(doc.id)})">👁️ Historial</button>
                <button onclick="abrirModalEditar(${Number(doc.id)})" class="btn-edit">✏️ Editar</button>
                <button class="btn-delete" onclick="borrarDocente(${Number(doc.id)})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function agregarDocente(event) {
    if (event) event.preventDefault();

    const nom = document.getElementById('docNombre').value.trim();
    const pat = document.getElementById('docPaterno').value.trim();
    const mat = document.getElementById('docMaterno').value.trim();

    if (!nom || !pat) {
        showToast('Nombre y Apellido Paterno son obligatorios', 'error');
        return;
    }

    const nuevoNombreCompleto = normalizarTexto(`${nom} ${pat} ${mat}`);
    const existe = datos.docentes.some((d) => normalizarTexto(`${d.nombre} ${d.paterno} ${d.materno}`) === nuevoNombreCompleto);

    if (existe) {
        showToast(`El docente "${nom} ${pat}" ya está registrado`, 'error');
        document.getElementById('docPaterno').focus();
        return;
    }

    datos.docentes.push({
        id: Date.now(),
        nombre: nom,
        paterno: pat,
        materno: mat
    });

    datos.docentes.sort((a, b) => normalizarTexto(a.paterno).localeCompare(normalizarTexto(b.paterno)) || normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre)));

    guardarYRefrescar();
    showToast('Docente registrado con éxito', 'success');

    document.getElementById('docNombre').value = '';
    document.getElementById('docPaterno').value = '';
    document.getElementById('docMaterno').value = '';
    document.getElementById('docNombre').focus();
}

function obtenerNombreCompleto(doc) {
    if (!doc) return "Docente no encontrado";
    return `${doc.paterno} ${doc.materno} ${doc.nombre}`.toUpperCase();
}

// 1. ABRIR: Carga los datos del docente en los inputs
function abrirModalEditar(id) {
    const docente = datos.docentes.find((d) => d.id === Number(id));
    if (!docente) return;

    document.getElementById('edit-index').value = docente.id;
    document.getElementById('input-nombre').value = docente.nombre.toUpperCase();
    document.getElementById('input-paterno').value = docente.paterno.toUpperCase();
    document.getElementById('input-materno').value = (docente.materno || '').toUpperCase();
    document.getElementById('modal-editar').style.display = 'flex';
}

// 2. CERRAR: Limpia y esconde
function cerrarModalEditar() {
    document.getElementById('modal-editar').style.display = 'none';
}

// 3. GUARDAR: Toma los nuevos datos y actualiza
function guardarEdicion() {
    const docenteId = Number(document.getElementById('edit-index').value);
    const nNom = document.getElementById('input-nombre').value.trim();
    const nPat = document.getElementById('input-paterno').value.trim();
    const nMat = document.getElementById('input-materno').value.trim();

    if (!nNom || !nPat) {
        alert('⚠️ El nombre y el apellido paterno son obligatorios.');
        return;
    }

    const docente = datos.docentes.find((d) => d.id === docenteId);
    if (!docente) return;

    docente.nombre = nNom;
    docente.paterno = nPat;
    docente.materno = nMat;

    guardarYRefrescar();
    if (typeof renderUnified === 'function') renderUnified();
    cerrarModalEditar();
}


function editarDocente(id) {
    const doc = datos.docentes.find(d => Number(d.id) === Number(id));
    if (!doc) return;
    const nPat = prompt("Apellido Paterno:", doc.paterno);
    if (nPat === null) return;
    const nMat = prompt("Apellido Materno:", doc.materno);
    if (nMat === null) return;
    const nNom = prompt("Nombre(s):", doc.nombre);
    if (nNom === null) return;

    if (!nPat.trim() || !nNom.trim()) {
        showToast("Nombre y Apellido Paterno son obligatorios", "error");
        return;
    }

    doc.paterno = nPat.trim();
    doc.materno = nMat.trim();
    doc.nombre = nNom.trim();
    guardarYRefrescar();
}

function borrarDocente(id) {
    if (confirm("¿Eliminar docente? Sus registros de cobro históricos se mantendrán.")) {
        datos.docentes = datos.docentes.filter(d => Number(d.id) !== Number(id));
        guardarYRefrescar();
    }
}

function ordenarDocentes(columna) {
    // Si clicamos en la misma columna, invertimos el sentido
    if (sortDocentesConfig.columna === columna) {
        sortDocentesConfig.asc = !sortDocentesConfig.asc;
    } else {
        // Si es una columna nueva, empezamos de forma ascendente
        sortDocentesConfig.columna = columna;
        sortDocentesConfig.asc = true;
    }

    // Ordenar el array principal
    datos.docentes.sort((a, b) => {
        let valA = (a[columna] || "").toLowerCase();
        let valB = (b[columna] || "").toLowerCase();

        // Quitar tildes para un orden correcto
        valA = valA.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        valB = valB.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (valA < valB) return sortDocentesConfig.asc ? -1 : 1;
        if (valA > valB) return sortDocentesConfig.asc ? 1 : -1;
        return 0;
    });

    // Actualizar iconos visuales
    actualizarIconosSort();
    
    // Volver a dibujar la tabla
    renderDocentes(); 
}

function actualizarIconosSort() {
    // Resetear todos los iconos a la flecha doble
    ['paterno', 'materno', 'nombre'].forEach(col => {
        const span = document.getElementById(`sort-${col}`);
        if (span) span.innerText = "↕";
    });

    // Poner la flecha correcta en la columna activa
    const activo = document.getElementById(`sort-${sortDocentesConfig.columna}`);
    if (activo) {
        activo.innerText = sortDocentesConfig.asc ? "↑" : "↓";
        activo.style.color = "#2563eb"; // Color azul para resaltar
    }
}

function abrirModalHistorial(docenteId) {
    const docente = datos.docentes.find(d => Number(d.id) === Number(docenteId));
    if (!docente) return;

    // 1. Mostrar el nombre del docente
    document.getElementById('historial-nombre').textContent = obtenerNombreCompleto(docente);

    // 2. Filtrar todos los cobros donde aparezca este docente
    const cobrosDocente = datos.cobros.filter(c => Number(c.docenteId) === Number(docenteId));
    
    let totalPagado = 0;
    let totalDeuda = 0;
    const tbody = document.getElementById('historial-tabla-body');
    tbody.innerHTML = "";

    if (cobrosDocente.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align: center; padding: 15px; color: #666;'>Este docente no tiene registros en ningún periodo.</td></tr>";
    } else {
        // 3. Recorrer sus registros y sumar los montos
        cobrosDocente.forEach(c => {
            const periodo = datos.periodos.find(p => Number(p.id) === Number(c.periodoId));
            const categoriaPeriodo = periodo && periodo.categoria === 'medicina' ? 'Medicina' : 'General';
            const nombrePeriodo = periodo
                ? `${formatearFecha(periodo.fecha)} (${categoriaPeriodo})`
                : "Periodo Desconocido";
            
            const atraso = numeroSeguro(c.atraso);
            const actividad = periodo && periodo.categoria === 'medicina'
                ? 0
                : numeroSeguro(c.actividad);
            const totalMes = atraso + actividad;

            if (c.cancelado) {
                totalPagado += totalMes;
            } else {
                totalDeuda += totalMes;
            }

            // 4. Dibujar la fila del historial
            tbody.innerHTML += `
                <tr>
                    <td><b>${escaparHTML(nombrePeriodo)}</b></td>
                    <td style="text-align: right;">Bs. ${atraso.toFixed(2)}</td>
                    <td style="text-align: right;">Bs. ${actividad.toFixed(2)}</td>
                    <td style="text-align: center;">
    ${c.cancelado
        ? '<span class="badge badge-success">✅ Pagado</span>'
        : '<span class="badge badge-warning">⚠️ No pagado</span>'}
</td>
                </tr>`;
        });
    }

    // 5. Actualizar los cuadros de resumen financiero
    document.getElementById('hist-total-multas').textContent = `Bs. ${(totalPagado + totalDeuda).toFixed(2)}`;
    document.getElementById('hist-total-pagado').textContent = `Bs. ${totalPagado.toFixed(2)}`;
    document.getElementById('hist-total-deuda').textContent = `Bs. ${totalDeuda.toFixed(2)}`;

    // 6. Abrir el modal
    document.getElementById('modal-historial').style.display = 'flex';
}

function cerrarModalHistorial() {
    document.getElementById('modal-historial').style.display = 'none';
}